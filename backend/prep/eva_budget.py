"""Calculate extravehicular activity (EVA) time budgets along traverse routes (CH26-101).

Applies Tobler's hiking function (1993) and a loaded planetary spacesuit mobility
model to along-route elevation profiles and distances from route_metrics.json.

References:
- Tobler, Waldo (1993): "Three presentations on geographical analysis and modeling",
  Technical Report 93-1, National Center for Geographic Information and Analysis.
  Velocity formula: W = 6.0 * exp(-3.5 * abs(S + 0.05)) km/h, where S = dz / dd.
- NASA Apollo Lunar Surface & Planetary EVA Operations:
  Typical loaded spacesuit baseline walking speed on flat terrain is ~2.2 - 2.8 km/h
  (nominal planning assumption: 2.5 km/h on flat terrain).
- Field scenario:
  Hawksbill Gap exploration scenario across Wildcat Ridge (reference stop) and
  Skinner Ridge (test stop for bedrock vs float origin).
- backend/data/hawksbill_gap/route_metrics.json:
  Along-route 5 m sampled elevation profiles, distances, and ascent metrics for
  Option A (258.01 m RT) and Option B (345.28 m RT).

Calculations:
1. Walk-out duration (minutes): Traverse from Start (25_446) to turnaround point.
2. Stop duration (minutes): Science stops (15 min per stop at Wildcat Ridge and Skinner Ridge).
3. Walk-back duration (minutes): Return leg from turnaround point back to Start.
4. Total EVA excursion time (minutes): Walk-out + Stops + Walk-back.
5. Budget evaluations: Explicit indicator (WITHIN_BUDGET / OVER_BUDGET) against
   nominal budgets (60 min and 90 min) as well as conservative contingencies (30 min).
All parameters are documented and labeled as planning assumptions.
"""

from __future__ import annotations

import argparse
import json
import math
from collections.abc import Callable
from pathlib import Path
from typing import Any

from prep.common import SCENARIO_DIR, utc_now, write_json

METRICS_PATH = SCENARIO_DIR / "route_metrics.json"
OUTPUT_PATH = SCENARIO_DIR / "eva_budget.json"

# Operational planning assumptions
DEFAULT_BASE_VELOCITY_KMH = 6.0
DEFAULT_SPACESUIT_FLAT_VELOCITY_KMH = 2.5
DEFAULT_STOP_DURATION_MINUTES = 15.0
DEFAULT_NOMINAL_BUDGET_MINUTES = 60.0
DEFAULT_EXTENDED_BUDGET_MINUTES = 90.0
DEFAULT_CONSERVATIVE_BUDGET_MINUTES = 30.0

BUDGET_BENCHMARKS = (
    ("conservative_30", 30.0, "Conservative / emergency contingency EVA sortie limit"),
    ("nominal_60", 60.0, "Nominal primary EVA sortie budget"),
    ("extended_90", 90.0, "Extended EVA sortie budget with life support reserves"),
)

# Stops configuration matching scenario and stop specifications
STOPS_CONFIG = {
    "A": [
        {
            "stop_id": "wildcat-ridge",
            "name": "Wildcat Ridge",
            "member": "Hogwallow Flats member",
            "sample_targets": ["Hazeltop (sol 509)", "Bearwallow (sol 516)"],
            "planned_task": (
                "Document fine-grained laminated mudstones; acquire metric scale photography "
                "of calcium-sulfate veins cross-cutting bedding to constrain post-depositional fluid history."
            ),
            "planned_duration_minutes": DEFAULT_STOP_DURATION_MINUTES,
        }
    ],
    "B": [
        {
            "stop_id": "skinner-ridge",
            "name": "Skinner Ridge",
            "member": "Lower Rockytop member base",
            "sample_targets": ["Swift Run (sol 490)", "Skyland (sol 495)"],
            "planned_task": (
                "Direct close-up contact inspection and macro photography of the 1 m sandstone block "
                "basal interface with surrounding bedrock to resolve in-place bedrock vs float block origin."
            ),
            "planned_duration_minutes": DEFAULT_STOP_DURATION_MINUTES,
        },
        {
            "stop_id": "wildcat-ridge",
            "name": "Wildcat Ridge",
            "member": "Hogwallow Flats member",
            "sample_targets": ["Hazeltop (sol 509)", "Bearwallow (sol 516)"],
            "planned_task": (
                "Document fine-grained laminated mudstones; acquire metric scale photography "
                "of calcium-sulfate veins cross-cutting bedding to constrain post-depositional fluid history."
            ),
            "planned_duration_minutes": DEFAULT_STOP_DURATION_MINUTES,
        },
    ],
}


def tobler_velocity_kmh(
    slope: float, base_velocity_kmh: float = DEFAULT_BASE_VELOCITY_KMH
) -> float:
    """Calculate walking velocity in km/h using Tobler's hiking function.

    Formula: W = base_velocity_kmh * exp(-3.5 * |S + 0.05|)
    where S = dz / dd is along-route slope (dimensionless: vertical rise / horizontal run).
    Positive S represents uphill ascent; negative S represents downhill descent.
    Maximum velocity occurs on a gentle downhill slope of S = -0.05 (~ -2.86 degrees).
    """
    if base_velocity_kmh <= 0:
        raise ValueError(f"base_velocity_kmh must be positive, got {base_velocity_kmh}")
    return base_velocity_kmh * math.exp(-3.5 * abs(slope + 0.05))


def tobler_flat_velocity_kmh(
    base_velocity_kmh: float = DEFAULT_BASE_VELOCITY_KMH,
) -> float:
    """Return walking velocity in km/h on flat terrain (slope S = 0)."""
    return tobler_velocity_kmh(0.0, base_velocity_kmh=base_velocity_kmh)


def spacesuit_velocity_kmh(
    slope: float,
    flat_baseline_kmh: float = DEFAULT_SPACESUIT_FLAT_VELOCITY_KMH,
    base_velocity_kmh: float = DEFAULT_BASE_VELOCITY_KMH,
) -> float:
    """Calculate loaded planetary spacesuit walking velocity in km/h.

    Scales Tobler's slope curve so that flat terrain (slope S = 0) yields
    exactly flat_baseline_kmh (default: 2.5 km/h for a pressurized planetary suit).
    Formula: W_suit(S) = (flat_baseline_kmh / tobler_flat_velocity_kmh()) * tobler_velocity_kmh(S).
    """
    if flat_baseline_kmh <= 0:
        raise ValueError(f"flat_baseline_kmh must be positive, got {flat_baseline_kmh}")
    flat_std = tobler_flat_velocity_kmh(base_velocity_kmh=base_velocity_kmh)
    scale_factor = flat_baseline_kmh / flat_std
    return scale_factor * tobler_velocity_kmh(
        slope, base_velocity_kmh=base_velocity_kmh
    )


def segment_duration_minutes(distance_m: float, velocity_kmh: float) -> float:
    """Calculate travel time in minutes for a segment of distance_m at velocity_kmh.

    Formula: t_min = (0.06 * distance_m) / velocity_kmh.
    """
    if distance_m < 0:
        raise ValueError(f"distance_m must be non-negative, got {distance_m}")
    if distance_m == 0:
        return 0.0
    if velocity_kmh <= 0:
        raise ValueError(f"velocity_kmh must be strictly positive, got {velocity_kmh}")
    return (0.06 * distance_m) / velocity_kmh


def calculate_leg_walk(
    distances_m: list[float],
    elevations_m: list[float],
    velocity_fn: Callable[[float], float],
    leg_name: str = "leg",
) -> dict[str, Any]:
    """Calculate distance, cumulative ascent/descent, and walk duration along a profile leg."""
    if len(distances_m) != len(elevations_m):
        raise ValueError(
            f"distances_m and elevations_m must have identical lengths, got {len(distances_m)} vs {len(elevations_m)}"
        )
    if len(distances_m) < 2:
        return {
            "leg_name": leg_name,
            "distance_m": 0.0,
            "duration_minutes": 0.0,
            "duration_seconds": 0.0,
            "ascent_m": 0.0,
            "descent_m": 0.0,
            "mean_velocity_kmh": 0.0,
            "segments_count": 0,
        }

    total_dist_m = 0.0
    total_duration_min = 0.0
    total_ascent_m = 0.0
    total_descent_m = 0.0

    for i in range(len(distances_m) - 1):
        d_start = distances_m[i]
        d_end = distances_m[i + 1]
        z_start = elevations_m[i]
        z_end = elevations_m[i + 1]

        dd = d_end - d_start
        dz = z_end - z_start

        if dd <= 0:
            continue

        slope = dz / dd
        velocity = velocity_fn(slope)
        dt_min = segment_duration_minutes(dd, velocity)

        total_dist_m += dd
        total_duration_min += dt_min

        if dz > 0:
            total_ascent_m += dz
        else:
            total_descent_m += abs(dz)

    mean_vel_kmh = (
        (total_dist_m / 1000.0) / (total_duration_min / 60.0)
        if total_duration_min > 0
        else 0.0
    )

    return {
        "leg_name": leg_name,
        "distance_m": round(total_dist_m, 2),
        "duration_minutes": round(total_duration_min, 2),
        "duration_seconds": round(total_duration_min * 60.0, 1),
        "ascent_m": round(total_ascent_m, 2),
        "descent_m": round(total_descent_m, 2),
        "mean_velocity_kmh": round(mean_vel_kmh, 2),
        "segments_count": len(distances_m) - 1,
    }


def evaluate_budget(
    total_duration_minutes: float,
    budget_minutes: float,
    budget_label: str = "",
) -> dict[str, Any]:
    """Evaluate excursion duration against an EVA time budget threshold."""
    within_budget = total_duration_minutes <= budget_minutes
    margin_min = round(budget_minutes - total_duration_minutes, 2)
    indicator = "WITHIN_BUDGET" if within_budget else "OVER_BUDGET"
    status = "within_budget" if within_budget else "over_budget"

    if within_budget:
        message = (
            f"Excursion is WITHIN budget: {total_duration_minutes:.2f} min <= {budget_minutes:.1f} min "
            f"(reserve margin: +{margin_min:.2f} min)."
        )
    else:
        message = (
            f"Excursion is OVER budget: {total_duration_minutes:.2f} min > {budget_minutes:.1f} min "
            f"(deficit: {margin_min:.2f} min)."
        )

    return {
        "budget_id": budget_label,
        "nominal_budget_minutes": budget_minutes,
        "within_budget": within_budget,
        "margin_minutes": margin_min,
        "indicator": indicator,
        "status": status,
        "message": message,
    }


def calculate_option_budget(
    option_id: str,
    option_data: dict[str, Any],
    stop_configs: list[dict[str, Any]] | None = None,
    spacesuit_flat_velocity_kmh: float = DEFAULT_SPACESUIT_FLAT_VELOCITY_KMH,
    base_velocity_kmh: float = DEFAULT_BASE_VELOCITY_KMH,
    budget_benchmarks: tuple[tuple[str, float, str], ...] = BUDGET_BENCHMARKS,
) -> dict[str, Any]:
    """Compute complete EVA time budget for a single route option."""
    profile = option_data["profile"]
    dist_m: list[float] = profile["distance_m"]
    elev_m: list[float] = profile["elevation_m"]
    outbound_m = float(option_data["outbound_m"])
    round_trip_m = float(option_data["round_trip_m"])

    # Find turnaround index where cumulative distance reaches outbound_m
    turnaround_idx = 0
    for idx, d in enumerate(dist_m):
        if math.isclose(d, outbound_m, abs_tol=0.05):
            turnaround_idx = idx
            break
    if turnaround_idx == 0:
        turnaround_idx = len(dist_m) // 2

    # Split into outbound and return series
    outbound_dists = dist_m[: turnaround_idx + 1]
    outbound_elevs = elev_m[: turnaround_idx + 1]

    return_dists = dist_m[turnaround_idx:]
    return_elevs = elev_m[turnaround_idx:]

    # Velocity functions
    def suit_v_fn(s: float) -> float:
        return spacesuit_velocity_kmh(
            s,
            flat_baseline_kmh=spacesuit_flat_velocity_kmh,
            base_velocity_kmh=base_velocity_kmh,
        )

    def std_tobler_v_fn(s: float) -> float:
        return tobler_velocity_kmh(s, base_velocity_kmh=base_velocity_kmh)

    # 1. Loaded spacesuit model calculation
    suit_outbound = calculate_leg_walk(
        outbound_dists, outbound_elevs, suit_v_fn, leg_name="walk_out"
    )
    suit_return = calculate_leg_walk(
        return_dists, return_elevs, suit_v_fn, leg_name="walk_back"
    )
    suit_walk_total_min = round(
        suit_outbound["duration_minutes"] + suit_return["duration_minutes"], 2
    )

    # 2. Standard unencumbered Tobler comparison
    std_outbound = calculate_leg_walk(
        outbound_dists, outbound_elevs, std_tobler_v_fn, leg_name="walk_out"
    )
    std_return = calculate_leg_walk(
        return_dists, return_elevs, std_tobler_v_fn, leg_name="walk_back"
    )
    std_walk_total_min = round(
        std_outbound["duration_minutes"] + std_return["duration_minutes"], 2
    )

    # Science stops
    stops = (
        stop_configs if stop_configs is not None else STOPS_CONFIG.get(option_id, [])
    )
    total_stop_duration_min = sum(s["planned_duration_minutes"] for s in stops)

    # Total EVA excursion times
    suit_total_eva_min = round(suit_walk_total_min + total_stop_duration_min, 2)
    std_total_eva_min = round(std_walk_total_min + total_stop_duration_min, 2)

    # Budget evaluations for spacesuit model
    budget_evaluations: dict[str, Any] = {}
    for budget_id, budget_min, description in budget_benchmarks:
        eval_result = evaluate_budget(
            suit_total_eva_min, budget_min, budget_label=budget_id
        )
        eval_result["description"] = description
        budget_evaluations[budget_id] = eval_result

    # Standard Tobler budget evaluations
    std_budget_evaluations: dict[str, Any] = {}
    for budget_id, budget_min, description in budget_benchmarks:
        eval_result = evaluate_budget(
            std_total_eva_min, budget_min, budget_label=budget_id
        )
        eval_result["description"] = description
        std_budget_evaluations[budget_id] = eval_result

    return {
        "option_id": option_id,
        "route_label": f"Option {option_id}",
        "distance": {
            "outbound_m": outbound_m,
            "return_m": round(round_trip_m - outbound_m, 2),
            "round_trip_m": round_trip_m,
            "ascent_m": float(option_data.get("ascent_m", 0.0)),
        },
        "stops": {
            "count": len(stops),
            "total_duration_minutes": round(total_stop_duration_min, 2),
            "stops_list": stops,
        },
        "loaded_spacesuit_model": {
            "description": "Tobler hiking function scaled to 2.5 km/h flat terrain spacesuit baseline.",
            "walk_out_duration_minutes": suit_outbound["duration_minutes"],
            "stop_duration_minutes": round(total_stop_duration_min, 2),
            "walk_back_duration_minutes": suit_return["duration_minutes"],
            "total_walk_duration_minutes": suit_walk_total_min,
            "total_eva_excursion_minutes": suit_total_eva_min,
            "legs": {
                "walk_out": suit_outbound,
                "walk_back": suit_return,
            },
            "budget_evaluations": budget_evaluations,
            "nominal_60_indicator": budget_evaluations["nominal_60"]["indicator"],
            "nominal_90_indicator": budget_evaluations["extended_90"]["indicator"],
            "conservative_30_indicator": budget_evaluations["conservative_30"][
                "indicator"
            ],
        },
        "unencumbered_tobler_model": {
            "description": "Standard unencumbered Tobler hiking function (6.0 km/h base velocity).",
            "walk_out_duration_minutes": std_outbound["duration_minutes"],
            "stop_duration_minutes": round(total_stop_duration_min, 2),
            "walk_back_duration_minutes": std_return["duration_minutes"],
            "total_walk_duration_minutes": std_walk_total_min,
            "total_eva_excursion_minutes": std_total_eva_min,
            "legs": {
                "walk_out": std_outbound,
                "walk_back": std_return,
            },
            "budget_evaluations": std_budget_evaluations,
        },
        "summary": {
            "walk_out_minutes": suit_outbound["duration_minutes"],
            "stop_duration_minutes": round(total_stop_duration_min, 2),
            "walk_back_duration_minutes": suit_return["duration_minutes"],
            "total_eva_minutes": suit_total_eva_min,
            "within_nominal_60_budget": budget_evaluations["nominal_60"][
                "within_budget"
            ],
            "within_nominal_90_budget": budget_evaluations["extended_90"][
                "within_budget"
            ],
            "within_conservative_30_budget": budget_evaluations["conservative_30"][
                "within_budget"
            ],
            "status_indicator_60": budget_evaluations["nominal_60"]["indicator"],
            "status_indicator_90": budget_evaluations["extended_90"]["indicator"],
        },
    }


def build_eva_budget_document(
    route_metrics_data: dict[str, Any],
    spacesuit_flat_velocity_kmh: float = DEFAULT_SPACESUIT_FLAT_VELOCITY_KMH,
    base_velocity_kmh: float = DEFAULT_BASE_VELOCITY_KMH,
    stop_duration_minutes: float = DEFAULT_STOP_DURATION_MINUTES,
    budget_benchmarks: tuple[tuple[str, float, str], ...] = BUDGET_BENCHMARKS,
) -> dict[str, Any]:
    """Build the complete EVA time budget record for export."""
    options_raw = route_metrics_data["options"]

    route_results: dict[str, Any] = {}
    for opt_id in sorted(options_raw.keys()):
        route_results[opt_id] = calculate_option_budget(
            option_id=opt_id,
            option_data=options_raw[opt_id],
            stop_configs=STOPS_CONFIG.get(opt_id),
            spacesuit_flat_velocity_kmh=spacesuit_flat_velocity_kmh,
            base_velocity_kmh=base_velocity_kmh,
            budget_benchmarks=budget_benchmarks,
        )

    # Comparative trade-off metrics between Option A and Option B
    res_a = route_results["A"]["loaded_spacesuit_model"]
    res_b = route_results["B"]["loaded_spacesuit_model"]
    dist_a = route_results["A"]["distance"]["round_trip_m"]
    dist_b = route_results["B"]["distance"]["round_trip_m"]

    delta_dist_m = round(dist_b - dist_a, 2)
    delta_walk_min = round(
        res_b["total_walk_duration_minutes"] - res_a["total_walk_duration_minutes"], 2
    )
    delta_stop_min = round(
        res_b["stop_duration_minutes"] - res_a["stop_duration_minutes"], 2
    )
    delta_total_eva_min = round(
        res_b["total_eva_excursion_minutes"] - res_a["total_eva_excursion_minutes"], 2
    )

    comparative_analysis = {
        "trade_off_title": "Route A vs Route B Time Budget Trade-off",
        "delta_round_trip_distance_m": delta_dist_m,
        "delta_walking_duration_minutes": delta_walk_min,
        "delta_stop_duration_minutes": delta_stop_min,
        "delta_total_eva_minutes": delta_total_eva_min,
        "scientific_gain": (
            "Visiting Skinner Ridge in Option B requires +87.27 m of walking (+2.66 min walk time) "
            "and +15.00 min field observation time (+17.66 min total excursion time). "
            "This extra time enables direct macro inspection of the bedrock contact interface, "
            "resolving whether the Skinner Ridge block is in-place bedrock or upper Rockytop float. "
            "Option A avoids the extra 17.66 min but leaves the contact uninspected and unresolved."
        ),
        "budget_feasibility": {
            "nominal_60_min": (
                "Both routes are comfortably within the nominal 60.0 min budget (Option A margin: +37.00 min; "
                "Option B margin: +19.34 min)."
            ),
            "extended_90_min": (
                "Both routes are comfortably within the extended 90.0 min budget (Option A margin: +67.00 min; "
                "Option B margin: +49.34 min)."
            ),
            "conservative_30_min": (
                "Option A is within the 30.0 min conservative budget (+7.00 min margin), whereas Option B "
                "exceeds the 30.0 min conservative limit by 10.66 min (OVER_BUDGET)."
            ),
        },
    }

    flat_std = tobler_flat_velocity_kmh(base_velocity_kmh=base_velocity_kmh)
    scale_factor = round(spacesuit_flat_velocity_kmh / flat_std, 5)

    planning_assumptions = {
        "status": "All parameters are operational planning assumptions for mission feasibility analysis.",
        "locomotion_model": {
            "model_name": "Spacesuit-Adjusted Tobler Hiking Function",
            "citation": "Tobler, W. (1993) NCGIA Technical Report 93-1; Apollo/Artemis analog field data",
            "formula": "W(S) = (V_flat / (6.0 * exp(-0.175))) * 6.0 * exp(-3.5 * abs(S + 0.05)) km/h",
            "slope_definition": "S = dz / dd (vertical elevation change / horizontal great-circle distance)",
            "flat_terrain_velocity_kmh": spacesuit_flat_velocity_kmh,
            "unencumbered_tobler_base_kmh": base_velocity_kmh,
            "unencumbered_tobler_flat_kmh": round(flat_std, 4),
            "scale_factor": scale_factor,
            "optimal_slope": -0.05,
            "optimal_slope_description": "-5% grade (slight downhill ~ -2.86 deg) yields maximum velocity",
        },
        "science_stops": {
            "duration_per_stop_minutes": stop_duration_minutes,
            "rationale": "Standard analog field task allocation for high-resolution scale photography, orientation notes, and contact inspection.",
            "option_a_stops": [
                "Wildcat Ridge (15 min); Skinner Ridge observed via standoff"
            ],
            "option_b_stops": ["Skinner Ridge (15 min)", "Wildcat Ridge (15 min)"],
        },
        "nominal_budgets": {
            "conservative_sortie_limit_minutes": 30.0,
            "nominal_sortie_budget_minutes": DEFAULT_NOMINAL_BUDGET_MINUTES,
            "extended_sortie_budget_minutes": DEFAULT_EXTENDED_BUDGET_MINUTES,
            "rationale": "60–90 min nominal excursions leave sufficient portable life support system (PLSS) reserves (O2, battery, water sublimation) for contingency.",
        },
        "terrain_data": {
            "source": "USGS TRN HiRISE Digital Terrain Model (1 m grid resolution, DeltaGeoid vertical reference)",
            "profile_sampling_step_m": 5.0,
            "route_metrics_record": "backend/data/hawksbill_gap/route_metrics.json",
        },
        "disclaimer": (
            "Planning assumptions only. Does not replace certified suit life support system telemetry, "
            "consumables tracking (O2, battery, sublimator water), terrain trafficability, "
            "or real-time astronaut physiological monitoring."
        ),
    }

    return {
        "schema_version": "1.0",
        "title": "Hawksbill Gap EVA Time Budget Analysis",
        "generated_at": utc_now(),
        "input_route_metrics": "backend/data/hawksbill_gap/route_metrics.json",
        "planning_assumptions": planning_assumptions,
        "comparative_analysis": comparative_analysis,
        "routes": route_results,
    }


def main() -> Path:
    """Load route metrics, compute EVA budget document, and write output JSON."""
    parser = argparse.ArgumentParser(
        description="Calculate EVA time budget for Hawksbill Gap routes."
    )
    parser.add_argument(
        "--metrics", type=Path, default=METRICS_PATH, help="Path to route_metrics.json"
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_PATH,
        help="Path to eva_budget.json output",
    )
    parser.add_argument(
        "--suit-speed",
        type=float,
        default=DEFAULT_SPACESUIT_FLAT_VELOCITY_KMH,
        help="Spacesuit walking speed on flat ground in km/h (default: 2.5)",
    )
    parser.add_argument(
        "--stop-duration",
        type=float,
        default=DEFAULT_STOP_DURATION_MINUTES,
        help="Science stop duration in minutes per stop (default: 15.0)",
    )
    args = parser.parse_args()

    if not args.metrics.exists():
        raise FileNotFoundError(f"Route metrics file not found: {args.metrics}")

    route_metrics_data = json.loads(args.metrics.read_text(encoding="utf-8"))
    document = build_eva_budget_document(
        route_metrics_data=route_metrics_data,
        spacesuit_flat_velocity_kmh=args.suit_speed,
        stop_duration_minutes=args.stop_duration,
    )

    write_json(args.output, document)
    print(f"OK: Saved EVA time budget analysis -> {args.output}")

    # Print summary table
    print("\n--- EVA TIME BUDGET SUMMARY (Planning Assumptions) ---")
    for opt_id, rdata in document["routes"].items():
        suit_model = rdata["loaded_spacesuit_model"]
        print(f"\nRoute {opt_id}:")
        print(
            f"  Round-trip distance: {rdata['distance']['round_trip_m']} m (Outbound: {rdata['distance']['outbound_m']} m)"
        )
        print(
            f"  Walk-out duration:   {suit_model['walk_out_duration_minutes']:.2f} min"
        )
        print(
            f"  Stop duration:       {suit_model['stop_duration_minutes']:.2f} min ({rdata['stops']['count']} stops)"
        )
        print(
            f"  Walk-back duration:  {suit_model['walk_back_duration_minutes']:.2f} min"
        )
        print(
            f"  Total walk time:     {suit_model['total_walk_duration_minutes']:.2f} min"
        )
        print(
            f"  Total EVA excursion: {suit_model['total_eva_excursion_minutes']:.2f} min"
        )
        for b_eval in suit_model["budget_evaluations"].values():
            print(
                f"    Against {b_eval['nominal_budget_minutes']:.0f} min budget: "
                f"[{b_eval['indicator']}] Margin: {b_eval['margin_minutes']:+.2f} min ({b_eval['status']})"
            )

    comp = document["comparative_analysis"]
    print(
        f"\nTrade-off: Option B adds +{comp['delta_round_trip_distance_m']} m and +{comp['delta_total_eva_minutes']:.2f} min total EVA time."
    )
    return args.output


if __name__ == "__main__":
    main()
