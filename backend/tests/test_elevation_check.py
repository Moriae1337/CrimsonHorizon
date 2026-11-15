"""Checks for the DTM / rover localization elevation cross-check (CH26-017).

Reads the committed record and waypoint snapshot only; no rasterio.
"""

import json

import pytest

from prep import elevation_check
from prep.common import INPUTS_DIR


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def record() -> dict:
    return load(elevation_check.CHECK_PATH)


def test_positions_are_the_scope_localizations(record):
    waypoints = load(INPUTS_DIR / "rover_waypoints.geojson")["features"]
    expected = elevation_check.select(waypoints, elevation_check.SOL_RANGE)
    assert [p["rmc"] for p in record["points"]] == [p["RMC"] for p in expected]
    assert record["sample_count"] == elevation_check.EXPECTED_COUNT == 25
    assert record["points"][0]["rmc"] == "24_4308"
    assert record["points"][-1]["rmc"] == "26_1222"
    assert record["findings"] == []


def test_residuals_show_a_shared_vertical_reference(record):
    summary = record["residual_m"]
    assert abs(summary["median"]) < 0.05
    assert summary["rms"] < 0.1
    assert all(abs(p["residual_m"]) < 0.5 for p in record["points"])
    # Scope figure, reproduced with nearest-cell sampling.
    assert record["nearest_cell_residual_m"]["median"] == pytest.approx(-0.03)


def test_residual_sign_is_dtm_minus_rover(record):
    for p in record["points"]:
        assert p["residual_m"] == pytest.approx(
            p["dtm_m"] - p["elev_geoid_m"], abs=0.002
        )


def test_elev_geoid_is_areoid_referenced(record):
    for p in record["points"]:
        assert abs(p["radius_check_m"]) <= 0.01
    areoid = record["areoid_above_sphere_m"]
    assert 1600 < areoid["min"] <= areoid["max"] < areoid["min"] + 1


def test_compare_uses_the_given_sampler():
    point = {
        "RMC": "1_0",
        "sol": 1,
        "final": "y",
        "lon": 0.0,
        "lat": 0.0,
        "elev_geoid": -10.0,
        "elev_radii": -20.0,
        "radius": 980.0,
    }
    (row,) = elevation_check.compare([point], lambda lon, lat: -9.5, 1000.0)
    assert row["residual_m"] == 0.5
    assert row["radius_check_m"] == 0.0
    assert row["areoid_above_sphere_m"] == 10.0
    (row,) = elevation_check.compare([point], lambda lon, lat: None, 1000.0)
    assert row["residual_m"] is None
