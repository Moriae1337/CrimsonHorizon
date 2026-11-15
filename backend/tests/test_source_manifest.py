"""Checks for the Hawksbill Gap source manifest (CH26-011)."""

import json
import math
from pathlib import Path

import pytest

MANIFEST = (
    Path(__file__).resolve().parents[1] / "data" / "hawksbill_gap" / "manifest.json"
)


@pytest.fixture(scope="module")
def manifest() -> dict:
    return json.loads(MANIFEST.read_text(encoding="utf-8"))


def test_extent_matches_scope(manifest: dict) -> None:
    extent = manifest["extent"]
    assert extent["convention"] == "geographic"
    assert (extent["lon_min"], extent["lon_max"]) == (77.402, 77.41)
    assert (extent["lat_min"], extent["lat_max"]) == (18.455, 18.463)


def test_geographic_convention_is_planetocentric_east(manifest: dict) -> None:
    geo = manifest["conventions"]["geographic"]
    assert geo["latitude_type"] == "planetocentric"
    assert geo["longitude_direction"] == "positive_east"
    assert geo["axis_order"] == ["lon", "lat"]
    assert geo["reference_sphere_radius_m"] == 3396190


def test_projected_scale_matches_sphere(manifest: dict) -> None:
    proj = manifest["conventions"]["projected"]
    expected = proj["sphere_radius_m"] * math.pi / 180
    assert proj["meters_per_degree"] == pytest.approx(expected, abs=1e-3)


def test_every_input_names_its_source_and_convention(manifest: dict) -> None:
    ids = [item["id"] for item in manifest["inputs"]]
    assert len(ids) == len(set(ids))
    for item in manifest["inputs"]:
        for field in ("role", "product_id", "url", "credit", "license", "convention"):
            assert item.get(field), f"{item['id']} is missing {field}"
        assert item["url"].startswith("https://")
        assert item["convention"].get("crs"), f"{item['id']} has no CRS entry"


def test_primary_window_covers_extent(manifest: dict) -> None:
    proj = manifest["conventions"]["projected"]
    dtm = next(item for item in manifest["inputs"] if item["id"] == "dtm-primary")
    left, _, _, top = dtm["convention"]["bounds_m"]
    size = dtm["convention"]["pixel_size_m"]
    win = dtm["window"]
    m_per_deg = proj["meters_per_degree"]

    lon_min = (left + win["col_off"] * size) / m_per_deg
    lon_max = (left + (win["col_off"] + win["width"]) * size) / m_per_deg
    lat_max = (top - win["row_off"] * size) / m_per_deg
    lat_min = (top - (win["row_off"] + win["height"]) * size) / m_per_deg

    extent = manifest["extent"]
    tolerance = 0.0005  # about 30 m
    assert lon_min == pytest.approx(extent["lon_min"], abs=tolerance)
    assert lon_max == pytest.approx(extent["lon_max"], abs=tolerance)
    assert lat_min == pytest.approx(extent["lat_min"], abs=tolerance)
    assert lat_max == pytest.approx(extent["lat_max"], abs=tolerance)


def test_rover_inputs_are_pinned_by_hash(manifest: dict) -> None:
    for input_id in ("m20-waypoints", "m20-traverse"):
        item = next(i for i in manifest["inputs"] if i["id"] == input_id)
        assert len(item["sha256"]) == 64
        assert item["convention"]["coordinate_order"][:2] == ["lon", "lat"]
