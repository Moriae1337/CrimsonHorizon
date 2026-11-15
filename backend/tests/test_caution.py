"""Checks for caution zones and obstacles (CH26-028, #46).

Synthetic paths use a sphere with R = 180 / pi m, so one degree of longitude on
the equator is exactly 1 m. No network access and no rasterio.
"""

import json
import math

import pytest

from prep import caution, profiles, scenario_bundle
from prep.common import load_manifest

UNIT_RADIUS_M = 180 / math.pi
ZONE_KINDS = {"terrain-gap", "connector", "observation-approach", "steep-segment"}


@pytest.fixture(scope="module")
def scenario() -> dict:
    return json.loads(scenario_bundle.SCENARIO_PATH.read_text(encoding="utf-8"))


# Grade helpers ----------------------------------------------------------------


def test_graded_intervals_skip_invalid_pairs() -> None:
    intervals = profiles.graded_intervals([0.0, 2.0, 4.0, 6.0], [0.0, 2.0, None, 1.0])
    assert intervals == [(0.0, 2.0, pytest.approx(45.0))]


def test_grade_classes_are_bins_without_a_verdict() -> None:
    assert profiles.grade_class(0.0) == "0-5"
    assert profiles.grade_class(14.99) == "10-15"
    assert profiles.grade_class(15.0) == "15-20"
    assert profiles.grade_class(31.0) == "25+"
    classes = profiles.grade_class_m([(0.0, 2.0, 3.0), (2.0, 5.0, 21.0)])
    assert list(classes) == ["0-5", "5-10", "10-15", "15-20", "20-25", "25+"]
    assert classes["0-5"] == 2.0 and classes["20-25"] == 3.0
    assert sum(classes.values()) == 5.0


def test_steepest_and_span_max_grade() -> None:
    intervals = [(0.0, 2.0, 5.0), (2.0, 4.0, 9.0), (4.0, 6.0, 9.0), (6.0, 8.0, 1.0)]
    assert profiles.steepest(intervals) == (2.0, 4.0, 9.0)
    assert profiles.steepest([]) is None
    # Touching an interval only at its end does not count as overlap.
    assert profiles.span_max_grade(intervals, 6.0, 8.0) == 1.0
    assert profiles.span_max_grade(intervals, 5.0, 7.0) == 9.0
    assert profiles.span_max_grade([], 0.0, 1.0) is None


# Zones on a synthetic route ---------------------------------------------------


def piece(kind: str, coords: list, proposed: bool = False) -> dict:
    props = {"option": "A", "leg": "outbound", "kind": kind, "proposed": proposed}
    return {"properties": props, "geometry": {"coordinates": coords}}


ROUTES = {
    "features": [
        piece("historical", [[0.0, 0.0], [20.0, 0.0]]),
        piece("connector", [[20.0, 0.0], [25.0, 0.0]], proposed=True),
        piece("historical", [[25.0, 0.0], [40.0, 0.0]]),
    ]
}
STOPS = [
    {"id": "skinner-ridge", "name": "Skinner Ridge", "coordinates": [22.0, 0.003]},
    {"id": "wildcat-ridge", "name": "Wildcat Ridge", "coordinates": [40.0, 0.0]},
]


def synthetic_metrics() -> dict:
    steepest = {
        "from_m": 30.0,
        "to_m": 32.0,
        "length_m": 2.0,
        "grade_deg": 21.0,
        "grade_class": "20-25",
        "geometry": {"type": "LineString", "coordinates": [[30.0, 0.0], [32.0, 0.0]]},
    }
    return {
        "sphere_radius_m": UNIT_RADIUS_M,
        "options": {
            "A": {
                "gaps": [],
                "caution": {
                    "steps": {"2": {"steepest": steepest}, "5": {"steepest": None}},
                    "proposed": [
                        {
                            "from_m": 20.0,
                            "to_m": 25.0,
                            "length_m": 5.0,
                            "step_m": 2.0,
                            "max_grade_deg": 7.0,
                        }
                    ],
                },
            }
        },
    }


def test_proposed_spans_follow_piece_order() -> None:
    spans = profiles.proposed_spans(ROUTES, "A", UNIT_RADIUS_M)
    assert spans == [pytest.approx((20.0, 25.0))]


def test_closest_point_projects_onto_the_path() -> None:
    along, offset = caution.closest_point(
        profiles.outbound_line(ROUTES, "A"), [22.0, 0.003], UNIT_RADIUS_M
    )
    assert along == pytest.approx(22.0)
    assert offset == pytest.approx(0.003, rel=1e-3)


def test_synthetic_zones() -> None:
    zones = caution.caution_zones(
        ROUTES, synthetic_metrics(), STOPS, {"A": ["wildcat-ridge"]}
    )
    by_id = {z["id"]: z for z in zones}
    assert list(by_id) == [
        "connector-a-1",
        "observation-approach-a-skinner-ridge",
        "observation-approach-a-wildcat-ridge",
        "steep-segment-a-2m",
    ]
    assert all(z["review_status"] == "open" for z in zones)

    connector = by_id["connector-a-1"]
    assert (connector["from_m"], connector["to_m"]) == (20.0, 25.0)
    assert connector["geometry"]["coordinates"] == [[20.0, 0.0], [25.0, 0.0]]
    grades = connector["uncertainty"]["max_grade_deg"]
    assert grades == {"dtm-primary": 7.0, "dtm-fallback": 22.0}

    standoff = by_id["observation-approach-a-skinner-ridge"]
    assert standoff["approach"] == "stand-off"
    assert standoff["uncertainty"]["kind"] == "contact-visibility"
    assert (standoff["from_m"], standoff["to_m"]) == (12.0, 22.0)

    visit = by_id["observation-approach-a-wildcat-ridge"]
    assert visit["approach"] == "visit" and "uncertainty" not in visit
    assert (visit["from_m"], visit["to_m"]) == (30.0, 40.0)

    steep = by_id["steep-segment-a-2m"]
    assert (steep["step_m"], steep["grade_deg"]) == (2.0, 21.0)
    assert "safe" not in steep["grade_class"]


def test_option_clears_only_when_every_zone_and_obstacle_is_reviewed() -> None:
    zones = [
        {"id": "z1", "option": "A", "review_status": "open"},
        {"id": "z2", "option": "B", "review_status": "reviewed"},
    ]
    obstacles = caution.obstacles({"A": [], "B": []})
    a = caution.review(zones, obstacles, "A")
    assert a["open_zone_ids"] == ["z1"] and not a["cleared"]
    assert a["safety_verdict"] is None
    reviewed = [{**o, "review_status": "reviewed"} for o in obstacles]
    b = caution.review(zones, reviewed, "B")
    assert b["cleared"] and b["zones"] == 1 and b["obstacles"] == 2


# Committed scenario -----------------------------------------------------------


def test_every_unknown_is_an_open_caution_zone_on_its_route(scenario: dict) -> None:
    outbound = {o["id"]: o["outbound_m"] for o in scenario["route_options"]}
    for item in scenario["unknowns"]:
        assert item["kind"] in ZONE_KINDS
        assert item["review_status"] in caution.STATUSES
        assert 0 <= item["from_m"] < item["to_m"] <= outbound[item["option"]] + 0.01
        assert item["length_m"] == pytest.approx(
            item["to_m"] - item["from_m"], abs=0.01
        )
        assert len(item["geometry"]["coordinates"]) >= 2
        assert item["summary"]


def test_option_a_shows_connector_and_contact_visibility(scenario: dict) -> None:
    a = [u for u in scenario["unknowns"] if u["option"] == "A"]
    [connector] = [u for u in a if u["kind"] == "connector"]
    route = scenario["routes"]["features"]
    [piece_a] = [
        f
        for f in route
        if f["id"].startswith("a-outbound") and f["properties"]["proposed"]
    ]
    assert connector["length_m"] == pytest.approx(
        piece_a["properties"]["length_m"], abs=0.01
    )
    grades = connector["uncertainty"]["max_grade_deg"]
    # Scope, model sensitivity: about 7 deg (primary) against 22 deg (fallback).
    assert grades["dtm-primary"] == pytest.approx(7.0, abs=0.5)
    assert grades["dtm-fallback"] == 22.0
    assert {"dtm-primary", "dtm-fallback"} <= set(connector["source_ids"])

    [standoff] = [u for u in a if u.get("approach") == "stand-off"]
    assert standoff["stop_id"] == "skinner-ridge"
    assert standoff["uncertainty"]["kind"] == "contact-visibility"
    b = [u for u in scenario["unknowns"] if u["option"] == "B"]
    assert not any(u["kind"] == "connector" for u in b)
    assert not any(u.get("approach") == "stand-off" for u in b)


def test_steep_segments_match_the_locked_grades(scenario: dict) -> None:
    for option in scenario["route_options"]:
        steep = {
            u["step_m"]: u
            for u in scenario["unknowns"]
            if u["option"] == option["id"] and u["kind"] == "steep-segment"
        }
        assert set(steep) == {2.0, 5.0}
        for step, item in steep.items():
            assert item["grade_deg"] == option["max_grade_deg"][f"{step:g}"]
            assert item["length_m"] <= step
        for classes in option["grade_class_m"].values():
            assert sum(classes.values()) == pytest.approx(
                option["outbound_m"], abs=0.05
            )


def test_both_options_expose_review_status(scenario: dict) -> None:
    for option in scenario["route_options"]:
        review = option["caution_review"]
        mine = [u["id"] for u in scenario["unknowns"] if u["option"] == option["id"]]
        assert review["open_zone_ids"] == mine
        assert review["zones"] == len(mine) > 0
        assert review["cleared"] is False
        assert review["safety_verdict"] is None


def test_each_obstacle_links_to_its_pds_figure(scenario: dict) -> None:
    pds = {i["id"]: i["url"] for i in load_manifest()["inputs"]}["pds-initial-reports"]
    stops = {s["id"] for s in scenario["stops"]}
    ids = [o["id"] for o in scenario["obstacles"]]
    assert ids == ["bettys-rock", "skinner-ridge-east-crack-overhang"]
    for item in scenario["obstacles"]:
        figure = item["figure"]
        assert figure["source_id"] in item["source_ids"]
        assert figure["url"] == pds
        assert (figure["section"], figure["figure"]) == ("11", "5")
        assert item["stop_id"] in stops
        assert item["coordinates"] is None  # the report gives no coordinates
        assert item["review_status"] == "open"
