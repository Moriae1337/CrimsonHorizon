"""Checks for the scenario API (CH26-042) and its committed document.

No network access and no rasterio: everything is read from committed files.
"""

import itertools
import json
import math

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.scenario import SCENARIO_PATHS, load_scenario
from prep import scenario_bundle

client = TestClient(app)
LON_RANGE = (77.39, 77.42)
LAT_RANGE = (18.44, 18.47)


@pytest.fixture(scope="module")
def doc() -> dict:
    response = client.get("/scenarios/hawksbill-gap")
    assert response.status_code == 200
    return response.json()


def points(doc: dict):
    yield doc["start"]["coordinates"]
    for stop in doc["stops"]:
        yield stop["coordinates"]
    for collection in ("routes", "rover_track"):
        for feature in doc[collection]["features"]:
            yield from feature["geometry"]["coordinates"]


def cited(doc: dict):
    yield doc["start"]
    yield from doc["stops"]
    for collection in ("routes", "rover_track"):
        for feature in doc[collection]["features"]:
            yield feature["properties"]
    yield from doc["evidence"]


def test_unknown_scenario_returns_404() -> None:
    response = client.get("/scenarios/olympus-mons")
    assert response.status_code == 404
    assert response.json() == {"detail": "Scenario not found"}


def test_scenario_has_v1_shape(doc: dict) -> None:
    assert doc["schema_version"].startswith("1.")
    assert doc["scenario_id"] == "hawksbill-gap"
    assert doc["conventions"]["coordinate_order"] == ["lon", "lat", "elev_m"]
    assert doc["pending_sections"] == ["evidence", "profiles", "unknowns"]
    for section in doc["pending_sections"]:
        assert doc[section] == []
    assert [o["id"] for o in doc["route_options"]] == ["A", "B"]
    assert [s["id"] for s in doc["stops"]] == ["skinner-ridge", "wildcat-ridge"]
    assert doc["start"]["rmc"] == "25_446"


def test_coordinates_are_lon_lat_inside_the_extent(doc: dict) -> None:
    box = doc["extent"]
    assert box["lon_min"] < box["lon_max"] and box["lat_min"] < box["lat_max"]
    count = 0
    for point in points(doc):
        count += 1
        assert len(point) in (2, 3)
        assert all(isinstance(v, int | float) and math.isfinite(v) for v in point)
        lon, lat = point[:2]
        assert LON_RANGE[0] <= lon <= LON_RANGE[1], point
        assert LAT_RANGE[0] <= lat <= LAT_RANGE[1], point
        assert box["lon_min"] <= lon <= box["lon_max"], point
        assert box["lat_min"] <= lat <= box["lat_max"], point
        if len(point) == 3:
            assert -2600 < point[2] < -2450, point
    assert count > 100


def test_every_source_id_resolves(doc: dict) -> None:
    source_ids = {s["id"] for s in doc["sources"]}
    for item in cited(doc):
        assert item["source_ids"], item
        assert set(item["source_ids"]) <= source_ids, item["source_ids"]
    for source in doc["sources"]:
        assert source["url"].startswith("https://")
        assert source["credit"] and source["license"] and source["title"]
        assert "doi" in source


def test_ids_are_unique(doc: dict) -> None:
    ids = (
        [doc["start"]["id"]]
        + [s["id"] for s in doc["stops"]]
        + [f["id"] for f in doc["routes"]["features"]]
        + [f["id"] for f in doc["rover_track"]["features"]]
    )
    assert len(ids) == len(set(ids))
    assert len({s["id"] for s in doc["sources"]}) == len(doc["sources"])
    assert len({o["id"] for o in doc["route_options"]}) == len(doc["route_options"])


def test_route_pieces_flag_proposed_geometry(doc: dict) -> None:
    features = doc["routes"]["features"]
    assert len(features) == 8
    for feature in features:
        props = feature["properties"]
        option, leg, order = props["option"], props["leg"], props["order"]
        assert feature["id"] == f"{option.lower()}-{leg}-{order}"
        if props["kind"] == "connector":
            assert props["proposed"] is True
            assert props["sols"] == []
            assert props["note"]
        else:
            assert props["kind"] == "historical"
            assert props["proposed"] is False
            assert props["sols"]
    options = {o["id"]: o for o in doc["route_options"]}
    for option, info in options.items():
        proposed = sum(
            f["properties"]["length_m"]
            for f in features
            if f["properties"]["option"] == option
            and f["properties"]["leg"] == "outbound"
            and f["properties"]["proposed"]
        )
        assert proposed == pytest.approx(info["proposed_m"], abs=0.01)
    assert options["A"]["proposed_m"] > 0
    assert options["B"]["proposed_m"] == 0


def test_rover_track_is_one_feature_per_drive(doc: dict) -> None:
    features = doc["rover_track"]["features"]
    sols = [f["properties"]["sol"] for f in features]
    assert sols == sorted(sols) and len(sols) == 10
    for previous, current in itertools.pairwise(features):
        assert previous["properties"]["to_rmc"] == current["properties"]["from_rmc"]
    assert features[0]["properties"]["from_rmc"] == doc["start"]["rmc"]


def test_document_has_no_nan_or_infinity() -> None:
    json.dumps(load_scenario("hawksbill-gap"), allow_nan=False)
    text = SCENARIO_PATHS["hawksbill-gap"].read_text(encoding="utf-8")
    json.loads(text, parse_constant=pytest.fail)


def test_committed_document_matches_a_fresh_build() -> None:
    committed = json.loads(scenario_bundle.SCENARIO_PATH.read_text(encoding="utf-8"))
    fresh = scenario_bundle.build(
        *scenario_bundle.load_inputs(), generated_at=committed["generated_at"]
    )
    assert committed == json.loads(json.dumps(fresh, allow_nan=False))


def test_app_reads_the_bundled_file() -> None:
    assert SCENARIO_PATHS["hawksbill-gap"] == scenario_bundle.SCENARIO_PATH


def test_cors_allows_scenario_get_from_local_origin() -> None:
    response = client.get(
        "/scenarios/hawksbill-gap", headers={"Origin": "http://localhost:5173"}
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
