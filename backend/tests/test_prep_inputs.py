"""Checks for the DTM window (CH26-014) and rover inputs (CH26-015).

These tests use the committed records and small fixtures. They need no network
access and no rasterio.
"""

import itertools
import json

import pytest

from prep import dtm_window, rover_inputs
from prep.common import INPUTS_DIR, SCENARIO_DIR, load_manifest, manifest_input


@pytest.fixture(scope="module")
def manifest() -> dict:
    return load_manifest()


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


# DTM window (CH26-014) ------------------------------------------------------


def test_window_bounds_cover_the_extent(manifest: dict) -> None:
    dtm = manifest_input(manifest, "dtm-primary")
    m_per_deg = manifest["conventions"]["projected"]["meters_per_degree"]
    bounds = dtm_window.window_bounds(
        dtm["convention"]["bounds_m"], dtm["convention"]["pixel_size_m"], dtm["window"]
    )
    degrees = dtm_window.to_degrees(bounds, m_per_deg)
    for key in ("lon_min", "lon_max", "lat_min", "lat_max"):
        assert degrees[key] == pytest.approx(manifest["extent"][key], abs=0.0005)


def test_window_record_has_all_valid_cells() -> None:
    record = load(SCENARIO_DIR / "dtm_primary_window.json")
    assert record["valid_cells"] == dtm_window.EXPECTED_VALID_CELLS == 474 * 474
    assert record["findings"] == []
    assert record["source_version"]["last_modified"]
    assert len(record["data_sha256"]) == 64


def test_findings_flag_a_changed_source(manifest: dict) -> None:
    conv = manifest_input(manifest, "dtm-primary")["convention"]
    header = {
        "raster_size": conv["raster_size"],
        "bounds_m": conv["bounds_m"],
        "pixel_size_m": conv["pixel_size_m"],
        "nodata": conv["nodata"],
    }
    assert dtm_window.findings(dtm_window.EXPECTED_VALID_CELLS, header, conv) == []
    changed = {**header, "raster_size": [1, 1]}
    notes = dtm_window.findings(100, changed, conv)
    assert any("valid cells" in note for note in notes)
    assert any("raster_size" in note for note in notes)


# Rover inputs (CH26-015) ------------------------------------------------------


def waypoint(rmc: str, lon: float, lat: float) -> dict:
    props = {"RMC": rmc, "lon": lon, "lat": lat, "images": [{"name": "x"}]}
    return {"type": "Feature", "properties": props, "geometry": None}


def test_select_waypoints_keeps_extent_and_required_ids() -> None:
    extent = {"lon_min": 0.0, "lon_max": 1.0, "lat_min": 0.0, "lat_max": 1.0}
    features = [
        waypoint("1_0", 0.5, 0.5),
        waypoint("2_0", 5.0, 5.0),
        waypoint("3_0", 9.0, 9.0),
    ]
    selected = rover_inputs.select_waypoints(features, extent, ("3_0",))
    assert [f["properties"]["RMC"] for f in selected] == ["1_0", "3_0"]
    assert all("images" not in f["properties"] for f in selected)


def test_check_reports_missing_ids_and_sols() -> None:
    waypoints = [waypoint("25_446", 0, 0)]
    traverse = [{"properties": {"sol": 449}}]
    problems = rover_inputs.check(
        waypoints, traverse, {"A": [449, 455]}, ("25_446", "26_1004")
    )
    assert "waypoint 26_1004 not found" in problems
    assert any("sols [455]" in p for p in problems)


def test_snapshot_resolves_both_options() -> None:
    meta = load(INPUTS_DIR / "rover_inputs.json")
    assert meta["problems"] == []
    assert all(src["matches_manifest"] for src in meta["sources"].values())

    waypoints = load(INPUTS_DIR / "rover_waypoints.geojson")["features"]
    rmcs = {f["properties"]["RMC"] for f in waypoints}
    assert {"25_446", "26_1004", "26_1222"} <= rmcs

    traverse = load(INPUTS_DIR / "rover_traverse.geojson")["features"]
    by_sol = {f["properties"]["sol"]: f["properties"] for f in traverse}
    for sols in rover_inputs.OPTION_SOLS.values():
        assert set(sols) <= set(by_sol)


def test_option_b_segments_chain_from_start_to_wildcat() -> None:
    traverse = load(INPUTS_DIR / "rover_traverse.geojson")["features"]
    by_sol = {f["properties"]["sol"]: f["properties"] for f in traverse}
    chain = [by_sol[sol] for sol in rover_inputs.OPTION_SOLS["B"]]
    assert chain[0]["fromRMC"] == "25_446"
    assert chain[-1]["toRMC"] == "26_1222"
    assert "26_1004" in {seg["toRMC"] for seg in chain}
    for previous, current in itertools.pairwise(chain):
        assert previous["toRMC"] == current["fromRMC"]
