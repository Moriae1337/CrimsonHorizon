"""Tests for the local surface-slope overlay (CH26-026).

Verifies the slope calculation against analytical planar test fixtures (e.g.
1 m rise per 1 m cell = 45 degrees, 0.2 m rise = ~11.31 degrees), ensures border
cells and cells with missing neighbors are masked out (None), and validates
the precomputed slope_overlay.json artifact.
"""

import json
import math

import pytest

from prep.slope import (
    SLOPE_OVERLAY_JSON,
    calculate_slope,
    slope_to_json_grid,
)

# Analytical Test Fixtures -----------------------------------------------------


def test_analytical_ramp_45_degrees() -> None:
    """1 m rise per 1 m cell along x-axis should yield exactly 45 degrees."""
    cols = 5
    rows = 5
    elev = [[float(c) for c in range(cols)] for _ in range(rows)]

    slope = calculate_slope(elev, cell_size_m=1.0, method="horn")

    # Interior cells must be 45.0 degrees
    for r in range(1, rows - 1):
        for c in range(1, cols - 1):
            assert slope[r][c] == pytest.approx(45.0, abs=1e-6)

    # Border cells must be None
    assert all(slope[0][c] is None for c in range(cols))
    assert all(slope[-1][c] is None for c in range(cols))
    assert all(slope[r][0] is None for r in range(rows))
    assert all(slope[r][-1] is None for r in range(rows))


def test_analytical_ramp_11_31_degrees() -> None:
    """0.2 m rise per 1 m cell should yield arctan(0.2) in degrees (~11.31 degrees)."""
    cols = 6
    rows = 6
    elev = [[0.2 * c for c in range(cols)] for _ in range(rows)]

    slope = calculate_slope(elev, cell_size_m=1.0, method="horn")

    expected_deg = math.degrees(math.atan(0.2))  # ~11.30993247...
    for r in range(1, rows - 1):
        for c in range(1, cols - 1):
            assert slope[r][c] == pytest.approx(expected_deg, abs=1e-6)
    assert round(expected_deg, 2) == 11.31


def test_analytical_ramp_y_direction() -> None:
    """1 m rise per 1 m cell along y-axis should yield 45 degrees."""
    cols = 5
    rows = 5
    elev = [[float(r) for _ in range(cols)] for r in range(rows)]

    slope = calculate_slope(elev, cell_size_m=1.0, method="horn")
    for r in range(1, rows - 1):
        for c in range(1, cols - 1):
            assert slope[r][c] == pytest.approx(45.0, abs=1e-6)


def test_analytical_flat_plane() -> None:
    """Level terrain has 0 slope."""
    elev = [[-2500.0 for _ in range(5)] for _ in range(5)]
    slope = calculate_slope(elev, cell_size_m=1.0)
    for r in range(1, 4):
        for c in range(1, 4):
            assert slope[r][c] == pytest.approx(0.0, abs=1e-6)


def test_analytical_diagonal_ramp() -> None:
    """Ramp inclined along both axes: dz/dx = 0.3, dz/dy = 0.4.

    rise/run = sqrt(0.3^2 + 0.4^2) = 0.5.
    slope = arctan(0.5) in degrees.
    """
    rows, cols = 5, 5
    elev = [[0.3 * c + 0.4 * r for c in range(cols)] for r in range(rows)]

    slope = calculate_slope(elev, cell_size_m=1.0)
    expected_deg = math.degrees(math.atan(0.5))  # ~26.565 degrees
    for r in range(1, 4):
        for c in range(1, 4):
            assert slope[r][c] == pytest.approx(expected_deg, abs=1e-6)


def test_kernel_methods_match_on_linear_surface() -> None:
    """Horn and Zevenbergen-Thorne kernels give identical results on a linear ramp."""
    elev = [[0.2 * c for c in range(7)] for _ in range(7)]

    slope_horn = calculate_slope(elev, cell_size_m=1.0, method="horn")
    slope_zt = calculate_slope(elev, cell_size_m=1.0, method="zevenbergen_thorne")

    for r in range(1, 6):
        for c in range(1, 6):
            assert slope_horn[r][c] == pytest.approx(slope_zt[r][c], abs=1e-6)


def test_custom_cell_size() -> None:
    """Slope calculation accounts for custom grid resolution."""
    elev = [[float(c) for c in range(5)] for _ in range(5)]
    # 1 m rise over 2 m run = 0.5 rise/run -> arctan(0.5)
    slope = calculate_slope(elev, cell_size_m=2.0)
    expected = math.degrees(math.atan(0.5))
    for r in range(1, 4):
        for c in range(1, 4):
            assert slope[r][c] == pytest.approx(expected, abs=1e-6)

    # Anisotropic resolution (dx=1, dy=2)
    slope_aniso = calculate_slope(elev, cell_size_m=(1.0, 2.0))
    # Along x: dz/dx = 1.0, along y: dz/dy = 0.0 -> rise/run = 1.0 -> 45 deg
    for r in range(1, 4):
        for c in range(1, 4):
            assert slope_aniso[r][c] == pytest.approx(45.0, abs=1e-6)


# Boundary Masking and NoData Tests --------------------------------------------


def test_missing_neighbors_propagate_unknown() -> None:
    """Any cell with a missing/NoData neighbor in its 3x3 window stays None."""
    rows, cols = 7, 7
    elev = [[float(c) for c in range(cols)] for _ in range(rows)]

    # Inject a single hole at (3, 3)
    elev[3][3] = None

    slope = calculate_slope(elev, cell_size_m=1.0)

    # The hole and all 8 neighbors surrounding (3, 3) must be None
    for r in range(2, 5):
        for c in range(2, 5):
            assert slope[r][c] is None, (
                f"Expected cell ({r}, {c}) to be None due to hole at (3, 3)"
            )

    # Cells far from the hole (e.g. (1, 1), (5, 5)) must remain valid 45.0 degrees
    assert slope[1][1] == pytest.approx(45.0, abs=1e-6)
    assert slope[5][5] == pytest.approx(45.0, abs=1e-6)


def test_nodata_sentinel_masking() -> None:
    """Explicit sentinel value (e.g. -9999.0) is masked as invalid."""
    rows, cols = 5, 5
    elev = [[float(c) for c in range(cols)] for _ in range(rows)]
    elev[2][2] = -9999.0

    slope = calculate_slope(elev, cell_size_m=1.0, nodata=-9999.0)
    # The cell at (2, 2) and all its neighbors must be None
    for r in range(1, 4):
        for c in range(1, 4):
            assert slope[r][c] is None


def test_invalid_input_exceptions() -> None:
    """Check defensive argument validation."""
    with pytest.raises(ValueError, match="at least 3x3"):
        calculate_slope([[1.0, 2.0], [3.0, 4.0]])

    with pytest.raises(ValueError, match="must be positive"):
        calculate_slope([[1.0] * 3] * 3, cell_size_m=0.0)

    with pytest.raises(ValueError, match="Unknown slope method"):
        calculate_slope([[1.0] * 3] * 3, method="invalid_method")


# JSON Grid Serialization & Artifact Tests -------------------------------------


def test_slope_to_json_grid_rounding_and_nulls() -> None:
    """slope_to_json_grid maps None to None and rounds numbers."""
    arr = [[None, 45.12345], [0.0, float("nan")]]
    grid = slope_to_json_grid(arr, decimals=2)
    assert grid == [[None, 45.12], [0.0, None]]


def test_precomputed_slope_overlay_artifact() -> None:
    """Validate the committed slope_overlay.json schema and sanity checks."""
    assert SLOPE_OVERLAY_JSON.exists(), (
        f"Missing artifact: {SLOPE_OVERLAY_JSON}. Run prep/slope.py to generate."
    )

    data = json.loads(SLOPE_OVERLAY_JSON.read_text(encoding="utf-8"))

    # Metadata checks
    assert data["input_id"] == "dtm-primary"
    assert data["units"] == "degrees"
    assert data["grid"]["width"] == 474
    assert data["grid"]["height"] == 474
    assert data["cells"] == 474 * 474
    assert data["valid_cells"] > 220000
    assert data["nodata_cells"] == data["cells"] - data["valid_cells"]

    # Statistics sanity checks for Jezero Hawksbill Gap
    stats = data["slope_degrees"]
    assert 0.0 <= stats["min"] <= 1.0
    assert 40.0 <= stats["max"] <= 90.0
    assert 5.0 <= stats["mean"] <= 15.0
    assert 5.0 <= stats["median"] <= 12.0
    assert 15.0 <= stats["p95"] <= 35.0

    # Grid dimension check
    values = data["values"]
    assert len(values) == 474
    assert all(len(row) == 474 for row in values)

    # Border cells must be null
    assert all(v is None for v in values[0])
    assert all(v is None for v in values[-1])
    assert all(row[0] is None for row in values)
    assert all(row[-1] is None for row in values)
