"""Tests for the precomputed slope overlay endpoint (CH26-034 #52).

Verifies the FastAPI endpoint GET /api/scenario/{scenario_id}/slope,
its route aliases, Cache-Control headers, 404 handling for unknown scenarios
or missing overlay artifacts, 503 handling for corrupted files, and
the returned metadata, resolution, bounds, statistics, and 2D grid.
"""

from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.scenario import (
    SCENARIO_PATHS,
    SLOPE_PATHS,
    load_slope_overlay,
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def _clear_cache():
    """Ensure cached slope documents do not leak across test monkeypatching."""
    load_slope_overlay.cache_clear()
    yield
    load_slope_overlay.cache_clear()


def test_get_slope_overlay_success() -> None:
    """Verify GET /api/scenario/hawksbill-gap/slope returns 200 with required structure."""
    response = client.get("/api/scenario/hawksbill-gap/slope")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")

    # Cache-Control header check
    cache_control = response.headers.get("cache-control", "")
    assert "public" in cache_control
    assert "max-age=" in cache_control

    data: dict[str, Any] = response.json()

    # Scenario identifier and metadata
    assert data["scenario_id"] == "hawksbill-gap"
    assert data["input_id"] == "dtm-primary"
    assert data["method"] == "horn"
    assert "Horn 3x3" in data["kernel"]
    assert "crs_wkt" in data

    # Grid dimensions and 1.0 m resolution
    grid = data["grid"]
    assert grid["resolution_m"] == 1.0
    assert grid["cell_size_m"] == 1.0
    assert grid["width"] == 474
    assert grid["height"] == 474
    assert grid["shape"] == [474, 474]

    # Coordinate and metric bounds
    bounds_m = data["bounds_m"]
    assert bounds_m["left"] == 4587980.0
    assert bounds_m["right"] == 4588454.0
    assert bounds_m["top"] == 1094389.0
    assert bounds_m["bottom"] == 1093915.0

    bounds_deg = data["bounds_deg"]
    assert 77.40 <= bounds_deg["lon_min"] < bounds_deg["lon_max"] <= 77.42
    assert 18.45 <= bounds_deg["lat_min"] < bounds_deg["lat_max"] <= 18.47

    # Units and cell counts
    assert data["units"] == "degrees"
    assert data["cells"] == 474 * 474
    assert data["valid_cells"] > 220000
    assert data["nodata_cells"] == data["cells"] - data["valid_cells"]

    # Slope degree statistics (min, max, mean, median, p95)
    stats = data["slope_degrees"]
    assert 0.0 <= stats["min"] <= 1.0
    assert 40.0 <= stats["max"] <= 90.0
    assert 5.0 <= stats["mean"] <= 15.0
    assert 5.0 <= stats["median"] <= 12.0
    assert 15.0 <= stats["p95"] <= 35.0
    assert stats["min"] <= stats["median"] <= stats["p95"] <= stats["max"]

    # 2D values grid
    values = data["values"]
    assert len(values) == 474
    assert all(len(row) == 474 for row in values)

    # 3x3 kernel border masking: outer cells must be null
    assert all(v is None for v in values[0])
    assert all(v is None for v in values[-1])
    assert all(row[0] is None for row in values)
    assert all(row[-1] is None for row in values)

    # Interior cells must contain valid slope numbers
    interior_sample = values[200][200]
    assert isinstance(interior_sample, float)
    assert 0.0 <= interior_sample <= 90.0


def test_get_slope_overlay_aliases() -> None:
    """Verify route aliases serve the same payload."""
    resp_primary = client.get("/api/scenario/hawksbill-gap/slope")
    resp_alias1 = client.get("/scenarios/hawksbill-gap/slope")
    resp_alias2 = client.get("/api/scenarios/hawksbill-gap/slope")

    assert resp_primary.status_code == 200
    assert resp_alias1.status_code == 200
    assert resp_alias2.status_code == 200

    assert resp_primary.json() == resp_alias1.json()
    assert resp_primary.json() == resp_alias2.json()

    assert resp_alias1.headers.get("cache-control") == resp_primary.headers.get(
        "cache-control"
    )


def test_unknown_scenario_returns_404() -> None:
    """Verify an unknown scenario returns 404 Scenario not found."""
    response = client.get("/api/scenario/olympus-mons/slope")
    assert response.status_code == 404
    assert response.json() == {"detail": "Scenario not found"}

    response_alias = client.get("/scenarios/olympus-mons/slope")
    assert response_alias.status_code == 404
    assert response_alias.json() == {"detail": "Scenario not found"}


def test_missing_overlay_for_known_scenario_returns_404(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify a known scenario without a slope overlay file returns 404 Slope overlay not found."""
    # Scenario exists in SCENARIO_PATHS but not in SLOPE_PATHS
    monkeypatch.setitem(
        SCENARIO_PATHS, "synthetic-scenario", Path("/fake/path/scenario.json")
    )
    response = client.get("/api/scenario/synthetic-scenario/slope")
    assert response.status_code == 404
    assert response.json() == {"detail": "Slope overlay not found"}


def test_missing_overlay_file_on_disk_returns_404(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verify that if the overlay JSON file is missing from disk, a 404 is returned."""
    missing_path = tmp_path / "nonexistent_slope_overlay.json"
    monkeypatch.setitem(SLOPE_PATHS, "hawksbill-gap", missing_path)

    response = client.get("/api/scenario/hawksbill-gap/slope")
    assert response.status_code == 404
    assert response.json() == {"detail": "Slope overlay not found"}


def test_malformed_overlay_file_returns_503(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verify that a malformed JSON overlay file returns 503."""
    bad_json_path = tmp_path / "corrupt_slope_overlay.json"
    bad_json_path.write_text("{invalid json", encoding="utf-8")
    monkeypatch.setitem(SLOPE_PATHS, "hawksbill-gap", bad_json_path)

    response = client.get("/api/scenario/hawksbill-gap/slope")
    assert response.status_code == 503
    assert response.json() == {"detail": "Slope overlay temporarily unavailable"}


def test_missing_required_keys_returns_503(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verify that an overlay document missing required structure returns 503."""
    incomplete_path = tmp_path / "incomplete_slope_overlay.json"
    incomplete_path.write_text('{"input_id": "test"}', encoding="utf-8")
    monkeypatch.setitem(SLOPE_PATHS, "hawksbill-gap", incomplete_path)

    response = client.get("/api/scenario/hawksbill-gap/slope")
    assert response.status_code == 503
    assert response.json() == {"detail": "Slope overlay temporarily unavailable"}


def test_openapi_schema_contains_slope_routes() -> None:
    """Verify that FastAPI OpenAPI documentation includes the slope endpoint."""
    openapi = app.openapi()
    paths = openapi.get("paths", {})
    assert "/api/scenario/{scenario_id}/slope" in paths
    assert "/scenarios/{scenario_id}/slope" in paths

    slope_path = paths["/api/scenario/{scenario_id}/slope"]
    assert "get" in slope_path
    op = slope_path["get"]
    assert "parameters" in op
    param_names = [p["name"] for p in op["parameters"]]
    assert "scenario_id" in param_names


def test_load_slope_overlay_unit() -> None:
    """Verify load_slope_overlay directly: return dict, raise KeyError, and cache results."""
    doc1 = load_slope_overlay("hawksbill-gap")
    assert isinstance(doc1, dict)
    assert doc1["scenario_id"] == "hawksbill-gap"
    assert doc1["grid"]["resolution_m"] == 1.0

    # Test cache returns same instance
    doc2 = load_slope_overlay("hawksbill-gap")
    assert doc1 is doc2

    with pytest.raises(KeyError):
        load_slope_overlay("nonexistent-scenario")
