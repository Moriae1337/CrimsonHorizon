"""Unit tests for Skinner Ridge line-of-sight visibility algorithm (CH26-030).

Tests:
1. Pure geometric calculations: bearing, ray interpolation, clearance.
2. Synthetic controlled fixtures:
   - Flat terrain visibility (observer eye at 1.5 m).
   - Ridge barrier obstruction matching analytical geometry.
   - Target elevation sensitivity (raising target increases clearance proportionally).
3. Verification of the committed Skinner Ridge line-of-sight record
   (backend/data/hawksbill_gap/skinner_line_of_sight.json).
"""

import json
from pathlib import Path

import pytest

from prep import line_of_sight


@pytest.fixture(scope="module")
def record() -> dict:
    path = (
        Path(__file__).resolve().parents[1]
        / "data"
        / "hawksbill_gap"
        / "skinner_line_of_sight.json"
    )
    assert path.exists(), f"Evaluation record missing at {path}"
    return json.loads(path.read_text(encoding="utf-8"))


# --- Geometry and Sightline Formulas ---


def test_bearing_cardinal_directions() -> None:
    # Due North: same lon, higher lat
    assert line_of_sight.bearing_deg([0.0, 0.0], [0.0, 1.0]) == pytest.approx(
        0.0, abs=1e-5
    )
    # Due East: higher lon, same lat
    assert line_of_sight.bearing_deg([0.0, 0.0], [1.0, 0.0]) == pytest.approx(
        90.0, abs=1e-5
    )
    # Due South: same lon, lower lat
    assert line_of_sight.bearing_deg([0.0, 1.0], [0.0, 0.0]) == pytest.approx(
        180.0, abs=1e-5
    )
    # Due West: lower lon, same lat
    assert line_of_sight.bearing_deg([1.0, 0.0], [0.0, 0.0]) == pytest.approx(
        270.0, abs=1e-5
    )


def test_sightline_elevation_interpolation() -> None:
    eye_z = -2521.5
    target_top_z = -2520.0
    # At observer (fraction 0.0)
    assert line_of_sight.sightline_elevation(eye_z, target_top_z, 0.0) == pytest.approx(
        eye_z
    )
    # At target (fraction 1.0)
    assert line_of_sight.sightline_elevation(eye_z, target_top_z, 1.0) == pytest.approx(
        target_top_z
    )
    # At midpoint (fraction 0.5)
    mid_expected = (eye_z + target_top_z) / 2.0
    assert line_of_sight.sightline_elevation(eye_z, target_top_z, 0.5) == pytest.approx(
        mid_expected
    )


def test_profile_clearance_sign() -> None:
    # Sightline 1.0 m above ground -> positive clearance (clear)
    assert line_of_sight.profile_clearance(
        terrain_elev=10.0, sightline_elev=11.0
    ) == pytest.approx(1.0)
    # Sightline matches terrain -> 0 clearance (grazing)
    assert line_of_sight.profile_clearance(
        terrain_elev=10.0, sightline_elev=10.0
    ) == pytest.approx(0.0)
    # Sightline 0.5 m below ground -> negative clearance (obstructed)
    assert line_of_sight.profile_clearance(
        terrain_elev=10.0, sightline_elev=9.5
    ) == pytest.approx(-0.5)


# --- Synthetic Controlled Fixtures ---


def test_flat_terrain_is_always_clear() -> None:
    """Over flat terrain (elevation 0.0 m), a 1.5 m observer eye has positive clearance to a ground target."""
    radius_m = 3396190.0
    obs_coords = [77.405, 18.458]
    target_coords = [77.406, 18.459]

    # Uniform flat terrain sampler
    flat_sampler = lambda lon, lat: 0.0

    eval_result = line_of_sight.evaluate_single_height(
        sample_elevation=flat_sampler,
        obs_coords=obs_coords,
        target_coords=target_coords,
        radius_m=radius_m,
        obs_ground_elev=0.0,
        target_ground_elev=0.0,
        eye_height_m=1.5,
        target_height_m=0.0,
        num_samples=50,
    )

    assert eval_result["is_obstructed"] is False
    assert eval_result["status"] == "clear"
    assert eval_result["obstruction_m"] == 0.0
    # Across all intermediate points, sightline is strictly above ground (clearance > 0)
    assert eval_result["min_clearance_m"] > 0.0


def test_analytical_ridge_obstruction_and_clearance() -> None:
    """A synthetic ridge at fraction 0.8 with elevation 0.5 m blocks ground target but clears +0.5 m target.

    Geometry:
    Observer at x=0, ground z=0, eye z=1.5 m.
    Target at x=D, ground z=0.
    At fraction t=0.8:
    - h_target = 0.0: sightline z = 1.5 + 0.8*(0 - 1.5) = 0.3 m.
      Ridge z = 0.5 m -> clearance = 0.3 - 0.5 = -0.2 m (obstructed by 0.2 m).
    - h_target = 0.5: sightline z = 1.5 + 0.8*(0.5 - 1.5) = 0.7 m.
      Ridge z = 0.5 m -> clearance = 0.7 - 0.5 = +0.2 m (clear with 0.2 m).
    """
    radius_m = 3396190.0
    obs_coords = [0.0, 0.0]
    target_coords = [0.001, 0.0]

    def ridge_sampler(lon: float, lat: float) -> float:
        # Peak obstacle at fraction 0.80
        frac = lon / 0.001
        if abs(frac - 0.80) < 1e-4:
            return 0.5
        return 0.0

    # Test ground level (0.0 m)
    ground_eval = line_of_sight.evaluate_single_height(
        sample_elevation=ridge_sampler,
        obs_coords=obs_coords,
        target_coords=target_coords,
        radius_m=radius_m,
        obs_ground_elev=0.0,
        target_ground_elev=0.0,
        eye_height_m=1.5,
        target_height_m=0.0,
        num_samples=100,
    )
    assert ground_eval["is_obstructed"] is True
    assert ground_eval["status"] == "obstructed"
    assert ground_eval["min_clearance_m"] == pytest.approx(-0.2, abs=0.01)
    assert ground_eval["obstruction_m"] == pytest.approx(0.2, abs=0.01)

    # Test raised target (+0.5 m)
    raised_eval = line_of_sight.evaluate_single_height(
        sample_elevation=ridge_sampler,
        obs_coords=obs_coords,
        target_coords=target_coords,
        radius_m=radius_m,
        obs_ground_elev=0.0,
        target_ground_elev=0.0,
        eye_height_m=1.5,
        target_height_m=0.5,
        num_samples=100,
    )
    assert raised_eval["is_obstructed"] is False
    assert raised_eval["status"] == "clear"
    assert raised_eval["min_clearance_m"] == pytest.approx(0.2, abs=0.01)
    assert raised_eval["obstruction_m"] == 0.0


def test_target_height_proportionality_rule() -> None:
    """Raising the target by delta_h increases clearance at distance fraction t by exactly t * delta_h."""
    eye_z = 10.0
    target_ground_z = 5.0
    fraction = 0.85
    delta_h = 0.5

    z_los_0 = line_of_sight.sightline_elevation(eye_z, target_ground_z, fraction)
    z_los_raised = line_of_sight.sightline_elevation(
        eye_z, target_ground_z + delta_h, fraction
    )

    assert z_los_raised - z_los_0 == pytest.approx(fraction * delta_h)


# --- Verification of Committed Evaluation Record ---


def test_record_structure(record: dict) -> None:
    assert record["scenario_id"] == "hawksbill-gap"
    assert record["stop_id"] == "skinner-ridge"
    assert "target" in record
    assert "standpoints" in record
    assert "summary_table" in record
    assert "conclusion" in record
    assert "assumptions" in record
    assert any("1.5 m" in a for a in record["assumptions"])


def test_record_target_coordinates(record: dict) -> None:
    tgt = record["target"]
    assert tgt["coordinates"] == [77.40617078, 18.458931]
    assert tgt["sample_name"] == "Swift Run"
    assert tgt["coring_sol"] == 490


def test_illustrative_standpoint_obstruction_and_clearance(record: dict) -> None:
    """Confirms the locked scope values: ~0.15 m obstruction at ground level and ~0.28 m clearance at +0.5 m."""
    standpoint = record["standpoints"]["illustrative_standoff"]
    assert standpoint["distance_to_target_m"] == pytest.approx(21.2, abs=1.0)
    assert standpoint["eye_height_m"] == 1.5

    # Ground level: confirmed obstruction ~0.15 m
    h0 = standpoint["evaluations"]["height_0_0m"]
    assert h0["status"] == "obstructed"
    assert h0["is_obstructed"] is True
    assert h0["obstruction_m"] == pytest.approx(0.15, abs=0.03)

    # Raised +0.5 m: confirmed clearance ~0.28 m
    h5 = standpoint["evaluations"]["height_0_5m"]
    assert h5["status"] == "clear"
    assert h5["is_obstructed"] is False
    assert h5["min_clearance_m"] == pytest.approx(0.28, abs=0.03)

    # Raised +1.0 m: confirmed clearance > 0.6 m
    h10 = standpoint["evaluations"]["height_1_0m"]
    assert h10["status"] == "clear"
    assert h10["is_obstructed"] is False
    assert h10["min_clearance_m"] > 0.6


def test_option_a_terminus_obstruction_and_clearance(record: dict) -> None:
    """Confirms obstruction for the exact Option A traverse vertex at ~21.8 m distance."""
    terminus = record["standpoints"]["option_a_terminus"]
    assert terminus["distance_to_target_m"] == pytest.approx(21.77, abs=0.1)
    assert terminus["eye_height_m"] == 1.5

    h0 = terminus["evaluations"]["height_0_0m"]
    assert h0["status"] == "obstructed"
    assert h0["is_obstructed"] is True
    assert h0["obstruction_m"] > 0.05

    h5 = terminus["evaluations"]["height_0_5m"]
    assert h5["status"] == "clear"
    assert h5["is_obstructed"] is False
    assert h5["min_clearance_m"] > 0.3


def test_conclusion_states_contact_unresolved(record: dict) -> None:
    conclusion = record["conclusion"].lower()
    assert "obscured" in conclusion or "unresolved" in conclusion
    assert "option a" in conclusion
    assert "option b" in conclusion
