"""Caution zones and obstacles on both route options (CH26-028, #46).

Pure functions: scenario_bundle passes in the committed routes, route metrics
(prep.profiles) and stops, and gets back the caution-zone items for the
scenario `unknowns` list, a review summary per option, and the obstacles.

Caution zones (each an outbound span [from_m, to_m] with a [lon, lat] line; the
return retraces it). Every zone starts with review_status "open". The scope
clears an option only when every caution zone on it has been reviewed.

- terrain-gap: spans without valid DTM elevation (prep.profiles coverage).
- connector: A's proposed connector, never driven by the rover. Its uncertainty
  is the terrain-model disagreement: about 7 deg on the primary DTM against
  about 22 deg on the fallback DTM at up to 2 m sampling (scope, "Model
  sensitivity"). The primary value is recomputed here; the fallback DTM is not
  prepared in this pipeline, so its value is reported, not computed.
- observation-approach: the last APPROACH_M meters of outbound path before the
  point closest to each stop pin. On A, Skinner Ridge is a stand-off view; its
  contact-visibility uncertainty is the scope's rough line-of-sight check
  ("Visibility"); the DTM check is #48.
- steep-segment: the steepest along-route interval at the 2 m and 5 m windows.
  Grades come with a display class only. There is no cited grade threshold for
  walking in a loaded spacesuit, so nothing is labelled safe.

Obstacles come from the mission report (PDS Initial Reports, section 11,
fig. 5): Betty's Rock beside the Skinner Ridge block, and the crack and overhang
on the block's eastern side. The report gives no coordinates for either, so
they are anchored to the Skinner Ridge stop with coordinates null.
"""

import itertools
import math
from typing import Any

from prep.profiles import cumulative_m, cut_line, outbound_line

# Length of the observation approach before the closest point to a stop: two
# nominal 5 m profile steps. A display convention, not a safety limit.
APPROACH_M = 10.0
REVIEW_OPEN = "open"
STATUSES = ("open", "reviewed")

DTM_SOURCE = "dtm-primary"
FALLBACK_SOURCE = "dtm-fallback"
TRAVERSE_SOURCE = "m20-traverse"
SAMPLES_SOURCE = "pds-initial-reports"
PDS_URL = (
    "https://pds-geosciences.wustl.edu/missions/mars2020/"
    "Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf"
)

GRADE_NOTE = (
    "Grade class only. No cited grade threshold for walking in a loaded "
    "spacesuit exists yet, so no class is marked safe."
)

CONNECTOR_FALLBACK_REPORTED_DEG = 22.0
CONNECTOR_UNCERTAINTY = (
    "Proposed straight connector, not driven by the rover. The terrain models "
    "disagree at up to 2 m sampling: about 7 deg on the primary DTM against "
    "about 22 deg on the fallback (project scope, model sensitivity). Review it "
    "against ground imagery."
)
CONTACT_VISIBILITY = (
    "Stand-off view of Skinner Ridge. A rough check over about 22 m from an "
    "illustrative 1.5 m eye height gave 0.15 m of obstruction for a ground-level "
    "target, so the block's contact is probably not visible from option A. The "
    "DTM line-of-sight check is #48; the field question is expected to be deferred."
)

OBSTACLES: list[dict[str, Any]] = [
    {
        "id": "bettys-rock",
        "name": "Betty's Rock",
        "kind": "boulder",
        "stop_id": "skinner-ridge",
        "description": "Large float block beside the Skinner Ridge block, described "
        "in the mission report.",
        "position": "Beside the Skinner Ridge block; the report gives no coordinates.",
    },
    {
        "id": "skinner-ridge-east-crack-overhang",
        "name": "Crack and overhang, Skinner Ridge east side",
        "kind": "crack-overhang",
        "stop_id": "skinner-ridge",
        "description": "Crack and overhang on the eastern side of the Skinner Ridge "
        "block, described in the mission report.",
        "position": "Eastern side of the Skinner Ridge block; the report gives no "
        "coordinates.",
    },
]
OBSTACLE_FIGURE = {
    "source_id": SAMPLES_SOURCE,
    "section": "11",
    "figure": "5",
    "label": "PDS Initial Reports, section 11 (Swift Run), fig. 5",
    "url": PDS_URL,
}

Point = list[float]


def closest_point(
    coords: list[Point], target: Point, radius_m: float
) -> tuple[float, float]:
    """Distance along the path to the point closest to target, and the offset.

    Uses a local equirectangular plane centered on the target (the scene spans
    about 300 m, so the planar error is far below a millimeter); the along-path
    distance uses the same per-segment fraction as prep.profiles.locate.
    """
    lon0, lat0 = math.radians(target[0]), math.radians(target[1])

    def xy(p: Point) -> tuple[float, float]:
        return (
            radius_m * math.cos(lat0) * (math.radians(p[0]) - lon0),
            radius_m * (math.radians(p[1]) - lat0),
        )

    cumulative = cumulative_m(coords, radius_m)
    best = (math.inf, 0.0)
    for i, (a, b) in enumerate(itertools.pairwise(coords)):
        (ax, ay), (bx, by) = xy(a), xy(b)
        dx, dy = bx - ax, by - ay
        den = dx * dx + dy * dy
        t = 0.0 if den == 0 else min(1.0, max(0.0, -(ax * dx + ay * dy) / den))
        offset = math.hypot(ax + t * dx, ay + t * dy)
        if offset < best[0]:
            seg = cumulative[i + 1] - cumulative[i]
            best = (offset, cumulative[i] + t * seg)
    return best[1], best[0]


def span_geometry(
    coords: list[Point], radius_m: float, start: float, end: float
) -> dict[str, Any]:
    cumulative = cumulative_m(coords, radius_m)
    points = cut_line(coords, cumulative, start, end)
    return {
        "type": "LineString",
        "coordinates": [[round(v, 8) for v in p[:2]] for p in points],
    }


def zone(
    option: str,
    kind: str,
    n: int | str,
    span: tuple[float, float],
    geometry: dict[str, Any],
    summary: str,
    source_ids: list[str],
    **extra: Any,
) -> dict[str, Any]:
    start, end = span
    return {
        "id": f"{kind}-{option.lower()}-{n}",
        "option": option,
        "kind": kind,
        "geometry": geometry,
        "from_m": round(start, 2),
        "to_m": round(end, 2),
        "length_m": round(end - start, 2),
        "review_status": REVIEW_OPEN,
        "summary": summary,
        **extra,
        "source_ids": source_ids,
    }


def terrain_gaps(option: str, info: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        zone(
            option,
            "terrain-gap",
            n,
            (gap["from_m"], gap["to_m"]),
            gap["geometry"],
            "No valid DTM elevation on this span; grade and ascent are unknown.",
            [DTM_SOURCE],
        )
        for n, gap in enumerate(info["gaps"], start=1)
    ]


def connectors(
    option: str, info: dict[str, Any], coords: list[Point], radius_m: float
) -> list[dict[str, Any]]:
    return [
        zone(
            option,
            "connector",
            n,
            (span["from_m"], span["to_m"]),
            span_geometry(coords, radius_m, span["from_m"], span["to_m"]),
            CONNECTOR_UNCERTAINTY,
            [TRAVERSE_SOURCE, DTM_SOURCE, FALLBACK_SOURCE],
            uncertainty={
                "kind": "terrain-model-disagreement",
                "step_m": span["step_m"],
                "max_grade_deg": {
                    DTM_SOURCE: span["max_grade_deg"],
                    FALLBACK_SOURCE: CONNECTOR_FALLBACK_REPORTED_DEG,
                },
                "computed": [DTM_SOURCE],
                "reported": [FALLBACK_SOURCE],
            },
        )
        for n, span in enumerate(info["caution"]["proposed"], start=1)
    ]


def approaches(
    option: str,
    stop_ids: list[str],
    stops: list[dict[str, Any]],
    coords: list[Point],
    radius_m: float,
) -> list[dict[str, Any]]:
    out = []
    for stop in stops:
        along, offset = closest_point(coords, stop["coordinates"], radius_m)
        start = max(0.0, along - APPROACH_M)
        if along - start < 1e-6:
            continue
        stand_off = stop["id"] not in stop_ids
        extra: dict[str, Any] = {
            "stop_id": stop["id"],
            "approach": "stand-off" if stand_off else "visit",
            "closest_offset_m": round(offset, 2),
        }
        if stand_off:
            summary = CONTACT_VISIBILITY
            extra["uncertainty"] = {"kind": "contact-visibility", "follow_up": "#48"}
            sources = [DTM_SOURCE, SAMPLES_SOURCE]
        else:
            summary = (
                f"Final {APPROACH_M:g} m before the closest point to the "
                f"{stop['name']} sample pin; observation position and footing "
                "need field review."
            )
            sources = [TRAVERSE_SOURCE, SAMPLES_SOURCE]
        out.append(
            zone(
                option,
                "observation-approach",
                stop["id"],
                (start, along),
                span_geometry(coords, radius_m, start, along),
                summary,
                sources,
                **extra,
            )
        )
    return out


def steep_segments(option: str, info: dict[str, Any]) -> list[dict[str, Any]]:
    out = []
    for step, item in info["caution"]["steps"].items():
        top = item["steepest"]
        if top is None:
            continue
        out.append(
            zone(
                option,
                "steep-segment",
                f"{step}m",
                (top["from_m"], top["to_m"]),
                top["geometry"],
                f"Steepest along-route interval at the {step} m window: "
                f"{top['grade_deg']:g} deg. {GRADE_NOTE}",
                [DTM_SOURCE],
                step_m=float(step),
                grade_deg=top["grade_deg"],
                grade_class=top["grade_class"],
            )
        )
    return out


def caution_zones(
    routes: dict[str, Any],
    metrics: dict[str, Any],
    stops: list[dict[str, Any]],
    option_stops: dict[str, list[str]],
) -> list[dict[str, Any]]:
    """All caution zones, option by option, in outbound order within a kind."""
    radius_m = metrics["sphere_radius_m"]
    items = []
    for option, info in metrics["options"].items():
        coords = outbound_line(routes, option)
        items += terrain_gaps(option, info)
        items += connectors(option, info, coords, radius_m)
        items += approaches(option, option_stops[option], stops, coords, radius_m)
        items += steep_segments(option, info)
    return items


def obstacles(option_stops: dict[str, list[str]]) -> list[dict[str, Any]]:
    """Mission-report obstacles; option_ids lists options that pass the stop.

    Option A passes Skinner Ridge at its stand-off view, so both options list
    the Skinner Ridge obstacles.
    """
    return [
        {
            **item,
            "coordinates": None,
            "option_ids": sorted(option_stops),
            "review_status": REVIEW_OPEN,
            "figure": OBSTACLE_FIGURE,
            "source_ids": [SAMPLES_SOURCE],
        }
        for item in OBSTACLES
    ]


def review(
    zones: list[dict[str, Any]], obstacle_items: list[dict[str, Any]], option: str
) -> dict[str, Any]:
    """Caution review status of one option; cleared only when nothing is open."""
    mine = [z for z in zones if z["option"] == option]
    hazards = [o for o in obstacle_items if option in o["option_ids"]]
    open_zones = [z["id"] for z in mine if z["review_status"] == REVIEW_OPEN]
    open_obstacles = [o["id"] for o in hazards if o["review_status"] == REVIEW_OPEN]
    return {
        "zones": len(mine),
        "obstacles": len(hazards),
        "open_zone_ids": open_zones,
        "open_obstacle_ids": open_obstacles,
        "cleared": not open_zones and not open_obstacles,
        "safety_verdict": None,
    }
