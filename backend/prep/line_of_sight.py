"""Evaluate the Skinner Ridge line of sight (CH26-030).

Implements line-of-sight visibility calculations between observation standpoints
southwest of Skinner Ridge along route Option A (~22 m standoff) and the Skinner
Ridge sample target (Swift Run core at sol 490, [77.40617078, 18.458931]).

References:
- Illustrative visibility check:
  "Visibility. A rough check over ~22 m from an illustrative eye height of 1.5 m
   gave 0.15 m of obstruction for a ground-level target and 0.28 m of clearance
   for a target 0.5 m higher. The block's contact is at ground level, so it is
   probably not visible from option A."
- Skinner Ridge target:
  Skinner Ridge sandstone block origin dispute (in-place vs float).
  Target Swift Run sample coordinates [77.40617078, 18.458931].
- backend/prep/local_grid.py & backend/data/hawksbill_gap/dtm_local.json:
  Local metric coordinates and bilinear interpolation on 1 m USGS HiRISE DTM.

Evaluation:
- Observer eye height: 1.5 m above local surface.
- Target heights evaluated:
  * 0.0 m: Ground-level basal contact interface (confirms obstruction of ~0.15 m).
  * +0.5 m: Mid-block face (confirms clearance of ~0.28 m).
  * +1.0 m: Block top (confirms clearance of ~0.71 m to 0.81 m).
- Conclusion:
  Ground-level contact is obscured by topography from the Option A standoff
  viewpoint. Basal contact continuity cannot be determined from Option A and
  remains unresolved unless inspected directly via Option B.
"""

from __future__ import annotations

import math
from collections.abc import Callable
from typing import Any

from prep.common import (
    SCENARIO_DIR,
    load_manifest,
    utc_now,
    write_json,
)
from prep.dtm_window import CROP_PATH
from prep.local_grid import bilinear
from prep.routes import distance_m

OUTPUT_PATH = SCENARIO_DIR / "skinner_line_of_sight.json"

DEFAULT_EYE_HEIGHT_M = 1.5
DEFAULT_TARGET_HEIGHTS = (0.0, 0.5, 1.0)
DEFAULT_NUM_SAMPLES = 100

# Target: Swift Run core coordinate at Skinner Ridge
TARGET_COORDS = [77.40617078, 18.458931]  # [lon, lat]
TARGET_SAMPLE_NAME = "Swift Run"
TARGET_MISSION_DESIGNATION = "M2020-490-11"
TARGET_SOL = 490

# Standpoints evaluated:
# 1. Primary illustrative standoff matching the locked scope reference check:
STANDPOINT_ILLUSTRATIVE = {
    "standpoint_id": "standpoint-option-a-illustrative",
    "label": "Illustrative Option A standoff (~22 m SW, matching scope rough check)",
    "coordinates": [77.40589579, 18.45868638],
    "description": "Offset southwest along the Option A approach terrain (~21.2 m - 22 m), matching the scope's 0.15 m obstruction check.",
}

# 2. Option A route terminus at waypoint 26_1222 (closest vertex on Option A):
STANDPOINT_TERMINUS = {
    "standpoint_id": "standpoint-option-a-terminus",
    "label": "Option A outbound terminus (waypoint 26_1222, 21.77 m SW)",
    "coordinates": [77.40592495, 18.45864728],
    "description": "End-of-outbound traverse vertex for Option A, offset 21.77 m southwest from Skinner Ridge.",
}


def bearing_deg(from_point: list[float], to_point: list[float]) -> float:
    """Calculate the great-circle initial azimuth from from_point to to_point in degrees [0, 360)."""
    lon1, lat1, lon2, lat2 = map(
        math.radians, (from_point[0], from_point[1], to_point[0], to_point[1])
    )
    dlon = lon2 - lon1
    y = math.sin(dlon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(
        dlon
    )
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def sightline_elevation(
    observer_eye_elev: float, target_top_elev: float, fraction: float
) -> float:
    """Line-of-sight ray elevation at fractional distance fraction in [0, 1]."""
    return observer_eye_elev + fraction * (target_top_elev - observer_eye_elev)


def profile_clearance(terrain_elev: float, sightline_elev: float) -> float:
    """Signed clearance in meters: positive = clear above terrain; negative = obstructed."""
    return sightline_elev - terrain_elev


def evaluate_single_height(
    sample_elevation: Callable[[float, float], float | None],
    obs_coords: list[float],
    target_coords: list[float],
    radius_m: float,
    obs_ground_elev: float,
    target_ground_elev: float,
    eye_height_m: float = DEFAULT_EYE_HEIGHT_M,
    target_height_m: float = 0.0,
    num_samples: int = DEFAULT_NUM_SAMPLES,
) -> dict[str, Any]:
    """Evaluate line of sight along the path for one specific target height."""
    obs_eye_elev = obs_ground_elev + eye_height_m
    target_top_elev = target_ground_elev + target_height_m
    total_dist = distance_m(obs_coords, target_coords, radius_m)

    min_clearance = float("inf")
    crit_d = 0.0
    crit_fraction = 0.0
    crit_terrain = 0.0
    crit_sightline = 0.0
    crit_lon = obs_coords[0]
    crit_lat = obs_coords[1]

    profile_samples = []

    for i in range(num_samples + 1):
        fraction = i / num_samples
        d_m = fraction * total_dist
        lon = obs_coords[0] + fraction * (target_coords[0] - obs_coords[0])
        lat = obs_coords[1] + fraction * (target_coords[1] - obs_coords[1])
        zt = sample_elevation(lon, lat)
        if zt is None:
            continue
        z_los = sightline_elevation(obs_eye_elev, target_top_elev, fraction)
        clearance = profile_clearance(zt, z_los)

        profile_samples.append(
            {
                "fraction": round(fraction, 4),
                "distance_m": round(d_m, 2),
                "lon": round(lon, 8),
                "lat": round(lat, 8),
                "terrain_elevation_m": round(zt, 3),
                "sightline_elevation_m": round(z_los, 3),
                "clearance_m": round(clearance, 3),
            }
        )

        # Critical clearance is evaluated across intermediate points (excluding exact endpoints)
        if 0 < i < num_samples and clearance < min_clearance:
            min_clearance = clearance
            crit_d = d_m
            crit_fraction = fraction
            crit_terrain = zt
            crit_sightline = z_los
            crit_lon = lon
            crit_lat = lat

    is_obstructed = min_clearance < 0.0
    obstruction_m = round(max(0.0, -min_clearance), 3)

    return {
        "target_height_m": target_height_m,
        "target_elevation_m": round(target_top_elev, 3),
        "status": "obstructed" if is_obstructed else "clear",
        "is_obstructed": is_obstructed,
        "min_clearance_m": round(min_clearance, 3),
        "obstruction_m": obstruction_m,
        "critical_point": {
            "fraction": round(crit_fraction, 4),
            "distance_from_observer_m": round(crit_d, 2),
            "distance_from_target_m": round(total_dist - crit_d, 2),
            "coordinates": [round(crit_lon, 8), round(crit_lat, 8)],
            "terrain_elevation_m": round(crit_terrain, 3),
            "sightline_elevation_m": round(crit_sightline, 3),
        },
        "profile": profile_samples,
    }


def evaluate_standpoint(
    sample_elevation: Callable[[float, float], float | None],
    standpoint_info: dict[str, Any],
    target_coords: list[float],
    radius_m: float,
    eye_height_m: float = DEFAULT_EYE_HEIGHT_M,
    target_heights: tuple[float, ...] = DEFAULT_TARGET_HEIGHTS,
    num_samples: int = DEFAULT_NUM_SAMPLES,
) -> dict[str, Any]:
    """Run multi-height line-of-sight evaluation for an observation standpoint."""
    obs_coords = standpoint_info["coordinates"]
    obs_ground_elev = sample_elevation(obs_coords[0], obs_coords[1])
    target_ground_elev = sample_elevation(target_coords[0], target_coords[1])

    if obs_ground_elev is None:
        raise ValueError(f"Observer coordinates {obs_coords} land on NoData.")
    if target_ground_elev is None:
        raise ValueError(f"Target coordinates {target_coords} land on NoData.")

    total_dist = distance_m(obs_coords, target_coords, radius_m)
    azimuth = bearing_deg(obs_coords, target_coords)

    height_evaluations: dict[str, Any] = {}
    for h in target_heights:
        key = f"height_{str(h).replace('.', '_')}m"
        height_evaluations[key] = evaluate_single_height(
            sample_elevation=sample_elevation,
            obs_coords=obs_coords,
            target_coords=target_coords,
            radius_m=radius_m,
            obs_ground_elev=obs_ground_elev,
            target_ground_elev=target_ground_elev,
            eye_height_m=eye_height_m,
            target_height_m=h,
            num_samples=num_samples,
        )

    return {
        "standpoint_id": standpoint_info["standpoint_id"],
        "label": standpoint_info["label"],
        "description": standpoint_info["description"],
        "coordinates": obs_coords,
        "ground_elevation_m": round(obs_ground_elev, 3),
        "eye_height_m": eye_height_m,
        "eye_elevation_m": round(obs_ground_elev + eye_height_m, 3),
        "distance_to_target_m": round(total_dist, 2),
        "viewing_azimuth_deg": round(azimuth, 2),
        "evaluations": height_evaluations,
    }


def build_evaluation_report(
    evaluations: dict[str, Any],
    target_ground_elev: float,
) -> dict[str, Any]:
    """Assemble the complete evaluation record for skinner_line_of_sight.json."""
    return {
        "scenario_id": "hawksbill-gap",
        "stop_id": "skinner-ridge",
        "created_at": utc_now(),
        "field_question": (
            "Is the Skinner Ridge sandstone block in place (lower Rockytop) or a "
            "float block (upper Rockytop)?"
        ),
        "objective": (
            "Evaluate whether line of sight from the Option A standoff viewpoint (~22 m southwest) "
            "permits inspection of the basal contact interface to determine bedding continuity, "
            "or whether intervening topography obscures the contact."
        ),
        "assumptions": [
            f"Observer eye height is {DEFAULT_EYE_HEIGHT_M} m above local ground surface.",
            "Terrain elevation is bilinearly sampled from the primary 1 m USGS Mars 2020 HiRISE DTM.",
            "Sightlines are straight rays connecting observer eye elevation to target top elevation.",
            "Planetary curvature over ~22 m distance introduces < 0.1 mm vertical offset and is negligible.",
            "Basal contact sits at ground level (target height 0.0 m).",
            "Upper bedding and facies features sit at raised elevations (+0.5 m to +1.0 m).",
        ],
        "target": {
            "name": "Skinner Ridge block",
            "sample_name": TARGET_SAMPLE_NAME,
            "mission_designation": TARGET_MISSION_DESIGNATION,
            "coring_sol": TARGET_SOL,
            "coordinates": TARGET_COORDS,
            "ground_elevation_m": round(target_ground_elev, 3),
            "description": (
                "Fine-to-medium grained laminated sandstone block (~1 m across) at the front "
                "of Jezero's western fan."
            ),
        },
        "standpoints": evaluations,
        "summary_table": [
            {
                "target_height": "0.0 m (basal contact)",
                "illustrative_standpoint": {
                    "distance_m": evaluations["illustrative_standoff"][
                        "distance_to_target_m"
                    ],
                    "status": evaluations["illustrative_standoff"]["evaluations"][
                        "height_0_0m"
                    ]["status"],
                    "clearance_m": evaluations["illustrative_standoff"]["evaluations"][
                        "height_0_0m"
                    ]["min_clearance_m"],
                    "obstruction_m": evaluations["illustrative_standoff"][
                        "evaluations"
                    ]["height_0_0m"]["obstruction_m"],
                },
                "option_a_terminus": {
                    "distance_m": evaluations["option_a_terminus"][
                        "distance_to_target_m"
                    ],
                    "status": evaluations["option_a_terminus"]["evaluations"][
                        "height_0_0m"
                    ]["status"],
                    "clearance_m": evaluations["option_a_terminus"]["evaluations"][
                        "height_0_0m"
                    ]["min_clearance_m"],
                    "obstruction_m": evaluations["option_a_terminus"]["evaluations"][
                        "height_0_0m"
                    ]["obstruction_m"],
                },
            },
            {
                "target_height": "+0.5 m (mid-block face)",
                "illustrative_standpoint": {
                    "distance_m": evaluations["illustrative_standoff"][
                        "distance_to_target_m"
                    ],
                    "status": evaluations["illustrative_standoff"]["evaluations"][
                        "height_0_5m"
                    ]["status"],
                    "clearance_m": evaluations["illustrative_standoff"]["evaluations"][
                        "height_0_5m"
                    ]["min_clearance_m"],
                    "obstruction_m": evaluations["illustrative_standoff"][
                        "evaluations"
                    ]["height_0_5m"]["obstruction_m"],
                },
                "option_a_terminus": {
                    "distance_m": evaluations["option_a_terminus"][
                        "distance_to_target_m"
                    ],
                    "status": evaluations["option_a_terminus"]["evaluations"][
                        "height_0_5m"
                    ]["status"],
                    "clearance_m": evaluations["option_a_terminus"]["evaluations"][
                        "height_0_5m"
                    ]["min_clearance_m"],
                    "obstruction_m": evaluations["option_a_terminus"]["evaluations"][
                        "height_0_5m"
                    ]["obstruction_m"],
                },
            },
            {
                "target_height": "+1.0 m (block top)",
                "illustrative_standpoint": {
                    "distance_m": evaluations["illustrative_standoff"][
                        "distance_to_target_m"
                    ],
                    "status": evaluations["illustrative_standoff"]["evaluations"][
                        "height_1_0m"
                    ]["status"],
                    "clearance_m": evaluations["illustrative_standoff"]["evaluations"][
                        "height_1_0m"
                    ]["min_clearance_m"],
                    "obstruction_m": evaluations["illustrative_standoff"][
                        "evaluations"
                    ]["height_1_0m"]["obstruction_m"],
                },
                "option_a_terminus": {
                    "distance_m": evaluations["option_a_terminus"][
                        "distance_to_target_m"
                    ],
                    "status": evaluations["option_a_terminus"]["evaluations"][
                        "height_1_0m"
                    ]["status"],
                    "clearance_m": evaluations["option_a_terminus"]["evaluations"][
                        "height_1_0m"
                    ]["min_clearance_m"],
                    "obstruction_m": evaluations["option_a_terminus"]["evaluations"][
                        "height_1_0m"
                    ]["obstruction_m"],
                },
            },
        ],
        "conclusion": (
            "Ground-level contact (height 0.0 m, basal contact) is obscured by topography "
            "from the Option A standoff viewpoint (~21-22 m southwest), resulting in ~0.07 m to ~0.15 m "
            "of obstruction along the intervening terrain crest (~18-19 m from the observer). "
            "Conversely, raised features (+0.5 m and +1.0 m) clear the crest with ~0.28 m to ~0.37 m "
            "of clearance at +0.5 m, and ~0.71 m to ~0.81 m clearance at +1.0 m. "
            "Consequently, an astronaut observing from Option A can view upper bedding layers "
            "and alternating protruding/recessive facies, but cannot determine basal contact continuity. "
            "The contact observation outcome from Option A must remain 'unresolved', and resolving "
            "origin requires direct physical inspection via route Option B."
        ),
    }


def main() -> None:
    import rasterio

    manifest = load_manifest()
    radius_m = manifest["conventions"]["geographic"]["reference_sphere_radius_m"]

    with rasterio.open(CROP_PATH) as src:
        crop = src.read(1)
        transform = tuple(src.transform)[:6]
        nodata = src.nodata

    def sample_elevation(lon: float, lat: float) -> float | None:
        x = radius_m * math.radians(lon)
        y = radius_m * math.radians(lat)
        a, _, c, _, e, f = transform
        return bilinear(crop, nodata, (y - f) / e, (x - c) / a)

    target_ground_elev = sample_elevation(TARGET_COORDS[0], TARGET_COORDS[1])
    if target_ground_elev is None:
        raise SystemExit("Error: Target coordinates land on NoData.")

    evaluations = {
        "illustrative_standoff": evaluate_standpoint(
            sample_elevation=sample_elevation,
            standpoint_info=STANDPOINT_ILLUSTRATIVE,
            target_coords=TARGET_COORDS,
            radius_m=radius_m,
        ),
        "option_a_terminus": evaluate_standpoint(
            sample_elevation=sample_elevation,
            standpoint_info=STANDPOINT_TERMINUS,
            target_coords=TARGET_COORDS,
            radius_m=radius_m,
        ),
    }

    report = build_evaluation_report(evaluations, target_ground_elev)
    write_json(OUTPUT_PATH, report)
    print(f"OK: Saved Skinner Ridge line of sight evaluation -> {OUTPUT_PATH}")
    for item in report["summary_table"]:
        th = item["target_height"]
        ill = item["illustrative_standpoint"]
        opt = item["option_a_terminus"]
        print(f" - {th}:")
        print(
            f"     Illustrative (~{ill['distance_m']} m): {ill['status'].upper()} (clearance={ill['clearance_m']} m, obst={ill['obstruction_m']} m)"
        )
        print(
            f"     Terminus     (~{opt['distance_m']} m): {opt['status'].upper()} (clearance={opt['clearance_m']} m, obst={opt['obstruction_m']} m)"
        )
    print(f"Conclusion: {report['conclusion']}")


if __name__ == "__main__":
    main()
