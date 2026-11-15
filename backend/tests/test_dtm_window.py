"""Tests for terrain crop, window extents, and NoData masking behavior (CH26-073).

Verifies:
1. DTM window coordinates and extent (zero-based col 10614, row 12229, 474x474 cells).
2. NoData masking behavior: values marked as NoData (e.g. -9999.0, sentinel, NaN, inf)
   remain invalid and are masked out without being falsely treated as 0 or valid elevations.
3. Edge-of-grid and out-of-bounds queries: boundary sampling behaves predictably without
   crashing (no IndexError) or silently producing false zeroes.
4. Bilinear interpolation behavior across valid cells vs cells bordering NoData.
"""

import json
import math
from typing import Any

import pytest

from prep import dtm_window, local_grid
from prep.common import SCENARIO_DIR, load_manifest, manifest_input

PRIMARY_NODATA = -3.4028226550889045e38
EXPECTED_COL_OFF = 10614
EXPECTED_ROW_OFF = 12229
EXPECTED_WIDTH = 474
EXPECTED_HEIGHT = 474
EXPECTED_CELLS = 224_676  # 474 * 474


@pytest.fixture(scope="module")
def manifest() -> dict[str, Any]:
    return load_manifest()


@pytest.fixture(scope="module")
def dtm_primary_input(manifest: dict[str, Any]) -> dict[str, Any]:
    return manifest_input(manifest, "dtm-primary")


@pytest.fixture(scope="module")
def primary_window_record() -> dict[str, Any]:
    record_path = SCENARIO_DIR / "dtm_primary_window.json"
    return json.loads(record_path.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def local_grid_record() -> dict[str, Any]:
    record_path = SCENARIO_DIR / "dtm_local.json"
    return json.loads(record_path.read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# 1. Window coordinates and extent verification
# ---------------------------------------------------------------------------


def test_window_coordinates_and_dimensions(dtm_primary_input: dict[str, Any]) -> None:
    """Verify window offsets (col 10614, row 12229) and extent (474x474 cells)."""
    win = dtm_primary_input["window"]
    assert win["col_off"] == EXPECTED_COL_OFF
    assert win["row_off"] == EXPECTED_ROW_OFF
    assert win["width"] == EXPECTED_WIDTH
    assert win["height"] == EXPECTED_HEIGHT
    assert win["width"] * win["height"] == EXPECTED_CELLS
    assert win["width"] * win["height"] == dtm_window.EXPECTED_VALID_CELLS


def test_window_bounds_projected_coordinates(
    dtm_primary_input: dict[str, Any],
) -> None:
    """Verify projected bounding box matches the zero-based window calculation."""
    conv = dtm_primary_input["convention"]
    win = dtm_primary_input["window"]
    bounds_m = conv["bounds_m"]
    pixel_size = conv["pixel_size_m"]

    computed_bounds = dtm_window.window_bounds(bounds_m, pixel_size, win)

    # Expected values derived from outer bounds [4577366.0, 1085130.0, 4598766.0, 1106618.0]
    expected_left = bounds_m[0] + EXPECTED_COL_OFF * pixel_size  # 4587980.0
    expected_right = expected_left + EXPECTED_WIDTH * pixel_size  # 4588454.0
    expected_top = bounds_m[3] - EXPECTED_ROW_OFF * pixel_size  # 1094389.0
    expected_bottom = expected_top - EXPECTED_HEIGHT * pixel_size  # 1093915.0

    assert computed_bounds["left"] == pytest.approx(expected_left)
    assert computed_bounds["right"] == pytest.approx(expected_right)
    assert computed_bounds["top"] == pytest.approx(expected_top)
    assert computed_bounds["bottom"] == pytest.approx(expected_bottom)

    # Check physical dimensions
    width_m = computed_bounds["right"] - computed_bounds["left"]
    height_m = computed_bounds["top"] - computed_bounds["bottom"]
    assert width_m == pytest.approx(474.0)
    assert height_m == pytest.approx(474.0)
    assert computed_bounds["left"] < computed_bounds["right"]
    assert computed_bounds["bottom"] < computed_bounds["top"]


def test_window_bounds_zero_offset_behavior() -> None:
    """Verify window_bounds behaves correctly with zero offsets and non-unit pixel size."""
    outer = [1000.0, 2000.0, 5000.0, 6000.0]
    pixel_size = 2.0
    window = {"col_off": 0, "row_off": 0, "width": 10, "height": 20}

    bounds = dtm_window.window_bounds(outer, pixel_size, window)
    assert bounds["left"] == 1000.0
    assert bounds["right"] == 1000.0 + 10 * 2.0  # 1020.0
    assert bounds["top"] == 6000.0
    assert bounds["bottom"] == 6000.0 - 20 * 2.0  # 5960.0


def test_window_degrees_conversion_matches_extent(manifest: dict[str, Any]) -> None:
    """Verify degree conversion aligns with the scenario's geographic extent."""
    dtm = manifest_input(manifest, "dtm-primary")
    m_per_deg = manifest["conventions"]["projected"]["meters_per_degree"]
    bounds = dtm_window.window_bounds(
        dtm["convention"]["bounds_m"], dtm["convention"]["pixel_size_m"], dtm["window"]
    )
    degrees = dtm_window.to_degrees(bounds, m_per_deg)

    extent = manifest["extent"]
    assert degrees["lon_min"] == pytest.approx(extent["lon_min"], abs=0.0005)
    assert degrees["lon_max"] == pytest.approx(extent["lon_max"], abs=0.0005)
    assert degrees["lat_min"] == pytest.approx(extent["lat_min"], abs=0.0005)
    assert degrees["lat_max"] == pytest.approx(extent["lat_max"], abs=0.0005)


def test_primary_window_record_consistency(
    primary_window_record: dict[str, Any],
) -> None:
    """Verify the committed crop record reflects the exact window and cell count."""
    assert primary_window_record["window"]["col_off"] == EXPECTED_COL_OFF
    assert primary_window_record["window"]["row_off"] == EXPECTED_ROW_OFF
    assert primary_window_record["window"]["width"] == EXPECTED_WIDTH
    assert primary_window_record["window"]["height"] == EXPECTED_HEIGHT
    assert primary_window_record["cells"] == EXPECTED_CELLS
    assert primary_window_record["valid_cells"] == EXPECTED_CELLS
    assert primary_window_record["expected_valid_cells"] == EXPECTED_CELLS
    assert primary_window_record["findings"] == []
    assert (
        primary_window_record["nodata"] == pytest.approx(PRIMARY_NODATA)
        or primary_window_record["nodata"] == PRIMARY_NODATA
    )


# ---------------------------------------------------------------------------
# 2. NoData masking behavior
# ---------------------------------------------------------------------------


def is_valid_dtm_cell(value: float | None, nodata: float) -> bool:
    """Mirror DTM valid mask condition: value != nodata and isfinite."""
    if value is None:
        return False
    if not math.isfinite(value):
        return False
    return not math.isclose(value, nodata, rel_tol=1e-6)


@pytest.mark.parametrize(
    "nodata_val",
    [-9999.0, -99999.0, PRIMARY_NODATA, -32768.0],
)
def test_nodata_sentinels_masked_out(nodata_val: float) -> None:
    """Values matching NoData sentinels remain invalid and are masked out."""
    assert not is_valid_dtm_cell(nodata_val, nodata_val)
    # Valid elevations should remain valid
    assert is_valid_dtm_cell(-2545.2, nodata_val)
    assert is_valid_dtm_cell(-2513.1, nodata_val)
    assert is_valid_dtm_cell(0.0, nodata_val)
    assert is_valid_dtm_cell(100.5, nodata_val)


@pytest.mark.parametrize(
    "invalid_val",
    [float("nan"), float("inf"), float("-inf"), None],
)
def test_non_finite_values_masked_out(invalid_val: float | None) -> None:
    """NaN and infinities remain invalid regardless of the sentinel used."""
    for sentinel in (-9999.0, PRIMARY_NODATA):
        assert not is_valid_dtm_cell(invalid_val, sentinel)


def test_nan_not_fooled_by_equality_check() -> None:
    """Demonstrate why isfinite is necessary: NaN != nodata evaluates to True in IEEE 754."""
    nan_val = float("nan")
    nodata = -9999.0
    # Naive check without isfinite fails to mask NaN:
    assert nan_val != nodata
    # Compound check correctly masks NaN:
    valid = (nan_val != nodata) and math.isfinite(nan_val)
    assert not valid


def test_nodata_is_never_treated_as_zero() -> None:
    """NoData cells must not silently convert to elevation 0.0."""
    nodata = -9999.0
    raw_cells = [-2500.0, nodata, -2490.0, float("nan")]
    valid_mask = [is_valid_dtm_cell(v, nodata) for v in raw_cells]
    assert valid_mask == [True, False, True, False]

    # Masked cells must not produce 0.0 as elevation
    cleaned = [v if is_valid_dtm_cell(v, nodata) else None for v in raw_cells]
    assert cleaned == [-2500.0, None, -2490.0, None]
    assert 0.0 not in [v for v in cleaned if v is not None]


def test_local_grid_record_mask_check(local_grid_record: dict[str, Any]) -> None:
    """Verify that in the processed local grid record, the synthetic NoData hole check passed."""
    mask_check = local_grid_record["mask_check"]
    assert mask_check["cells_checked"] > 0
    assert mask_check["filled_cells"] == 0, "NoData hole cells must not be filled"
    assert mask_check["zero_cells"] == 0, "No output cells should be false zeroes"


def test_control_findings_flags_filled_hole_and_false_zeroes() -> None:
    """Verify that control_findings flags filled NoData cells and false zeroes."""
    good_sample = {
        "id": "test-pt",
        "round_trip_same_cell": True,
        "local_value_m": -2500.0,
        "local_minus_source_m": 0.0,
    }
    clean_mask = {"cells_checked": 50, "filled_cells": 0, "zero_cells": 0}
    assert local_grid.control_findings([good_sample], clean_mask) == []

    # Flag if cells inside NoData hole received values
    leaked_mask = {"cells_checked": 50, "filled_cells": 5, "zero_cells": 0}
    findings = local_grid.control_findings([good_sample], leaked_mask)
    assert any("inside the NoData hole got values" in f for f in findings)

    # Flag if output cells became exactly 0
    zeroed_mask = {"cells_checked": 50, "filled_cells": 0, "zero_cells": 3}
    findings = local_grid.control_findings([good_sample], zeroed_mask)
    assert any("output cells are exactly 0" in f for f in findings)


def test_findings_detects_nodata_mismatch(manifest: dict[str, Any]) -> None:
    """Verify dtm_window.findings flags mismatched or missing NoData header value."""
    conv = manifest_input(manifest, "dtm-primary")["convention"]
    header = {
        "raster_size": conv["raster_size"],
        "bounds_m": conv["bounds_m"],
        "pixel_size_m": conv["pixel_size_m"],
        "nodata": conv["nodata"],
    }
    assert dtm_window.findings(dtm_window.EXPECTED_VALID_CELLS, header, conv) == []

    # Mismatched NoData value
    mismatched = {**header, "nodata": -9999.0}
    notes = dtm_window.findings(dtm_window.EXPECTED_VALID_CELLS, mismatched, conv)
    assert any("nodata" in n for n in notes)

    # None NoData value
    none_nodata = {**header, "nodata": None}
    notes = dtm_window.findings(dtm_window.EXPECTED_VALID_CELLS, none_nodata, conv)
    assert any("nodata" in n for n in notes)


# ---------------------------------------------------------------------------
# 3. Edge-of-grid and out-of-bounds queries
# ---------------------------------------------------------------------------


@pytest.fixture
def sample_grid() -> list[list[float]]:
    """A 3x3 elevation grid for boundary testing."""
    return [
        [-2500.0, -2498.0, -2496.0],
        [-2495.0, -2493.0, -2491.0],
        [-2490.0, -2488.0, -2486.0],
    ]


@pytest.mark.parametrize(
    ("row_f", "col_f"),
    [
        (-10.0, 1.0),
        (1.0, -10.0),
        (-0.1, 1.0),
        (1.0, -0.1),
        (0.0, 0.0),
        (0.49, 1.0),
        (1.0, 0.49),
        (2.5, 1.0),
        (1.0, 2.5),
        (3.0, 1.0),
        (1.0, 3.0),
        (10.0, 10.0),
        (100.0, 1.0),
    ],
)
def test_bilinear_out_of_bounds_returns_none(
    sample_grid: list[list[float]], row_f: float, col_f: float
) -> None:
    """Out-of-bounds sampling returns None without crashing or silently producing 0.0."""
    result = local_grid.bilinear(sample_grid, PRIMARY_NODATA, row_f, col_f)
    assert result is None
    assert result != 0.0


def test_bilinear_boundary_valid_limits(sample_grid: list[list[float]]) -> None:
    """Verify exact valid fractional coordinate limits for bilinear sampling.

    For a 3x3 grid (indices 0, 1, 2):
    r = row_f - 0.5, c = col_f - 0.5.
    Requires r0 >= 0 and r0 + 1 < 3  =>  r0 in {0, 1}.
    This means 0.0 <= r < 2.0, so 0.5 <= row_f < 2.5.
    """
    nodata = PRIMARY_NODATA

    # Just below lower bound: row_f = 0.499 => r = -0.001 => r0 = -1 => None
    assert local_grid.bilinear(sample_grid, nodata, 0.499, 1.0) is None

    # Exactly at lower bound: row_f = 0.5 => r = 0.0 => r0 = 0 => valid
    res_low = local_grid.bilinear(sample_grid, nodata, 0.5, 1.0)
    assert res_low is not None

    # Just below upper bound: row_f = 2.499 => r = 1.999 => r0 = 1 => r0 + 1 = 2 < 3 => valid
    res_high = local_grid.bilinear(sample_grid, nodata, 2.499, 1.0)
    assert res_high is not None

    # Exactly at upper bound: row_f = 2.5 => r = 2.0 => r0 = 2 => r0 + 1 = 3 >= 3 => None
    assert local_grid.bilinear(sample_grid, nodata, 2.5, 1.0) is None


def test_bilinear_single_cell_grid_returns_none() -> None:
    """A 1x1 grid cannot support bilinear interpolation and must safely return None."""
    grid_1x1 = [[-2500.0]]
    assert local_grid.bilinear(grid_1x1, PRIMARY_NODATA, 0.5, 0.5) is None


def test_cell_of_and_cell_center_consistency() -> None:
    """Verify cell_of and cell_center north-up coordinate transforms at boundary coordinates."""
    transform = (1.0, 0.0, 0.0, 0.0, -1.0, 10.0)

    # Point at (0.5, 9.5) is center of cell (0, 0)
    assert local_grid.cell_center(transform, 0, 0) == (0.5, 9.5)
    assert local_grid.cell_of(transform, 0.5, 9.5) == (0, 0)

    # Boundary coordinates floor properly without throwing
    assert local_grid.cell_of(transform, 0.0, 10.0) == (0, 0)
    assert local_grid.cell_of(transform, -0.1, 10.1) == (-1, -1)
    assert local_grid.cell_of(transform, 100.0, -100.0) == (110, 100)


# ---------------------------------------------------------------------------
# 4. Bilinear interpolation across valid cells vs cells bordering NoData
# ---------------------------------------------------------------------------


@pytest.fixture
def ramp_grid() -> list[list[float]]:
    """Known planar elevation ramp: z = 100 + 10 * row + 2 * col.

    Row 0: [100.0, 102.0, 104.0]
    Row 1: [110.0, 112.0, 114.0]
    Row 2: [120.0, 122.0, 124.0]
    """
    return [[100.0 + 10.0 * r + 2.0 * c for c in range(3)] for r in range(3)]


def test_bilinear_exact_interpolation_across_valid_cells(
    ramp_grid: list[list[float]],
) -> None:
    """Verify exact numerical interpolation across all-valid cell neighborhoods."""
    nodata = -9999.0

    # At cell center (row_f=1.5, col_f=1.5), corresponds to (r=1.0, c=1.0) -> cell (1, 1)
    val = local_grid.bilinear(ramp_grid, nodata, 1.5, 1.5)
    assert val == pytest.approx(112.0)

    # At midpoint between cell (0,0) and cell (1,1) -> row_f=1.0, col_f=1.0
    # r0=0, c0=0, dr=0.5, dc=0.5 -> average of (100, 102, 110, 112) = 106.0
    val = local_grid.bilinear(ramp_grid, nodata, 1.0, 1.0)
    assert val == pytest.approx(106.0)

    # Off-center: row_f=0.75, col_f=1.25 -> r=0.25, c=0.75, r0=0, c0=0
    # Expected: 100 + 10*0.25 + 2*0.75 = 104.0
    val = local_grid.bilinear(ramp_grid, nodata, 0.75, 1.25)
    assert val == pytest.approx(104.0)


def test_bilinear_bordering_nodata_fails_closed(
    ramp_grid: list[list[float]],
) -> None:
    """When any cell in the 2x2 interpolation window is NoData, sampling returns None.

    Contrast with an adjacent valid window in the same grid.
    """
    nodata = -9999.0
    # Modify cell (0, 2) to be NoData
    holed = [row.copy() for row in ramp_grid]
    holed[0][2] = nodata

    # Window [0..1, 1..2] touches cell (0, 2), so queries in that quad MUST return None
    assert local_grid.bilinear(holed, nodata, 1.0, 2.0) is None
    assert local_grid.bilinear(holed, nodata, 0.75, 1.75) is None
    assert local_grid.bilinear(holed, nodata, 1.2, 1.8) is None

    # In contrast, window [0..1, 0..1] does NOT touch cell (0, 2); all 4 neighbors are valid
    valid_val = local_grid.bilinear(holed, nodata, 1.0, 1.0)
    assert valid_val is not None
    assert valid_val == pytest.approx(106.0)


def test_bilinear_bordering_nan_and_infinities(
    ramp_grid: list[list[float]],
) -> None:
    """When a neighboring cell is NaN or infinity, bilinear sampling returns None."""
    nodata = -9999.0

    # Test NaN neighbor
    nan_grid = [row.copy() for row in ramp_grid]
    nan_grid[1][1] = float("nan")
    assert local_grid.bilinear(nan_grid, nodata, 1.0, 1.0) is None

    # Test +inf neighbor
    inf_grid = [row.copy() for row in ramp_grid]
    inf_grid[1][1] = float("inf")
    assert local_grid.bilinear(inf_grid, nodata, 1.0, 1.0) is None

    # Test -inf neighbor
    neginf_grid = [row.copy() for row in ramp_grid]
    neginf_grid[1][1] = float("-inf")
    assert local_grid.bilinear(neginf_grid, nodata, 1.0, 1.0) is None


def test_bilinear_all_nodata_grid_returns_none() -> None:
    """A grid where all cells are NoData always returns None for any query."""
    nodata = -9999.0
    nodata_grid = [[nodata] * 4 for _ in range(4)]
    for r in (1.0, 1.5, 2.0):
        for c in (1.0, 1.5, 2.0):
            assert local_grid.bilinear(nodata_grid, nodata, r, c) is None
