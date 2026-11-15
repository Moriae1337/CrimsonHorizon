"""Bundle the Hawksbill Gap scenario document served by the API (CH26-042).

Reads the committed inputs and writes data/hawksbill_gap/scenario.json in the
v1 shape defined in specs/scenario-api.md:

- manifest.json: conventions, extent, and the cited sources;
- routes.geojson (prep.routes): route options and their pieces;
- inputs/rover_traverse.geojson: historical drives, one feature per sol;
- inputs/rover_waypoints.geojson: the start localization;
- route_metrics.json (prep.profiles): elevation profiles, ascent, grade, and
  DTM coverage gaps along each option.

Profiles are filled since v1.1. Since v1.2 (#46) `unknowns` holds every caution
zone (prep.caution): DTM coverage gaps, A's proposed connector, observation
approaches, and the steepest 2 m and 5 m segments, each with a review status.
`obstacles` holds the mission-report obstacles with their PDS figure, and each
route option carries `caution_review`. Only `evidence` stays pending. build()
is pure, so tests can rebuild the document and compare it with the committed
file.
"""

import json
from typing import Any

from prep import caution
from prep.common import INPUTS_DIR, SCENARIO_DIR, load_manifest, utc_now
from prep.profiles import METRICS_PATH
from prep.routes import ROUTES_PATH, START_RMC

SCENARIO_PATH = SCENARIO_DIR / "scenario.json"
SCHEMA_VERSION = "1.2"

TRAVERSE_SOURCE = "m20-traverse"
WAYPOINTS_SOURCE = "m20-waypoints"
SAMPLES_SOURCE = "pds-initial-reports"
DTM_SOURCE = "dtm-primary"

# Science stops. Pins sit at the first sample coordinate of each stop, in
# [lon, lat] order, with sols and nearest localizations from the stop specs:
# specs/hawksbill-gap/skinner-ridge.md (Swift Run, PDS Initial Reports section 11)
# and specs/hawksbill-gap/wildcat-ridge.md (Hazeltop, section 14).
STOPS: list[dict[str, Any]] = [
    {
        "id": "skinner-ridge",
        "name": "Skinner Ridge",
        "kind": "sample-location",
        "coordinates": [77.40617078, 18.458931],
        "nearest_rmc": "26_1004",
        "samples": [
            {"name": "Swift Run", "sol": 490},
            {"name": "Skyland", "sol": 495},
        ],
        "summary": "Lower Rockytop sandstone block; is it in place or float?",
        "source_ids": [SAMPLES_SOURCE],
    },
    {
        "id": "wildcat-ridge",
        "name": "Wildcat Ridge",
        "kind": "sample-location",
        "coordinates": [77.40588851, 18.45863707],
        "nearest_rmc": "26_1222",
        "samples": [
            {"name": "Hazeltop", "sol": 509},
            {"name": "Bearwallow", "sol": 516},
        ],
        "summary": "Fine-grained, sulfate-bearing rock with calcium-sulfate veins "
        "(Hogwallow Flats).",
        "source_ids": [SAMPLES_SOURCE],
    },
]

ROUTE_OPTIONS: dict[str, dict[str, Any]] = {
    "A": {
        "label": "Option A: Wildcat Ridge via a proposed connector",
        "stop_ids": ["wildcat-ridge"],
    },
    "B": {
        "label": "Option B: Skinner Ridge, then Wildcat Ridge",
        "stop_ids": ["skinner-ridge", "wildcat-ridge"],
    },
}

PENDING_SECTIONS = ["evidence"]

Point = list[float]


def round_point(point: Point) -> Point:
    """Keep 8 decimals for lon/lat (about 0.6 mm) and 3 for elevation (mm)."""
    out = [round(point[0], 8), round(point[1], 8)]
    if len(point) > 2:
        out.append(round(point[2], 3))
    return out


def line(coords: list[Point]) -> dict[str, Any]:
    return {"type": "LineString", "coordinates": [round_point(c) for c in coords]}


def conventions(manifest: dict[str, Any]) -> dict[str, Any]:
    geo = manifest["conventions"]["geographic"]
    return {
        "body": geo["body"],
        "latitude": geo["latitude_type"],
        "longitude": geo["longitude_direction"],
        "sphere_radius_m": geo["reference_sphere_radius_m"],
        "coordinate_order": ["lon", "lat", "elev_m"],
        "vertical_reference": "Rover localization elevation relative to the Mars "
        "geoid (elev_geoid).",
    }


def extent(manifest: dict[str, Any]) -> dict[str, float]:
    box = manifest["extent"]
    return {key: box[key] for key in ("lon_min", "lon_max", "lat_min", "lat_max")}


def sources(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "id": item["id"],
            "title": item["title"],
            "url": item["url"],
            "credit": item["credit"],
            "license": item["license"],
            "doi": item.get("doi"),
        }
        for item in manifest["inputs"]
    ]


def start(waypoints: list[dict[str, Any]]) -> dict[str, Any]:
    for feature in waypoints:
        if feature["properties"]["RMC"] == START_RMC:
            return {
                "id": "start",
                "rmc": START_RMC,
                "label": "Start",
                "coordinates": round_point(feature["geometry"]["coordinates"][:2]),
                "source_ids": [WAYPOINTS_SOURCE],
            }
    raise KeyError(f"waypoints have no localization {START_RMC!r}")


def option_stops() -> dict[str, list[str]]:
    return {option: info["stop_ids"] for option, info in ROUTE_OPTIONS.items()}


def route_options(
    routes: dict[str, Any],
    metrics: dict[str, Any],
    zones: list[dict[str, Any]] | None = None,
    obstacles: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    zones = unknowns(routes, metrics) if zones is None else zones
    obstacles = caution.obstacles(option_stops()) if obstacles is None else obstacles
    return [
        {
            "id": option,
            **ROUTE_OPTIONS[option],
            "outbound_m": info["outbound_m"],
            "round_trip_m": info["round_trip_m"],
            "proposed_m": info["proposed_m"],
            "ascent_m": metrics["options"][option]["ascent_m"],
            "max_grade_deg": metrics["options"][option]["max_grade_deg"],
            "dtm_covered_pct": metrics["options"][option]["coverage"]["covered_pct"],
            "grade_class_m": {
                step: item["grade_class_m"]
                for step, item in metrics["options"][option]["caution"]["steps"].items()
            },
            "caution_review": caution.review(zones, obstacles, option),
        }
        for option, info in routes["options"].items()
    ]


def profiles(metrics: dict[str, Any]) -> list[dict[str, Any]]:
    """One round-trip elevation series per option; null elevations are gaps."""
    return [
        {
            "id": f"profile-{option.lower()}",
            "option": option,
            "step_m": info["profile"]["step_m"],
            "spacing_m": info["profile"]["spacing_m"],
            "outbound_m": info["outbound_m"],
            "distance_m": info["profile"]["distance_m"],
            "elevation_m": info["profile"]["elevation_m"],
            "source_ids": [DTM_SOURCE],
        }
        for option, info in metrics["options"].items()
    ]


def unknowns(routes: dict[str, Any], metrics: dict[str, Any]) -> list[dict[str, Any]]:
    """Caution zones on both options, each with an open review status."""
    return caution.caution_zones(routes, metrics, STOPS, option_stops())


def route_features(routes: dict[str, Any]) -> dict[str, Any]:
    features = []
    counts: dict[tuple[str, str], int] = {}
    for feature in routes["features"]:
        props = feature["properties"]
        key = (props["option"], props["leg"])
        counts[key] = order = counts.get(key, 0) + 1
        proposed = bool(props.get("proposed", False))
        features.append(
            {
                "type": "Feature",
                "id": f"{props['option'].lower()}-{props['leg']}-{order}",
                "geometry": line(feature["geometry"]["coordinates"]),
                "properties": {
                    "option": props["option"],
                    "leg": props["leg"],
                    "order": order,
                    "kind": props["kind"],
                    "proposed": proposed,
                    "length_m": props["length_m"],
                    "sols": list(props.get("sols", [])),
                    "note": props.get("note"),
                    # Connectors are proposed geometry derived from the drives.
                    "source_ids": [TRAVERSE_SOURCE],
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}


def rover_track(traverse: list[dict[str, Any]]) -> dict[str, Any]:
    features = []
    for feature in sorted(traverse, key=lambda f: f["properties"]["sol"]):
        props = feature["properties"]
        features.append(
            {
                "type": "Feature",
                "id": f"drive-sol-{props['sol']}",
                "geometry": line(feature["geometry"]["coordinates"]),
                "properties": {
                    "sol": props["sol"],
                    "from_rmc": props["fromRMC"],
                    "to_rmc": props["toRMC"],
                    "length_m": props["length"],
                    "source_ids": [TRAVERSE_SOURCE],
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}


def build(
    manifest: dict[str, Any],
    routes: dict[str, Any],
    traverse: list[dict[str, Any]],
    waypoints: list[dict[str, Any]],
    metrics: dict[str, Any],
    generated_at: str,
) -> dict[str, Any]:
    zones = unknowns(routes, metrics)
    obstacles = caution.obstacles(option_stops())
    return {
        "schema_version": SCHEMA_VERSION,
        "scenario_id": manifest["scenario_id"],
        "title": "Hawksbill Gap",
        "generated_at": generated_at,
        "conventions": conventions(manifest),
        "extent": extent(manifest),
        "start": start(waypoints),
        "stops": STOPS,
        "route_options": route_options(routes, metrics, zones, obstacles),
        "routes": route_features(routes),
        "rover_track": rover_track(traverse),
        "evidence": [],
        "profiles": profiles(metrics),
        "unknowns": zones,
        "obstacles": obstacles,
        "pending_sections": PENDING_SECTIONS,
        "sources": sources(manifest),
    }


def load_inputs() -> tuple[dict, dict, list, list, dict]:
    def read(path):
        return json.loads(path.read_text(encoding="utf-8"))

    return (
        load_manifest(),
        read(ROUTES_PATH),
        read(INPUTS_DIR / "rover_traverse.geojson")["features"],
        read(INPUTS_DIR / "rover_waypoints.geojson")["features"],
        read(METRICS_PATH),
    )


def main() -> None:
    scenario = build(*load_inputs(), generated_at=utc_now())
    text = json.dumps(scenario, separators=(",", ":"), allow_nan=False)
    SCENARIO_PATH.write_text(text + "\n", encoding="utf-8", newline="\n")
    print(
        f"{SCENARIO_PATH.name}: {len(scenario['routes']['features'])} route pieces, "
        f"{len(scenario['rover_track']['features'])} drives, "
        f"{len(scenario['profiles'])} profiles, "
        f"{len(scenario['unknowns'])} caution zones, "
        f"{len(scenario['obstacles'])} obstacles, "
        f"{SCENARIO_PATH.stat().st_size} bytes"
    )


if __name__ == "__main__":
    main()
