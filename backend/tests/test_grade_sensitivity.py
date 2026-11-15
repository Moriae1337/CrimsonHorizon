import math

import pytest

from prep import profiles
from prep.grade_sensitivity import window_metrics


@pytest.mark.parametrize(
    ("row", "missing", "covered", "steepest"),
    [
        ([0, 0, 2, 2, 4, -9999, 12, 12, 12, 12, 12, 12], 1, 6, (0, 2, 45)),
        ([-9999] * 12, 6, 0, None),
    ],
)
def test_window_excludes_intervals_touching_nodata(row, missing, covered, steepest):
    radius_m = 3_396_190.0
    coords = [[math.degrees(x / radius_m), 0] for x in (0.5, 10.5)]
    grid = profiles.Grid([row, row], (1, 0, 0, 0, -1, 1), -9999, profiles.eqc(radius_m))

    result = window_metrics(coords, grid, radius_m, 2.0)

    assert result["interval_m"] == 2.0
    assert result["missing_samples"] == missing
    assert result["covered_outbound_m"] == covered
    assert result["missing_outbound_m"] == 10 - covered
    if steepest is None:
        assert result["steepest"] is None
    else:
        assert result["steepest"] == dict(
            zip(("from_outbound_m", "to_outbound_m", "grade_deg"), steepest)
        )
