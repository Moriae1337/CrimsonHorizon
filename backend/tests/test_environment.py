"""Checks for the archival environment context (CH26-095 #113, CH26-096 #114).

No network access: everything is read from the committed environment.json.
"""

import math
import re

import pytest
from fastapi.testclient import TestClient

from app import environment as env_module
from app.main import app
from prep.environment_context import hhmm, summarize

client = TestClient(app)
ISO_UTC = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$")
HHMM = re.compile(r"^\d{2}:\d{2}$")
JEZERO_STOPS = {490, 495, 509, 516}  # sample sols at Skinner and Wildcat Ridge


@pytest.fixture(scope="module")
def doc() -> dict:
    response = client.get("/scenarios/hawksbill-gap/environment")
    assert response.status_code == 200
    return response.json()


def test_unknown_scenario_returns_404() -> None:
    response = client.get("/scenarios/olympus-mons/environment")
    assert response.status_code == 404


def test_unsupported_major_returns_503(tmp_path, monkeypatch) -> None:
    bad = tmp_path / "environment.json"
    bad.write_text('{"schema_version": "2.0"}', encoding="utf-8")
    monkeypatch.setitem(env_module.ENVIRONMENT_PATHS, "hawksbill-gap", bad)
    env_module.load_environment.cache_clear()
    try:
        response = client.get("/scenarios/hawksbill-gap/environment")
        assert response.status_code == 503
    finally:
        env_module.load_environment.cache_clear()


def test_every_source_id_resolves(doc: dict) -> None:
    ids = {source["id"] for source in doc["sources"]}
    assert len(ids) == len(doc["sources"])
    for source in doc["sources"]:
        assert source["url"].startswith("https://")
    used = [*doc["weather"]["source_ids"], *doc["radiation"]["source_ids"]]
    used += [s for m in doc["radiation"]["measurements"] for s in m["source_ids"]]
    assert used and set(used) <= ids


def test_weather_covers_sols_490_to_516(doc: dict) -> None:
    weather = doc["weather"]
    assert weather["archival"] is True
    assert weather["sol_range"] == [490, 516]
    sols = [entry["sol"] for entry in weather["sols"]]
    assert sols == list(range(490, 517))
    units = {p["id"]: p["unit"] for p in weather["parameters"]}
    assert units == {"pressure": "Pa", "air_temperature": "K"}


def test_weather_sols_are_dated_and_plausible(doc: dict) -> None:
    previous = None
    for entry in doc["weather"]["sols"]:
        if entry["pressure"] is None and entry["air_temperature"] is None:
            assert entry["utc_start"] is None
            continue
        assert ISO_UTC.match(entry["utc_start"]) and ISO_UTC.match(entry["utc_stop"])
        assert entry["utc_start"].startswith("2022-")
        if previous:
            assert entry["utc_start"] > previous
        previous = entry["utc_start"]
        for key, lo, hi in (("pressure", 500, 1100), ("air_temperature", 150, 300)):
            stats = entry[key]
            if stats is None:
                continue
            assert lo < stats["min"] <= stats["mean"] <= stats["max"] < hi
            assert 0 < stats["hours_with_data"] <= 24
            assert 0 < stats["covered_h"] <= 24
            assert stats["product"]["lid"].startswith("urn:nasa:pds:mars2020_meda:")
            assert re.fullmatch(r"[0-9a-f]{64}", stats["product"]["sha256"])
            for gap in stats["lmst_gaps"]:
                assert HHMM.match(gap["from_lmst"]) and HHMM.match(gap["to_lmst"])
                assert gap["from_lmst"] < gap["to_lmst"]


def test_sample_sols_have_pressure(doc: dict) -> None:
    by_sol = {entry["sol"]: entry for entry in doc["weather"]["sols"]}
    for sol in JEZERO_STOPS:
        assert by_sol[sol]["pressure"] is not None


def test_radiation_is_labelled_gale_not_jezero(doc: dict) -> None:
    rad = doc["radiation"]
    assert rad["archival"] is True
    assert rad["place"]["name"] == "Gale crater"
    lon, lat = rad["place"]["coordinates"]
    assert 137 < lon < 138 and -5 < lat < -4
    assert rad["window"] == {
        "utc_start": "2012-08-07",
        "utc_stop": "2013-06-01",
        "note": rad["window"]["note"],
    }
    assert "Jezero" not in rad["place"]["name"]
    assert any("not at Jezero" in limit for limit in rad["limits"])
    for measurement in rad["measurements"]:
        assert math.isfinite(measurement["value"]) and measurement["unit"]


def test_summarize_reports_gaps_at_edges_and_inside() -> None:
    rows = [(3600.0, 700.0), (3660.0, 710.0), (7200.0, 720.0)]
    stats = summarize(rows)
    assert (stats["min"], stats["max"], stats["samples"]) == (700.0, 720.0, 3)
    assert stats["hours_with_data"] == 2
    assert stats["covered_h"] == 0.0  # 60 s between the first two samples
    assert stats["lmst_gaps"] == [
        {"from_lmst": "00:00", "to_lmst": "01:00"},
        {"from_lmst": "01:01", "to_lmst": "02:00"},
        {"from_lmst": "02:00", "to_lmst": "24:00"},
    ]
    assert hhmm(24 * 3600 + 30) == "24:00"
