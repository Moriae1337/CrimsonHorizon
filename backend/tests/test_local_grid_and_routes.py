"""Checks for the local metric grid (CH26-039) and route options (CH26-040).

These use the committed records and the rover snapshot. They need no network
access and no rasterio.
"""

import json
import math

import pytest

from prep import local_grid, routes
from prep.common import INPUTS_DIR, SCENARIO_DIR, load_manifest

NODATA = -3.4028226550889045e38


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def radius_m() -> float:
    return load_manifest()["conventions"]["geographic"]["reference_sphere_radius_m"]


@pytest.fixture(scope="module")
def built(radius_m: float) -> dict:
    traverse = load(INPUTS_DIR / "rover_traverse.geojson")["features"]
    waypoints = load(INPUTS_DIR / "rover_waypoints.geojson")["features"]
    return routes.build(traverse, waypoints, radius_m)


# Local grid (CH26-039) --------------------------------------------------------


def test_aeqd_keeps_true_distance_from_center(radius_m: float) -> None:
    assert local_grid.aeqd_forward(77.406, 18.459, 77.406, 18.459, radius_m) == (
        0.0,
        0.0,
    )
    x, y = local_grid.aeqd_forward(77.406, 18.460, 77.406, 18.459, radius_m)
    assert x == pytest.approx(0.0, abs=1e-9)
    assert y == pytest.approx(radius_m * math.radians(0.001), rel=1e-9)


def test_cell_center_round_trips() -> None:
    transform = (1.0, 0.0, -226.0, 0.0, -1.0, 238.0)
    for row, col in [(0, 0), (238, 226), (474, 450)]:
        assert local_grid.cell_of(
            transform, *local_grid.cell_center(transform, row, col)
        ) == (
            row,
            col,
        )
    assert local_grid.cell_of(transform, 0.0, 0.0) == (238, 226)


def test_snap_grid_covers_bounds() -> None:
    transform, width, height = local_grid.snap_grid((-225.4, -236.2, 224.1, 237.9), 1.0)
    assert transform == (1.0, 0.0, -226.0, 0.0, -1.0, 238.0)
    assert (width, height) == (451, 475)


def test_bilinear_never_fills_nodata() -> None:
    data = [[1.0, 2.0], [3.0, 4.0]]
    assert local_grid.bilinear(data, NODATA, 1.0, 1.0) == pytest.approx(2.5)
    data[0][1] = NODATA
    assert local_grid.bilinear(data, NODATA, 1.0, 1.0) is None
    assert local_grid.bilinear(data, NODATA, 0.2, 0.2) is None


def test_control_findings_flag_failures() -> None:
    good = {
        "id": "p",
        "round_trip_same_cell": True,
        "local_value_m": -1.0,
        "local_minus_source_m": 0.0,
    }
    clean = {"cells_checked": 10, "filled_cells": 0, "zero_cells": 0}
    assert local_grid.control_findings([good], clean) == []
    bad = {**good, "round_trip_same_cell": False, "local_minus_source_m": 0.5}
    notes = local_grid.control_findings(
        [bad], {**clean, "filled_cells": 3, "zero_cells": 1}
    )
    assert len(notes) == 4


def test_local_record_passes_its_checks() -> None:
    record = load(SCENARIO_DIR / "dtm_local.json")
    assert record["findings"] == []
    assert record["nodata"] == NODATA
    assert record["vertical_reference"]
    assert record["local"]["cell_size_m"] == 1.0
    assert "+proj=aeqd" in record["local"]["crs_proj4"]
    assert "+proj=eqc" in record["source"]["crs_proj4"]
    assert record["valid_cells"] + record["nodata_cells"] == record["cells"]
    ids = {s["id"] for s in record["control_samples"]}
    assert set(local_grid.CONTROL_RMCS) <= ids
    for sample in record["control_samples"]:
        assert sample["round_trip_same_cell"]
        assert abs(sample["local_minus_source_m"]) <= local_grid.ELEVATION_TOLERANCE_M
    mask = record["mask_check"]
    assert mask["cells_checked"] > 0
    assert mask["filled_cells"] == 0


# Routes (CH26-040) ------------------------------------------------------------


def test_join_drops_repeated_junction_vertex() -> None:
    a = [[0.0, 0.0, 1.0], [1.0, 0.0, 1.0]]
    b = [[1.0, 0.0, 1.0], [2.0, 0.0, 1.0]]
    assert routes.join([a, b]) == [[0.0, 0.0, 1.0], [1.0, 0.0, 1.0], [2.0, 0.0, 1.0]]


def test_both_options_start_at_25_446_and_end_at_wildcat(built: dict) -> None:
    for info in built["options"].values():
        assert info["start_offset_m"] < 0.05
        assert info["end_offset_m"] < 0.05
    assert built["options"]["B"]["skinner_offset_m"] < 0.05


def test_round_trips_match_the_scope(built: dict) -> None:
    assert built["options"]["A"]["round_trip_m"] == pytest.approx(258.01, abs=0.02)
    assert built["options"]["B"]["round_trip_m"] == pytest.approx(345.28, abs=0.02)


def test_a_connector_is_separate_and_proposed(built: dict) -> None:
    pieces = [
        f["properties"]
        for f in built["features"]
        if f["properties"]["option"] == "A" and f["properties"]["leg"] == "outbound"
    ]
    assert [p["kind"] for p in pieces] == ["historical", "connector", "historical"]
    connector = pieces[1]
    assert connector["proposed"] is True
    assert connector["length_m"] == pytest.approx(5.2, abs=0.01)
    assert built["options"]["A"]["proposed_m"] == connector["length_m"]
    assert built["options"]["B"]["proposed_m"] == 0
    historical = [
        f for f in built["features"] if f["properties"]["kind"] == "historical"
    ]
    assert not any(f["properties"].get("proposed") for f in historical)


def test_return_retraces_outbound(built: dict) -> None:
    for option in ("A", "B"):
        features = [f for f in built["features"] if f["properties"]["option"] == option]
        out = [
            f["geometry"]["coordinates"]
            for f in features
            if f["properties"]["leg"] == "outbound"
        ]
        back = [
            f["geometry"]["coordinates"]
            for f in features
            if f["properties"]["leg"] == "return"
        ]
        assert routes.join(back) == list(reversed(routes.join(out)))


def test_committed_routes_match_a_rebuild(built: dict) -> None:
    assert load(routes.ROUTES_PATH) == json.loads(json.dumps(built))
