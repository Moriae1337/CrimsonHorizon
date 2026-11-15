"""Unit tests for EVA time budget calculations (CH26-101).

Tests:
1. Tobler's hiking function velocity calculations (flat, optimal, uphill, downhill asymmetry).
2. Loaded spacesuit velocity adjustments (2.5 km/h flat baseline scaling).
3. Segment duration and leg walk duration calculations.
4. Budget evaluation indicators (WITHIN_BUDGET vs OVER_BUDGET, margin calculations).
5. Comprehensive validation of the generated eva_budget.json document against
   Hawksbill Gap route metrics (Option A: 258 m, Option B: 345 m, science stops,
   and 30/60/90 minute budget thresholds).
"""

from __future__ import annotations

import json
import math
from typing import Any

import pytest

from prep.eva_budget import (
    DEFAULT_SPACESUIT_FLAT_VELOCITY_KMH,
    DEFAULT_STOP_DURATION_MINUTES,
    OUTPUT_PATH,
    calculate_leg_walk,
    evaluate_budget,
    segment_duration_minutes,
    spacesuit_velocity_kmh,
    tobler_flat_velocity_kmh,
    tobler_velocity_kmh,
)

# --- 1. Tobler velocity pure mathematical tests ---


def test_tobler_velocity_flat_terrain() -> None:
    """At slope S = 0, standard Tobler velocity is 6.0 * exp(-0.175) ~= 5.0367 km/h."""
    v_flat = tobler_velocity_kmh(0.0)
    expected = 6.0 * math.exp(-3.5 * 0.05)
    assert math.isclose(v_flat, expected, rel_tol=1e-6)
    assert math.isclose(v_flat, 5.0367417, rel_tol=1e-5)
    assert math.isclose(tobler_flat_velocity_kmh(), v_flat)


def test_tobler_velocity_optimal_slope() -> None:
    """Maximum velocity of 6.0 km/h occurs at S = -0.05 (-5% downhill grade)."""
    v_opt = tobler_velocity_kmh(-0.05)
    assert math.isclose(v_opt, 6.0, rel_tol=1e-6)

    # Slopes on either side of -0.05 are strictly lower
    assert tobler_velocity_kmh(-0.04) < 6.0
    assert tobler_velocity_kmh(-0.06) < 6.0
    assert tobler_velocity_kmh(0.0) < 6.0


def test_tobler_velocity_slope_asymmetry() -> None:
    """Downhill walking is faster than uphill walking for equal magnitude slopes."""
    # S = +0.10 (10% climb) vs S = -0.10 (10% descent)
    v_uphill = tobler_velocity_kmh(0.10)
    v_downhill = tobler_velocity_kmh(-0.10)
    assert v_downhill > v_uphill

    # Severe slopes reduce speed exponentially
    v_steep_climb = tobler_velocity_kmh(0.25)
    assert v_steep_climb < v_uphill
    assert v_steep_climb < 2.5


def test_tobler_invalid_base_velocity() -> None:
    """Negative or zero base velocity must raise ValueError."""
    with pytest.raises(ValueError, match="base_velocity_kmh must be positive"):
        tobler_velocity_kmh(0.0, base_velocity_kmh=0.0)
    with pytest.raises(ValueError, match="base_velocity_kmh must be positive"):
        tobler_velocity_kmh(0.0, base_velocity_kmh=-5.0)


# --- 2. Spacesuit velocity scaling tests ---


def test_spacesuit_velocity_flat_baseline() -> None:
    """Loaded spacesuit velocity on flat terrain (S = 0) must equal 2.5 km/h exactly."""
    v_suit_flat = spacesuit_velocity_kmh(0.0)
    assert math.isclose(v_suit_flat, DEFAULT_SPACESUIT_FLAT_VELOCITY_KMH, rel_tol=1e-6)

    # Custom baseline
    v_custom = spacesuit_velocity_kmh(0.0, flat_baseline_kmh=3.0)
    assert math.isclose(v_custom, 3.0, rel_tol=1e-6)


def test_spacesuit_velocity_optimal_and_steep() -> None:
    """Spacesuit velocity scales Tobler curve proportionally."""
    # Maximum spacesuit speed occurs at S = -0.05
    v_suit_opt = spacesuit_velocity_kmh(-0.05)
    expected_opt = 2.5 / math.exp(-0.175)
    assert math.isclose(v_suit_opt, expected_opt, rel_tol=1e-5)
    assert v_suit_opt > 2.5

    # Steep climb slows the astronaut significantly
    v_suit_climb = spacesuit_velocity_kmh(0.20)
    assert v_suit_climb < 1.5


def test_spacesuit_invalid_flat_baseline() -> None:
    """Zero or negative spacesuit flat baseline raises ValueError."""
    with pytest.raises(ValueError, match="flat_baseline_kmh must be positive"):
        spacesuit_velocity_kmh(0.0, flat_baseline_kmh=0.0)
    with pytest.raises(ValueError, match="flat_baseline_kmh must be positive"):
        spacesuit_velocity_kmh(0.0, flat_baseline_kmh=-1.0)


# --- 3. Segment duration tests ---


def test_segment_duration_minutes() -> None:
    """Verify time calculation in minutes: (0.06 * distance_m) / velocity_kmh."""
    # 2500 m at 2.5 km/h = 1 hour = 60 minutes
    assert math.isclose(segment_duration_minutes(2500.0, 2.5), 60.0)

    # 41.6667 m (~1 min walk at 2.5 km/h)
    assert math.isclose(segment_duration_minutes(2500.0 / 60.0, 2.5), 1.0)

    # Zero distance takes 0 minutes
    assert segment_duration_minutes(0.0, 2.5) == 0.0


def test_segment_duration_invalid_inputs() -> None:
    """Negative distance or non-positive velocity raises ValueError."""
    with pytest.raises(ValueError, match="distance_m must be non-negative"):
        segment_duration_minutes(-10.0, 2.5)
    with pytest.raises(ValueError, match="velocity_kmh must be strictly positive"):
        segment_duration_minutes(100.0, 0.0)
    with pytest.raises(ValueError, match="velocity_kmh must be strictly positive"):
        segment_duration_minutes(100.0, -2.5)


# --- 4. Leg walk duration tests ---


def test_calculate_leg_walk_flat_terrain() -> None:
    """Traversing 100 m on flat terrain at 2.5 km/h takes 2.4 minutes."""
    dists = [0.0, 25.0, 50.0, 75.0, 100.0]
    elevs = [0.0, 0.0, 0.0, 0.0, 0.0]

    result = calculate_leg_walk(
        dists, elevs, spacesuit_velocity_kmh, leg_name="flat_test"
    )
    assert result["distance_m"] == 100.0
    # 100 m / (2500 m / 60 min) = 2.4 min
    assert math.isclose(result["duration_minutes"], 2.4, rel_tol=1e-3)
    assert result["ascent_m"] == 0.0
    assert result["descent_m"] == 0.0
    assert math.isclose(result["mean_velocity_kmh"], 2.5, rel_tol=1e-3)


def test_calculate_leg_walk_uphill_vs_downhill() -> None:
    """An uphill leg takes longer than a downhill leg of the exact same relief."""
    dists = [0.0, 50.0, 100.0]
    elevs_uphill = [0.0, 5.0, 10.0]
    elevs_downhill = [10.0, 5.0, 0.0]

    up = calculate_leg_walk(dists, elevs_uphill, spacesuit_velocity_kmh)
    down = calculate_leg_walk(dists, elevs_downhill, spacesuit_velocity_kmh)

    assert up["ascent_m"] == 10.0
    assert up["descent_m"] == 0.0
    assert down["ascent_m"] == 0.0
    assert down["descent_m"] == 10.0

    # Climbing 10 m over 100 m takes longer than descending
    assert up["duration_minutes"] > down["duration_minutes"]
    assert up["mean_velocity_kmh"] < down["mean_velocity_kmh"]


def test_calculate_leg_walk_empty_or_single() -> None:
    """Zero or single point returns 0 duration without error."""
    res_empty = calculate_leg_walk([], [], spacesuit_velocity_kmh)
    assert res_empty["duration_minutes"] == 0.0
    assert res_empty["distance_m"] == 0.0

    res_single = calculate_leg_walk([10.0], [5.0], spacesuit_velocity_kmh)
    assert res_single["duration_minutes"] == 0.0
    assert res_single["distance_m"] == 0.0


def test_calculate_leg_walk_length_mismatch() -> None:
    """Mismatched distances and elevations lengths raises ValueError."""
    with pytest.raises(ValueError, match="identical lengths"):
        calculate_leg_walk([0.0, 10.0], [5.0], spacesuit_velocity_kmh)


# --- 5. Budget evaluation indicator tests ---


def test_evaluate_budget_within_and_over() -> None:
    """Test clear indicator strings and margin signs."""
    # Case: Within budget
    within = evaluate_budget(
        total_duration_minutes=23.0, budget_minutes=60.0, budget_label="nominal_60"
    )
    assert within["within_budget"] is True
    assert within["margin_minutes"] == 37.0
    assert within["indicator"] == "WITHIN_BUDGET"
    assert within["status"] == "within_budget"
    assert "WITHIN budget" in within["message"]

    # Case: Over budget
    over = evaluate_budget(
        total_duration_minutes=40.66,
        budget_minutes=30.0,
        budget_label="conservative_30",
    )
    assert over["within_budget"] is False
    assert over["margin_minutes"] == -10.66
    assert over["indicator"] == "OVER_BUDGET"
    assert over["status"] == "over_budget"
    assert "OVER budget" in over["message"]

    # Case: Exactly on budget
    exact = evaluate_budget(
        total_duration_minutes=60.0, budget_minutes=60.0, budget_label="exact"
    )
    assert exact["within_budget"] is True
    assert exact["margin_minutes"] == 0.0
    assert exact["indicator"] == "WITHIN_BUDGET"


# --- 6. Verification of the generated eva_budget.json artifact ---


@pytest.fixture(scope="module")
def eva_doc() -> dict[str, Any]:
    """Load the generated backend/data/hawksbill_gap/eva_budget.json file."""
    assert OUTPUT_PATH.exists(), f"Artifact not found: {OUTPUT_PATH}"
    return json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))


def test_eva_budget_document_metadata(eva_doc: dict[str, Any]) -> None:
    """Verify document schema, title, timestamps, and input reference."""
    assert eva_doc["schema_version"] == "1.0"
    assert "Hawksbill Gap EVA Time Budget Analysis" in eva_doc["title"]
    assert "generated_at" in eva_doc
    assert (
        eva_doc["input_route_metrics"]
        == "backend/data/hawksbill_gap/route_metrics.json"
    )


def test_eva_budget_planning_assumptions_labeled(eva_doc: dict[str, Any]) -> None:
    """All parameters must be explicitly labeled as planning assumptions."""
    assump = eva_doc["planning_assumptions"]
    assert "operational planning assumptions" in assump["status"]

    locomotion = assump["locomotion_model"]
    assert locomotion["flat_terrain_velocity_kmh"] == 2.5
    assert locomotion["unencumbered_tobler_base_kmh"] == 6.0
    assert locomotion["optimal_slope"] == -0.05
    assert "Tobler" in locomotion["model_name"]
    assert "exp(-3.5 * abs(S + 0.05))" in locomotion["formula"]

    stops = assump["science_stops"]
    assert stops["duration_per_stop_minutes"] == DEFAULT_STOP_DURATION_MINUTES
    assert len(stops["option_a_stops"]) >= 1
    assert len(stops["option_b_stops"]) == 2

    budgets = assump["nominal_budgets"]
    assert budgets["nominal_sortie_budget_minutes"] == 60.0
    assert budgets["extended_sortie_budget_minutes"] == 90.0
    assert budgets["conservative_sortie_limit_minutes"] == 30.0

    assert "disclaimer" in assump
    assert "Planning assumptions only" in assump["disclaimer"]


def test_eva_budget_route_a_metrics(eva_doc: dict[str, Any]) -> None:
    """Verify Option A: 258.01 m RT, 1 stop at Wildcat Ridge (15 min), within 60 & 90 min budgets."""
    route_a = eva_doc["routes"]["A"]
    assert route_a["distance"]["round_trip_m"] == 258.01
    assert route_a["distance"]["outbound_m"] == 129.0

    # Stops: 1 stop at Wildcat Ridge = 15.0 min
    assert route_a["stops"]["count"] == 1
    assert route_a["stops"]["total_duration_minutes"] == 15.0
    assert route_a["stops"]["stops_list"][0]["stop_id"] == "wildcat-ridge"

    # Spacesuit walk durations
    suit = route_a["loaded_spacesuit_model"]
    assert 4.5 <= suit["walk_out_duration_minutes"] <= 4.6  # ~4.55 min
    assert 3.4 <= suit["walk_back_duration_minutes"] <= 3.5  # ~3.45 min
    assert suit["stop_duration_minutes"] == 15.0
    assert math.isclose(suit["total_walk_duration_minutes"], 8.00, abs_tol=0.05)
    assert math.isclose(suit["total_eva_excursion_minutes"], 23.00, abs_tol=0.05)

    # Budget evaluations
    evals = suit["budget_evaluations"]
    assert evals["nominal_60"]["indicator"] == "WITHIN_BUDGET"
    assert evals["nominal_60"]["within_budget"] is True
    assert math.isclose(evals["nominal_60"]["margin_minutes"], 37.0, abs_tol=0.05)

    assert evals["extended_90"]["indicator"] == "WITHIN_BUDGET"
    assert evals["extended_90"]["within_budget"] is True
    assert math.isclose(evals["extended_90"]["margin_minutes"], 67.0, abs_tol=0.05)

    assert evals["conservative_30"]["indicator"] == "WITHIN_BUDGET"
    assert evals["conservative_30"]["within_budget"] is True
    assert math.isclose(evals["conservative_30"]["margin_minutes"], 7.0, abs_tol=0.05)

    # Summary section matches
    summ = route_a["summary"]
    assert summ["within_nominal_60_budget"] is True
    assert summ["within_nominal_90_budget"] is True
    assert summ["status_indicator_60"] == "WITHIN_BUDGET"
    assert summ["status_indicator_90"] == "WITHIN_BUDGET"


def test_eva_budget_route_b_metrics(eva_doc: dict[str, Any]) -> None:
    """Verify Option B: 345.28 m RT, 2 stops (30 min), within 60 & 90 min, OVER 30 min budget."""
    route_b = eva_doc["routes"]["B"]
    assert route_b["distance"]["round_trip_m"] == 345.28
    assert route_b["distance"]["outbound_m"] == 172.64

    # Stops: 2 stops (Skinner Ridge + Wildcat Ridge) = 30.0 min
    assert route_b["stops"]["count"] == 2
    assert route_b["stops"]["total_duration_minutes"] == 30.0
    stop_ids = [s["stop_id"] for s in route_b["stops"]["stops_list"]]
    assert "skinner-ridge" in stop_ids
    assert "wildcat-ridge" in stop_ids

    # Spacesuit walk durations
    suit = route_b["loaded_spacesuit_model"]
    assert 5.8 <= suit["walk_out_duration_minutes"] <= 5.95  # ~5.88 min
    assert 4.7 <= suit["walk_back_duration_minutes"] <= 4.85  # ~4.78 min
    assert suit["stop_duration_minutes"] == 30.0
    assert math.isclose(suit["total_walk_duration_minutes"], 10.66, abs_tol=0.05)
    assert math.isclose(suit["total_eva_excursion_minutes"], 40.66, abs_tol=0.05)

    # Budget evaluations
    evals = suit["budget_evaluations"]
    assert evals["nominal_60"]["indicator"] == "WITHIN_BUDGET"
    assert evals["nominal_60"]["within_budget"] is True
    assert math.isclose(evals["nominal_60"]["margin_minutes"], 19.34, abs_tol=0.05)

    assert evals["extended_90"]["indicator"] == "WITHIN_BUDGET"
    assert evals["extended_90"]["within_budget"] is True
    assert math.isclose(evals["extended_90"]["margin_minutes"], 49.34, abs_tol=0.05)

    # Conservative 30 min test: OVER BUDGET!
    assert evals["conservative_30"]["indicator"] == "OVER_BUDGET"
    assert evals["conservative_30"]["within_budget"] is False
    assert math.isclose(
        evals["conservative_30"]["margin_minutes"], -10.66, abs_tol=0.05
    )

    # Summary section matches
    summ = route_b["summary"]
    assert summ["within_nominal_60_budget"] is True
    assert summ["within_nominal_90_budget"] is True
    assert summ["within_conservative_30_budget"] is False
    assert summ["status_indicator_60"] == "WITHIN_BUDGET"


def test_eva_budget_comparative_tradeoff(eva_doc: dict[str, Any]) -> None:
    """Option B adds +87.27 m, +2.66 min walk, +15 min stop, and +17.66 min total EVA time."""
    comp = eva_doc["comparative_analysis"]
    assert math.isclose(comp["delta_round_trip_distance_m"], 87.27, abs_tol=0.05)
    assert math.isclose(comp["delta_walking_duration_minutes"], 2.66, abs_tol=0.05)
    assert math.isclose(comp["delta_stop_duration_minutes"], 15.00, abs_tol=0.05)
    assert math.isclose(comp["delta_total_eva_minutes"], 17.66, abs_tol=0.05)
    assert "Skinner Ridge" in comp["scientific_gain"]
    assert "contact" in comp["scientific_gain"]


def test_eva_budget_unencumbered_tobler_comparison(eva_doc: dict[str, Any]) -> None:
    """Verify that unencumbered Tobler model is faster than loaded spacesuit."""
    route_a = eva_doc["routes"]["A"]
    suit_a = route_a["loaded_spacesuit_model"]
    std_a = route_a["unencumbered_tobler_model"]

    assert std_a["total_walk_duration_minutes"] < suit_a["total_walk_duration_minutes"]
    assert std_a["total_eva_excursion_minutes"] < suit_a["total_eva_excursion_minutes"]
    # Standard Tobler walk time for Option A is ~3.97 min vs 8.00 min for suit
    assert math.isclose(std_a["total_walk_duration_minutes"], 3.97, abs_tol=0.05)
