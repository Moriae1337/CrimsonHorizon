"""Checks for route profiles, ascent, grade and coverage (CH26-024/025/027).

Synthetic grids use a sphere with R = 180 / pi m, so one degree of longitude on
the equator is exactly 1 m and the equirectangular x equals the longitude.
No network access and no rasterio.
"""

import itertools
import json
import math

import pytest

from prep import profiles, routes, scenario_bundle
from prep.common import SCENARIO_DIR

NODATA = -3.4028226550889045e38
UNIT_RADIUS_M = 180 / math.pi
SLOPE = 0.5

# Locked table from specs/martian-map-scope-2026.md (route table).
SCOPE = {
    "A": {"ascent_m": 13.34, "max_grade_deg": {"2": 20.69, "5": 14.82, "10": 14.15}},
    "B": {"ascent_m": 17.80, "max_grade_deg": {"2": 22.13, "5": 14.93, "10": 13.95}},
}
# The local grid is a second bilinear resampling of the source crop, which
# smooths short relief: 2 m grades drop by up to 1.6 deg, 5 m by up to 0.2 deg.
LOCAL_TOLERANCE = {"ascent_m": 0.05, "2": 1.6, "5": 0.25, "10": 0.1}


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def ramp(cols: int = 14, rows: int = 4) -> list[list[float]]:
    """z = SLOPE * x at every cell center, so bilinear samples are exact."""
    return [[SLOPE * (c + 0.5) for c in range(cols)] for _ in range(rows)]


def grid(data: list[list[float]]) -> profiles.Grid:
    # Rows cover y in [-2, 2]; the test path runs along y = 0 (the equator).
    transform = (1.0, 0.0, 0.0, 0.0, -1.0, 2.0)
    return profiles.Grid(data, transform, NODATA, profiles.eqc(UNIT_RADIUS_M))


PATH = [[1.0, 0.0], [4.0, 0.0], [11.0, 0.0]]


@pytest.fixture(scope="module")
def record() -> dict:
    return load(profiles.METRICS_PATH)


@pytest.fixture(scope="module")
def scenario() -> dict:
    return load(scenario_bundle.SCENARIO_PATH)


# Sampling (#42) ---------------------------------------------------------------


def test_sample_distances_are_even_and_include_both_ends() -> None:
    assert profiles.sample_distances(12.0, 5.0) == [0.0, 4.0, 8.0, 12.0]
    assert profiles.sample_distances(10.0, 5.0) == [0.0, 5.0, 10.0]
    assert profiles.sample_distances(3.0, 5.0) == [0.0, 3.0]
    distances = profiles.sample_distances(129.0, 2.0)
    gaps = [b - a for a, b in itertools.pairwise(distances)]
    assert distances[-1] == 129.0
    assert max(gaps) <= 2.0 and min(gaps) == pytest.approx(max(gaps))


def test_sample_path_walks_great_circle_distance() -> None:
    samples = profiles.sample_path(PATH, grid(ramp()), 2.0, UNIT_RADIUS_M)
    assert samples["distance_m"] == pytest.approx([0, 2, 4, 6, 8, 10])
    # Positions x = 1, 3, ..., 11 across the vertex at x = 4.
    assert samples["elevation_m"] == pytest.approx([SLOPE * x for x in range(1, 12, 2)])


def test_nodata_neighbour_breaks_the_series() -> None:
    data = ramp()
    for row in data:
        row[6] = NODATA  # cells x in [6, 7): touches samples within (5.5, 7.5)
    samples = profiles.sample_path(PATH, grid(data), 2.0, UNIT_RADIUS_M)
    assert samples["elevation_m"][:3] == pytest.approx([0.5, 1.5, 2.5])
    assert samples["elevation_m"][3] is None  # x = 7, never 0 or interpolated
    assert samples["elevation_m"][4:] == pytest.approx([4.5, 5.5])
    # Off the grid is also a gap.
    off = profiles.sample_path(
        [[1.0, 0.0], [20.0, 0.0]], grid(ramp()), 1.0, UNIT_RADIUS_M
    )
    assert off["elevation_m"][-1] is None


def test_round_trip_profile_mirrors_and_ends_where_it_starts() -> None:
    distances, elevations = profiles.round_trip([0.0, 5.0, 9.0], [1.0, None, 3.0])
    assert distances == [0.0, 5.0, 9.0, 13.0, 18.0]
    assert elevations == [1.0, None, 3.0, None, 1.0]
    assert elevations[0] == elevations[-1]


# Ascent and grade (#43) -------------------------------------------------------


def test_ascent_and_grade_use_consecutive_valid_samples_only() -> None:
    distances = [0.0, 5.0, 10.0, 15.0, 20.0]
    elevations = [0.0, 1.0, None, 2.0, 0.0]
    # |+1| on the first pair and |-2| on the last; nothing across the gap.
    assert profiles.round_trip_ascent_m(distances, elevations) == pytest.approx(3.0)
    expected = math.degrees(math.atan(2.0 / 5.0))
    assert profiles.max_grade_deg(distances, elevations) == pytest.approx(expected)
    assert profiles.max_grade_deg([0.0, 5.0], [None, 1.0]) is None


def test_ramp_grade_matches_its_slope() -> None:
    samples = profiles.sample_path(PATH, grid(ramp()), 2.0, UNIT_RADIUS_M)
    grade = profiles.max_grade_deg(samples["distance_m"], samples["elevation_m"])
    assert grade == pytest.approx(math.degrees(math.atan(SLOPE)))
    ascent = profiles.round_trip_ascent_m(samples["distance_m"], samples["elevation_m"])
    assert ascent == pytest.approx(SLOPE * 10)


# Coverage (#45) ---------------------------------------------------------------


def test_coverage_reports_a_known_partial_gap() -> None:
    data = ramp()
    for row in data:
        row[6] = NODATA
    samples = profiles.sample_path(PATH, grid(data), 2.0, UNIT_RADIUS_M)
    cover = profiles.coverage(
        PATH, samples["distance_m"], samples["elevation_m"], UNIT_RADIUS_M
    )
    # Intervals 4-6 m and 6-8 m (x = 5..9) touch the NoData sample at x = 7.
    assert cover["length_m"] == pytest.approx(10.0)
    assert cover["gap_m"] == pytest.approx(4.0)
    assert cover["covered_pct"] == pytest.approx(60.0)
    [gap] = cover["gaps"]
    assert (gap["from_m"], gap["to_m"]) == pytest.approx((4.0, 8.0))
    assert gap["coordinates"] == [pytest.approx([5.0, 0.0]), pytest.approx([9.0, 0.0])]


def test_gap_line_keeps_the_vertices_it_crosses() -> None:
    cumulative = profiles.cumulative_m(PATH, UNIT_RADIUS_M)
    line = profiles.cut_line(PATH, cumulative, 1.0, 5.0)
    assert line == [
        pytest.approx([2.0, 0.0]),
        [4.0, 0.0],
        pytest.approx([6.0, 0.0]),
    ]


def test_full_coverage_has_no_gaps() -> None:
    samples = profiles.sample_path(PATH, grid(ramp()), 2.0, UNIT_RADIUS_M)
    cover = profiles.coverage(
        PATH, samples["distance_m"], samples["elevation_m"], UNIT_RADIUS_M
    )
    assert cover["covered_pct"] == pytest.approx(100.0) and cover["gaps"] == []


# Committed record -------------------------------------------------------------


def test_record_comes_from_the_committed_grid(record: dict) -> None:
    local = load(SCENARIO_DIR / "dtm_local.json")
    crop = load(SCENARIO_DIR / "dtm_primary_window.json")
    assert record["dtm"]["data_sha256"] == local["data_sha256"]
    assert record["dtm"]["source_crop"]["data_sha256"] == crop["data_sha256"]
    assert record["dtm"]["transform"] == local["local"]["transform"]
    assert record["dtm"]["shape"] == local["local"]["shape"]
    assert record["nominal_step_m"] == 5.0
    assert record["units"]["grade"] == "degrees"


def test_source_crop_check_reproduces_the_scope(record: dict) -> None:
    for option, locked in SCOPE.items():
        check = record["source_crop_check"][option]
        assert check["ascent_m"] == pytest.approx(locked["ascent_m"], abs=0.01)
        for step, value in locked["max_grade_deg"].items():
            assert check["max_grade_deg"][step] == pytest.approx(value, abs=0.01)


def test_local_grid_metrics_stay_close_to_the_scope(record: dict) -> None:
    for option, locked in SCOPE.items():
        info = record["options"][option]
        assert info["ascent_m"] == pytest.approx(
            locked["ascent_m"], abs=LOCAL_TOLERANCE["ascent_m"]
        )
        for step, value in locked["max_grade_deg"].items():
            assert info["max_grade_deg"][step] == pytest.approx(
                value, abs=LOCAL_TOLERANCE[step]
            )
        assert info["max_grade_deg"]["5"] == pytest.approx(15, abs=0.5)


def test_profiles_match_routes_and_metrics(record: dict) -> None:
    built = load(routes.ROUTES_PATH)["options"]
    for option, info in record["options"].items():
        profile = info["profile"]
        distances, elevations = profile["distance_m"], profile["elevation_m"]
        assert len(distances) == len(elevations)
        assert distances[0] == 0
        assert distances[-1] == pytest.approx(built[option]["round_trip_m"], abs=0.02)
        assert info["outbound_m"] == pytest.approx(
            built[option]["outbound_m"], abs=0.01
        )
        assert elevations == list(reversed(elevations))
        assert elevations[0] is not None and elevations[0] == elevations[-1]
        assert all(-2600 < z < -2450 for z in elevations if z is not None)
        half = len(distances) // 2 + 1
        ascent = profiles.round_trip_ascent_m(distances[:half], elevations[:half])
        assert ascent == pytest.approx(info["ascent_m"], abs=0.01)
        grade = profiles.max_grade_deg(distances[:half], elevations[:half])
        assert grade == pytest.approx(info["max_grade_deg"]["5"], abs=0.05)
        cover = info["coverage"]
        assert cover["covered_m"] + cover["gap_m"] == pytest.approx(cover["length_m"])
        assert cover["gap_m"] == pytest.approx(
            sum(g["length_m"] for g in info["gaps"]), abs=0.02
        )


# Scenario bundle --------------------------------------------------------------


def test_scenario_carries_the_record(scenario: dict, record: dict) -> None:
    assert scenario["schema_version"] == "1.1"
    assert "profiles" not in scenario["pending_sections"]
    by_option = {p["option"]: p for p in scenario["profiles"]}
    assert set(by_option) == set(record["options"])
    for option_info in scenario["route_options"]:
        option = option_info["id"]
        info = record["options"][option]
        assert option_info["ascent_m"] == info["ascent_m"]
        assert option_info["max_grade_deg"] == info["max_grade_deg"]
        assert set(option_info["max_grade_deg"]) == {"2", "5", "10"}
        assert option_info["dtm_covered_pct"] == info["coverage"]["covered_pct"]
        profile = by_option[option]
        assert profile["id"] == f"profile-{option.lower()}"
        assert profile["step_m"] == 5.0
        assert profile["distance_m"] == info["profile"]["distance_m"]
        assert profile["elevation_m"] == info["profile"]["elevation_m"]
        assert profile["source_ids"] == ["dtm-primary"]
    gaps = [
        (option, gap)
        for option, info in record["options"].items()
        for gap in info["gaps"]
    ]
    assert len(scenario["unknowns"]) == len(gaps)
    for item, (option, gap) in zip(scenario["unknowns"], gaps):
        assert item["kind"] == "terrain-gap" and item["option"] == option
        assert item["geometry"] == gap["geometry"]
        assert item["length_m"] == gap["length_m"]
        assert item["source_ids"] == ["dtm-primary"]


def test_bundle_turns_gaps_into_unknowns() -> None:
    gap = {
        "from_m": 4.0,
        "to_m": 8.0,
        "length_m": 4.0,
        "geometry": {"type": "LineString", "coordinates": [[5.0, 0.0], [9.0, 0.0]]},
    }
    metrics = {"options": {"A": {"gaps": [gap]}, "B": {"gaps": []}}}
    [item] = scenario_bundle.unknowns(metrics)
    assert item["id"] == "terrain-gap-a-1"
    assert item["kind"] == "terrain-gap"
    assert item["geometry"] == gap["geometry"]
    assert (item["from_m"], item["to_m"], item["length_m"]) == (4.0, 8.0, 4.0)
