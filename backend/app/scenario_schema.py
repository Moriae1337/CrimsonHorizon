"""Pydantic model of the scenario contract v1 (specs/scenario-api.md).

Used when the app loads a prepared scenario so that a broken bundle becomes a
controlled 503 instead of a partial or misleading response. Every model allows
extra fields: adding an optional field is a MINOR change and must not break
validation (clients ignore fields they do not know).
"""

from collections import Counter
from typing import Annotated, Any, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    ValidationError,
    model_validator,
)

SUPPORTED_MAJOR = "1"


def _check_position(value: list[float]) -> list[float]:
    lon, lat = value[0], value[1]
    if not -180 <= lon <= 180:
        raise ValueError(f"longitude {lon} outside -180..180 (order is [lon, lat])")
    if not -90 <= lat <= 90:
        raise ValueError(f"latitude {lat} outside -90..90 (order is [lon, lat])")
    return value


Finite = Annotated[float, Field(allow_inf_nan=False)]
NonNegative = Annotated[float, Field(ge=0, allow_inf_nan=False)]
Position = Annotated[
    list[Finite], Field(min_length=2, max_length=3), AfterValidator(_check_position)
]
SourceIds = Annotated[list[str], Field(min_length=1)]
NonEmpty = Annotated[str, Field(min_length=1)]


class Model(BaseModel):
    model_config = ConfigDict(extra="allow")


class Cited(Model):
    source_ids: SourceIds


class Conventions(Model):
    body: Literal["Mars"]
    coordinate_order: list[str]

    @model_validator(mode="after")
    def _lon_lat(self) -> "Conventions":
        if self.coordinate_order != ["lon", "lat", "elev_m"]:
            raise ValueError("coordinate_order must be ['lon', 'lat', 'elev_m']")
        return self


class Extent(Model):
    lon_min: Finite
    lon_max: Finite
    lat_min: Finite
    lat_max: Finite

    @model_validator(mode="after")
    def _ordered(self) -> "Extent":
        if not (self.lon_min < self.lon_max and self.lat_min < self.lat_max):
            raise ValueError("extent minimums must be below maximums")
        return self


class Start(Cited):
    id: NonEmpty
    coordinates: Position


class Stop(Cited):
    id: NonEmpty
    name: NonEmpty
    coordinates: Position


class RouteOption(Model):
    id: NonEmpty
    stop_ids: Annotated[list[str], Field(min_length=1)]
    outbound_m: NonNegative
    round_trip_m: NonNegative
    proposed_m: NonNegative
    # Terrain metrics (v1.1); null when no valid DTM sample pair exists.
    ascent_m: NonNegative | None = None
    max_grade_deg: dict[str, NonNegative | None] | None = None
    dtm_covered_pct: Annotated[float, Field(ge=0, le=100)] | None = None


class LineString(Model):
    type: Literal["LineString"]
    coordinates: Annotated[list[Position], Field(min_length=2)]


class LineFeature(Model):
    type: Literal["Feature"]
    id: NonEmpty
    geometry: LineString
    properties: Cited


class RouteProperties(Cited):
    option: NonEmpty
    leg: Literal["outbound", "return"]
    kind: Literal["historical", "connector"]
    proposed: bool
    length_m: NonNegative


class RouteFeature(LineFeature):
    properties: RouteProperties


class TrackProperties(Cited):
    sol: Annotated[int, Field(ge=0)]
    length_m: NonNegative


class TrackFeature(LineFeature):
    properties: TrackProperties


class RouteCollection(Model):
    type: Literal["FeatureCollection"]
    features: list[RouteFeature]


class TrackCollection(Model):
    type: Literal["FeatureCollection"]
    features: list[TrackFeature]


class Profile(Cited):
    id: NonEmpty
    option: NonEmpty
    step_m: Annotated[float, Field(gt=0)]
    spacing_m: Annotated[float, Field(gt=0)]
    outbound_m: NonNegative
    distance_m: list[NonNegative]
    elevation_m: list[Finite | None]

    @model_validator(mode="after")
    def _series(self) -> "Profile":
        if len(self.distance_m) != len(self.elevation_m):
            raise ValueError(
                f"distance_m has {len(self.distance_m)} values but "
                f"elevation_m has {len(self.elevation_m)}"
            )
        if any(b < a for a, b in zip(self.distance_m, self.distance_m[1:])):
            raise ValueError("distance_m must not decrease")
        if self.spacing_m > self.step_m + 1e-9:
            raise ValueError("spacing_m must not exceed step_m")
        return self


class Unknown(Cited):
    """Kinds beyond terrain-gap (caution zones, ...) arrive in later MINORs."""

    id: NonEmpty
    kind: NonEmpty


class Evidence(Cited):
    pass


class Source(Model):
    id: NonEmpty
    title: NonEmpty
    url: Annotated[str, Field(pattern=r"^https://")]
    credit: NonEmpty
    license: NonEmpty
    doi: str | None


class Scenario(Model):
    schema_version: Annotated[str, Field(pattern=r"^1\.\d+$")]
    scenario_id: NonEmpty
    title: NonEmpty
    generated_at: NonEmpty
    conventions: Conventions
    extent: Extent
    start: Start
    stops: list[Stop]
    route_options: Annotated[list[RouteOption], Field(min_length=1)]
    routes: RouteCollection
    rover_track: TrackCollection
    evidence: list[Evidence]
    profiles: list[Profile]
    unknowns: list[Unknown]
    pending_sections: list[str]
    sources: Annotated[list[Source], Field(min_length=1)]

    @model_validator(mode="after")
    def _cross_references(self) -> "Scenario":
        problems: list[str] = []

        def unique(label: str, ids: list[str]) -> None:
            duplicates = sorted(k for k, n in Counter(ids).items() if n > 1)
            if duplicates:
                problems.append(f"duplicate {label} ids: {duplicates}")

        source_ids = [s.id for s in self.sources]
        unique("source", source_ids)
        unique("route option", [o.id for o in self.route_options])
        unique("profile", [p.id for p in self.profiles])
        unique("unknown", [u.id for u in self.unknowns])
        unique(
            "place and feature",
            [self.start.id]
            + [s.id for s in self.stops]
            + [f.id for f in self.routes.features]
            + [f.id for f in self.rover_track.features],
        )

        known_sources = set(source_ids)
        cited: list[tuple[str, Cited]] = [("start", self.start)]
        cited += [(f"stop {s.id}", s) for s in self.stops]
        cited += [(f"route {f.id}", f.properties) for f in self.routes.features]
        cited += [(f"track {f.id}", f.properties) for f in self.rover_track.features]
        cited += [(f"profile {p.id}", p) for p in self.profiles]
        cited += [(f"unknown {u.id}", u) for u in self.unknowns]
        cited += [(f"evidence[{i}]", e) for i, e in enumerate(self.evidence)]
        for label, item in cited:
            missing = sorted(set(item.source_ids) - known_sources)
            if missing:
                problems.append(f"{label} cites unknown sources {missing}")

        stop_ids = {s.id for s in self.stops}
        option_ids = {o.id for o in self.route_options}
        for option in self.route_options:
            missing = sorted(set(option.stop_ids) - stop_ids)
            if missing:
                problems.append(f"route option {option.id} has unknown stops {missing}")
        for feature in self.routes.features:
            if feature.properties.option not in option_ids:
                problems.append(f"route {feature.id} has unknown option")
        for profile in self.profiles:
            if profile.option not in option_ids:
                problems.append(f"profile {profile.id} has unknown option")

        for name in self.pending_sections:
            if not isinstance(getattr(self, name, None), list):
                problems.append(f"pending section {name!r} is not a list field")

        if problems:
            raise ValueError("; ".join(problems))
        return self


class ScenarioValidationError(ValueError):
    """The prepared scenario does not satisfy the v1 contract."""


def validate_scenario(document: Any, *, expected_id: str, name: str) -> None:
    """Raise ScenarioValidationError with a readable reason if invalid."""
    if not isinstance(document, dict):
        raise ScenarioValidationError(f"{name}: top level must be a JSON object")
    version = str(document.get("schema_version", ""))
    if version.split(".")[0] != SUPPORTED_MAJOR:
        raise ScenarioValidationError(f"{name}: unsupported schema_version {version!r}")
    try:
        scenario = Scenario.model_validate(document)
    except ValidationError as error:
        details = "; ".join(
            f"{'.'.join(str(p) for p in e['loc']) or '<root>'}: {e['msg']}"
            for e in error.errors(include_url=False)
        )
        raise ScenarioValidationError(
            f"{name}: invalid scenario ({error.error_count()} errors): {details}"
        ) from None
    if scenario.scenario_id != expected_id:
        raise ScenarioValidationError(
            f"{name}: scenario_id {scenario.scenario_id!r} != {expected_id!r}"
        )


__all__ = ["Scenario", "ScenarioValidationError", "validate_scenario"]
