"""Independent verification tests for GIS marker placement in Hawksbill Gap (Issue #89, CH26-071).

Verifies:
1. Rendered point targets in scenario.json and manifest.json against PDS coordinates:
   - Hazeltop (Wildcat Ridge): 18.45863707° N, 77.40588851° E
   - Swift Run (Skinner Ridge): 18.458931° N, 77.40617078° E
2. Coordinate axis order strictly follows GeoJSON [lon, lat] convention.
3. Separation distance between Wildcat and Skinner Ridge matches the ~20 m report.
4. Observer standpoint offsets (southwest standpoint on stable ground vs exact core drill spot).
"""

import json
import math
from pathlib import Path

import pytest

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "hawksbill_gap"
MARS_RADIUS_M = 3_396_190

# PDS Initial Reports Volume 2 Release 2 (sections 11, 12, 14, 15).
# PDS lists Latitude (N), Longitude (E); converted to GeoJSON [lon, lat] on input.
PDS_TARGETS = {
    "Hazeltop": {
        "stop_id": "wildcat-ridge",
        "sample_name": "Hazeltop",
        "pds_section": "14",
        "lat_n": 18.45863707,
        "lon_e": 77.40588851,
        "geojson_coord": [77.40588851, 18.45863707],
        "coring_sol": 509,
    },
    "Swift Run": {
        "stop_id": "skinner-ridge",
        "sample_name": "Swift Run",
        "pds_section": "11",
        "lat_n": 18.458931,
        "lon_e": 77.40617078,
        "geojson_coord": [77.40617078, 18.458931],
        "coring_sol": 490,
    },
    "Bearwallow": {
        "stop_id": "wildcat-ridge",
        "sample_name": "Bearwallow",
        "pds_section": "15",
        "lat_n": 18.45863832,
        "lon_e": 77.40588685,
        "geojson_coord": [77.40588685, 18.45863832],
        "coring_sol": 516,
    },
    "Skyland": {
        "stop_id": "skinner-ridge",
        "sample_name": "Skyland",
        "pds_section": "12",
        "lat_n": 18.458931,
        "lon_e": 77.40617078,
        "geojson_coord": [77.40617078, 18.458931],
        "coring_sol": 495,
    },
}

# Primary observation standpoints for Skinner Ridge and Wildcat Ridge.
STANDPOINTS = {
    "skinner-ridge": {
        "standpoint_id": "standpoint-skinner-south",
        "target_sample": "Swift Run",
        "lon_e": 77.406155,
        "lat_n": 18.458908,
        "geojson_coord": [77.406155, 18.458908],
        "reported_viewing_azimuth_deg": 38.5,
    },
    "wildcat-ridge": {
        "standpoint_id": "standpoint-wildcat-west",
        "target_sample": "Hazeltop",
        "lon_e": 77.405872,
        "lat_n": 18.458632,
        "geojson_coord": [77.405872, 18.458632],
        "reported_viewing_azimuth_deg": 65.0,
    },
}

# Nearest MMGIS rover parking localizations where Perseverance stood while operating its arm
ROVER_LOCALIZATIONS = {
    "skinner-ridge": {
        "rmc": "26_1004",
        "sol": 477,
        "target_sample": "Swift Run",
        "geojson_coord": [77.40616768, 18.45889532],
    },
    "wildcat-ridge": {
        "rmc": "26_1222",
        "sol": 502,
        "target_sample": "Hazeltop",
        "geojson_coord": [77.40592495, 18.45864728],
    },
}


def great_circle_m(
    a: tuple[float, float] | list[float], b: tuple[float, float] | list[float]
) -> float:
    """Haversine distance in meters between two [lon, lat] points on the Mars sphere."""
    lon1, lat1, lon2, lat2 = map(math.radians, (*a[:2], *b[:2]))
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    )
    return 2 * MARS_RADIUS_M * math.asin(math.sqrt(h))


def bearing_deg(
    a: tuple[float, float] | list[float], b: tuple[float, float] | list[float]
) -> float:
    """Initial bearing from a to b in degrees clockwise from north [0, 360)."""
    lon1, lat1, lon2, lat2 = map(math.radians, (*a[:2], *b[:2]))
    y = math.sin(lon2 - lon1) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(
        lon2 - lon1
    )
    return math.degrees(math.atan2(y, x)) % 360


@pytest.fixture(scope="module")
def manifest() -> dict:
    return json.loads((DATA_DIR / "manifest.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def scenario() -> dict:
    return json.loads((DATA_DIR / "scenario.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def skinner_los() -> dict:
    path = DATA_DIR / "skinner_line_of_sight.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {}


# ==============================================================================
# 1. Compare rendered point targets in scenario.json and manifest.json against PDS coordinates
# ==============================================================================


def test_scenario_stop_coordinates_exactly_match_pds_coordinates(
    scenario: dict,
) -> None:
    """Verify scenario.json stop coordinates match PDS report coordinates exactly.

    - Hazeltop (Wildcat Ridge): 18.45863707° N, 77.40588851° E -> [77.40588851, 18.45863707]
    - Swift Run (Skinner Ridge): 18.458931° N, 77.40617078° E -> [77.40617078, 18.458931]
    """
    stops_by_id = {s["id"]: s for s in scenario["stops"]}

    hazeltop_expected = PDS_TARGETS["Hazeltop"]["geojson_coord"]
    swift_run_expected = PDS_TARGETS["Swift Run"]["geojson_coord"]

    assert "wildcat-ridge" in stops_by_id
    assert "skinner-ridge" in stops_by_id

    wildcat_stop = stops_by_id["wildcat-ridge"]
    skinner_stop = stops_by_id["skinner-ridge"]

    assert wildcat_stop["coordinates"][:2] == hazeltop_expected
    assert skinner_stop["coordinates"][:2] == swift_run_expected

    # Verify sample attribution in scenario stops matches PDS
    wildcat_sample_names = [s["name"] for s in wildcat_stop["samples"]]
    assert "Hazeltop" in wildcat_sample_names
    assert "Bearwallow" in wildcat_sample_names

    skinner_sample_names = [s["name"] for s in skinner_stop["samples"]]
    assert "Swift Run" in skinner_sample_names
    assert "Skyland" in skinner_sample_names


def test_manifest_documents_pds_inputs_and_frame_consistency(manifest: dict) -> None:
    """Verify manifest.json cites the PDS Initial Reports and documents coordinate conversion."""
    inputs_by_id = {item["id"]: item for item in manifest["inputs"]}

    assert "pds-initial-reports" in inputs_by_id
    pds_input = inputs_by_id["pds-initial-reports"]

    # Verify PDS report metadata citations
    assert "sections 11 (Swift Run), 14 (Hazeltop)" in pds_input["title"]
    assert "15 (Bearwallow)" in pds_input["title"]
    assert pds_input["convention"]["coordinate_order"] == ["lat", "lon", "elevation"]
    assert "Convert to [lon, lat] on input" in pds_input["convention"]["note"]

    # Verify rover waypoints reference PDS coordinate proximity (~2.1 m arm reach)
    assert "m20-waypoints" in inputs_by_id
    wp_input = inputs_by_id["m20-waypoints"]
    assert (
        "Hazeltop and Swift Run fall within about 2.1 m"
        in wp_input["convention"]["geographic_basis"]
    )


def test_extent_encloses_all_pds_sample_coordinates(
    manifest: dict, scenario: dict
) -> None:
    """Verify manifest and scenario geographic extents fully enclose both PDS targets."""
    for doc in (manifest, scenario):
        extent = doc["extent"]
        for target_name, target_info in PDS_TARGETS.items():
            lon, lat = target_info["geojson_coord"]
            assert extent["lon_min"] <= lon <= extent["lon_max"], (
                f"{target_name} lon {lon} outside [{extent['lon_min']}, {extent['lon_max']}]"
            )
            assert extent["lat_min"] <= lat <= extent["lat_max"], (
                f"{target_name} lat {lat} outside [{extent['lat_min']}, {extent['lat_max']}]"
            )


def test_secondary_pds_core_proximity() -> None:
    """Verify secondary core targets align with primary pin targets as reported in PDS.

    - Bearwallow (sol 516) is 0.12 m from Hazeltop (sol 509) on the Wildcat Ridge block.
    - Skyland (sol 495) shares the Swift Run coordinate (sol 490) to 8 decimal places.
    """
    hazeltop = PDS_TARGETS["Hazeltop"]["geojson_coord"]
    bearwallow = PDS_TARGETS["Bearwallow"]["geojson_coord"]
    dist_wildcat_cores = great_circle_m(hazeltop, bearwallow)
    assert dist_wildcat_cores == pytest.approx(0.12, abs=0.03)

    swift_run = PDS_TARGETS["Swift Run"]["geojson_coord"]
    skyland = PDS_TARGETS["Skyland"]["geojson_coord"]
    dist_skinner_cores = great_circle_m(swift_run, skyland)
    assert dist_skinner_cores == 0.0


# ==============================================================================
# 2. Verify coordinate axis order strictly follows GeoJSON [lon, lat] convention
# ==============================================================================


def test_manifest_axis_order_conventions(manifest: dict) -> None:
    """Verify manifest.json declares [lon, lat] for geographic and [easting, northing] for projected."""
    geo = manifest["conventions"]["geographic"]
    assert geo["axis_order"] == ["lon", "lat"]
    assert geo["longitude_direction"] == "positive_east"
    assert geo["latitude_type"] == "planetocentric"

    proj = manifest["conventions"]["projected"]
    assert proj["axis_order"] == ["easting", "northing"]

    # Rover data inputs must declare [lon, lat, ...] order
    inputs_by_id = {item["id"]: item for item in manifest["inputs"]}
    assert inputs_by_id["m20-waypoints"]["convention"]["coordinate_order"][:2] == [
        "lon",
        "lat",
    ]
    assert inputs_by_id["m20-traverse"]["convention"]["coordinate_order"][:2] == [
        "lon",
        "lat",
    ]


def test_scenario_declares_coordinate_order(scenario: dict) -> None:
    """Verify scenario.json explicitly declares ['lon', 'lat', ...] coordinate order."""
    assert scenario["conventions"]["coordinate_order"][:2] == ["lon", "lat"]


def test_all_scenario_coordinates_follow_geojson_lon_lat_order(scenario: dict) -> None:
    """Verify every coordinate array in scenario.json has longitude as element 0 and latitude as element 1.

    In Hawksbill Gap:
      Longitude E is ~77.402° to 77.410°
      Latitude N is ~18.455° to 18.463°

    Because Martian longitude (~77.4°) is vastly greater than latitude (~18.5°),
    any inverted [lat, lon] pair will fail both the bounds check and lon > lat test.
    """
    points_to_check: list[tuple[str, list[float]]] = []

    # Start point
    points_to_check.append(("start", scenario["start"]["coordinates"]))

    # Stop points
    for stop in scenario["stops"]:
        points_to_check.append((f"stop:{stop['id']}", stop["coordinates"]))

    # Route vertices
    for feature in scenario["routes"]["features"]:
        feat_id = feature["id"]
        for idx, pt in enumerate(feature["geometry"]["coordinates"]):
            points_to_check.append((f"route:{feat_id}:{idx}", pt))

    # Rover track vertices
    for feature in scenario["rover_track"]["features"]:
        feat_id = feature["id"]
        for idx, pt in enumerate(feature["geometry"]["coordinates"]):
            points_to_check.append((f"rover_track:{feat_id}:{idx}", pt))

    # Unknowns geometry vertices
    for unknown in scenario["unknowns"]:
        unk_id = unknown["id"]
        for idx, pt in enumerate(unknown["geometry"]["coordinates"]):
            points_to_check.append((f"unknown:{unk_id}:{idx}", pt))

    assert len(points_to_check) > 200, (
        "Expected at least 200 coordinates across the scenario"
    )

    box = scenario["extent"]
    for label, pt in points_to_check:
        assert len(pt) in (2, 3), f"{label}: coordinate must be 2D or 3D, got {pt}"
        lon, lat = pt[0], pt[1]

        # Element 0 must be longitude (~77.4°)
        assert box["lon_min"] <= lon <= box["lon_max"], (
            f"{label}: lon {lon} not in [{box['lon_min']}, {box['lon_max']}] (possible axis order inversion!)"
        )
        # Element 1 must be latitude (~18.45°)
        assert box["lat_min"] <= lat <= box["lat_max"], (
            f"{label}: lat {lat} not in [{box['lat_min']}, {box['lat_max']}] (possible axis order inversion!)"
        )
        # GeoJSON order invariant: lon > lat for Jezero crater
        assert lon > lat, (
            f"{label}: expected lon > lat in Jezero, got lon={lon}, lat={lat}"
        )


def test_routes_geojson_file_follows_lon_lat_convention() -> None:
    """Verify standalone routes.geojson follows [lon, lat, ...] ordering."""
    routes_file = DATA_DIR / "routes.geojson"
    if not routes_file.exists():
        pytest.skip("routes.geojson not found")

    data = json.loads(routes_file.read_text(encoding="utf-8"))
    for f_idx, feature in enumerate(data.get("features", [])):
        coords = feature["geometry"]["coordinates"]
        for c_idx, pt in enumerate(coords):
            lon, lat = pt[0], pt[1]
            assert 77.400 <= lon <= 77.412, (
                f"Feature {f_idx} coord {c_idx}: lon {lon} out of range"
            )
            assert 18.450 <= lat <= 18.465, (
                f"Feature {f_idx} coord {c_idx}: lat {lat} out of range"
            )
            assert lon > lat


# ==============================================================================
# 3. Verify separation distance between Wildcat and Skinner Ridge matches ~20 m report
# ==============================================================================


def test_separation_distance_between_wildcat_and_skinner_ridge_matches_20m_report() -> (
    None
):
    """Verify distance between Wildcat Ridge and Skinner Ridge matches the ~20 m report.

    NASA Photojournal PIA24924 (sol 518) Mastcam-Z mosaic context report states that the two
    sampling locations in Hawksbill Gap are within about 20 m of each other.
    Great-circle distance on the Mars reference sphere (R = 3,396,190 m) gives 23.57 m.
    """
    wildcat = PDS_TARGETS["Hazeltop"]["geojson_coord"]
    skinner = PDS_TARGETS["Swift Run"]["geojson_coord"]

    distance_m = great_circle_m(wildcat, skinner)

    # Validates within 20-25 m range, matching the ~20 m report and the 23.6 m coordinate separation.
    assert 20.0 <= distance_m <= 25.0
    assert distance_m == pytest.approx(23.57, abs=0.1)


def test_relative_bearing_matches_context_mosaic_geometry() -> None:
    """Verify relative bearing matches NASA PIA24924 Mastcam-Z context mosaic geometry.

    In PIA24924, Wildcat Ridge is shown in the lower left (southwest) and Skinner Ridge in the
    upper right (northeast). Bearing from Wildcat to Skinner must be northeast (~42°).
    """
    wildcat = PDS_TARGETS["Hazeltop"]["geojson_coord"]
    skinner = PDS_TARGETS["Swift Run"]["geojson_coord"]

    bearing_w_to_s = bearing_deg(wildcat, skinner)
    assert 35.0 <= bearing_w_to_s <= 50.0
    assert bearing_w_to_s == pytest.approx(42.33, abs=0.5)

    bearing_s_to_w = bearing_deg(skinner, wildcat)
    assert 215.0 <= bearing_s_to_w <= 230.0
    assert bearing_s_to_w == pytest.approx(222.33, abs=0.5)


# ==============================================================================
# 4. Verify observer standpoint offsets (southwest standpoint on stable ground vs exact core drill spot)
# ==============================================================================


def test_skinner_standpoint_offset_and_southwest_placement() -> None:
    """Verify Skinner Ridge observer standpoint is offset southwest on stable ground from Swift Run drill spot.

    - Target: Swift Run core drill spot [77.40617078, 18.458931]
    - Primary Standpoint: standpoint-skinner-south [77.406155, 18.458908]
    - Placing crew on stable ground ~1.63 m southwest prevents disturbing the ~1 m block,
      core holes, drill tailings, or banked regolith.
    """
    target = PDS_TARGETS["Swift Run"]["geojson_coord"]
    standpoint_info = STANDPOINTS["skinner-ridge"]
    standpoint = standpoint_info["geojson_coord"]

    # Standpoint must be a distinct point from the drill spot
    assert standpoint != target

    # Standpoint is southwest: longitude is west of target, latitude is south of target
    assert standpoint[0] < target[0], "Standpoint lon must be west of target"
    assert standpoint[1] < target[1], "Standpoint lat must be south of target"

    # Separation distance is ~1.63 m (within 1.0 to 3.0 m).
    dist_m = great_circle_m(target, standpoint)
    assert 1.0 <= dist_m <= 3.0
    assert dist_m == pytest.approx(1.63, abs=0.05)

    # Bearing from drill spot to standpoint must be in southwest quadrant (180° to 270°)
    bearing_target_to_obs = bearing_deg(target, standpoint)
    assert 180.0 < bearing_target_to_obs < 270.0
    assert bearing_target_to_obs == pytest.approx(213.06, abs=0.5)

    # Viewing azimuth looking from standpoint towards the target must be northeast
    viewing_azimuth = bearing_deg(standpoint, target)
    assert 0.0 < viewing_azimuth < 90.0
    assert viewing_azimuth == pytest.approx(33.06, abs=0.5)
    # Aligns closely with documented crew viewing azimuth (38.5°).
    assert abs(viewing_azimuth - standpoint_info["reported_viewing_azimuth_deg"]) < 6.0


def test_wildcat_standpoint_offset_and_southwest_placement() -> None:
    """Verify Wildcat Ridge observer standpoint is offset west-southwest on stable ground from Hazeltop drill spot.

    - Target: Hazeltop core drill spot [77.40588851, 18.45863707]
    - Primary Standpoint: standpoint-wildcat-west [77.405872, 18.458632]
    """
    target = PDS_TARGETS["Hazeltop"]["geojson_coord"]
    standpoint_info = STANDPOINTS["wildcat-ridge"]
    standpoint = standpoint_info["geojson_coord"]

    # Standpoint must be a distinct point from the drill spot
    assert standpoint != target

    # Standpoint is west-southwest: lon is west, lat is south
    assert standpoint[0] < target[0], "Standpoint lon must be west of target"
    assert standpoint[1] < target[1], "Standpoint lat must be south of target"

    # Separation distance is ~0.98 m (within 0.5 to 2.0 m)
    dist_m = great_circle_m(target, standpoint)
    assert 0.5 <= dist_m <= 2.0
    assert dist_m == pytest.approx(0.98, abs=0.05)

    # Bearing from drill spot to standpoint must be in southwest quadrant (180° to 270°)
    bearing_target_to_obs = bearing_deg(target, standpoint)
    assert 180.0 < bearing_target_to_obs < 270.0
    assert bearing_target_to_obs == pytest.approx(252.06, abs=0.5)

    # Viewing azimuth looking from standpoint towards target
    viewing_azimuth = bearing_deg(standpoint, target)
    assert 0.0 < viewing_azimuth < 90.0
    assert viewing_azimuth == pytest.approx(72.06, abs=0.5)
    # Aligns with documented crew viewing azimuth (65.0°).
    assert abs(viewing_azimuth - standpoint_info["reported_viewing_azimuth_deg"]) < 8.0


def test_sample_points_differ_from_rover_parking_localizations() -> None:
    """Verify that sample core drill points differ from rover parking localizations by ~2.1 m (arm reach).

    The GIS marker placement must mark the actual sample core drill hole, while rover paths
    terminate at the parking localizations.
    """
    for stop_id, rmc_info in ROVER_LOCALIZATIONS.items():
        sample_name = rmc_info["target_sample"]
        sample_coord = PDS_TARGETS[sample_name]["geojson_coord"]
        rover_coord = rmc_info["geojson_coord"]

        assert sample_coord != rover_coord, (
            f"Stop {stop_id}: sample point must differ from rover position"
        )

        arm_reach_m = great_circle_m(rover_coord, sample_coord)
        assert 2.0 <= arm_reach_m <= 2.3, (
            f"Stop {stop_id}: expected ~2.1 m arm offset, got {arm_reach_m:.2f} m"
        )


def test_standoff_viewpoints_in_skinner_line_of_sight(skinner_los: dict) -> None:
    """Verify line-of-sight standoff observation standpoint is positioned southwest of Skinner Ridge."""
    if not skinner_los:
        pytest.skip("skinner_line_of_sight.json not present")

    target = skinner_los["target"]["coordinates"]
    standpoints = skinner_los.get("standpoints", {})

    assert "illustrative_standoff" in standpoints
    standoff = standpoints["illustrative_standoff"]
    standoff_coords = standoff["coordinates"]

    # Must be distinct and ~21 m away
    dist_m = great_circle_m(target, standoff_coords)
    assert dist_m == pytest.approx(21.2, abs=0.5)

    # Must be southwest of Swift Run target
    assert standoff_coords[0] < target[0]  # lon west
    assert standoff_coords[1] < target[1]  # lat south

    bearing_target_to_standoff = bearing_deg(target, standoff_coords)
    assert 180.0 < bearing_target_to_standoff < 270.0
