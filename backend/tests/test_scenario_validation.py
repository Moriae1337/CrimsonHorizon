"""Scenario contract validation on load (CH26-036, #54).

A broken bundle must become a controlled 503 while /health and the map
catalog keep responding; additive (MINOR) fields must stay accepted.
"""

import copy
import json
from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import scenario as scenario_module
from app.main import app
from app.scenario import SCENARIO_PATHS, load_scenario
from app.scenario_schema import ScenarioValidationError, validate_scenario

client = TestClient(app)
COMMITTED = json.loads(SCENARIO_PATHS["hawksbill-gap"].read_text(encoding="utf-8"))


def check(document: object) -> None:
    validate_scenario(document, expected_id="hawksbill-gap", name="scenario.json")


def broken(mutate: Callable[[dict], object]) -> dict:
    document = copy.deepcopy(COMMITTED)
    mutate(document)
    return document


def test_committed_scenario_is_valid() -> None:
    check(COMMITTED)


def test_v1_2_bundle_with_pending_evidence_is_valid() -> None:
    check(
        broken(
            lambda d: d.update(
                schema_version="1.2", evidence=[], pending_sections=["evidence"]
            )
        )
    )


def test_additive_fields_are_accepted() -> None:
    def add(doc: dict) -> None:
        doc["schema_version"] = "1.7"
        doc["new_section"] = []
        doc["stops"][0]["hazard_note"] = "extra field"
        doc["route_options"][0]["caution_m"] = 3.0
        doc["unknowns"].append(
            {
                "id": "caution-zone-1",
                "kind": "caution-zone",
                "geometry": {"type": "Polygon", "coordinates": [[[77.4, 18.45]]]},
                "severity": "moderate",
                "source_ids": ["dtm-primary"],
            }
        )

    check(broken(add))


INVALID_CASES: dict[str, tuple[Callable[[dict], object], str]] = {
    "major-2": (lambda d: d.update(schema_version="2.0"), "unsupported schema_version"),
    "no-version": (lambda d: d.pop("schema_version"), "unsupported schema_version"),
    "missing-stops": (lambda d: d.pop("stops"), "stops"),
    "lat-lon-swapped": (
        lambda d: d["stops"][0].update(coordinates=[18.45, 177.4]),
        "latitude 177.4 outside",
    ),
    "short-tuple": (lambda d: d["start"].update(coordinates=[77.4]), "start"),
    "unknown-source": (
        lambda d: d["stops"][0].update(source_ids=["nope"]),
        "unknown sources ['nope']",
    ),
    "empty-source-ids": (
        lambda d: d["routes"]["features"][0]["properties"].update(source_ids=[]),
        "source_ids",
    ),
    "evidence-unknown-source": (
        lambda d: d["evidence"][0].update(source_ids=["nope"]),
        "unknown sources ['nope']",
    ),
    "evidence-no-source": (
        lambda d: d["evidence"][0].update(source_ids=[]),
        "source_ids",
    ),
    "evidence-unknown-stop": (
        lambda d: d["evidence"][0].update(stop_id="start"),
        "unknown stop 'start'",
    ),
    "evidence-multiple-stops": (
        lambda d: d["evidence"][0].update(stop_id=["skinner-ridge", "wildcat-ridge"]),
        "stop_id",
    ),
    "evidence-duplicate-id": (
        lambda d: d["evidence"].append(d["evidence"][0]),
        "duplicate evidence ids",
    ),
    "duplicate-stop": (
        lambda d: d["stops"][1].update(id=d["stops"][0]["id"]),
        "duplicate place and feature ids",
    ),
    "unknown-stop-ref": (
        lambda d: d["route_options"][0].update(stop_ids=["olympus"]),
        "unknown stops",
    ),
    "profile-length": (
        lambda d: d["profiles"][0]["elevation_m"].pop(),
        "elevation_m has",
    ),
    "profile-units": (
        lambda d: d["profiles"][0].update(step_m=0),
        "step_m",
    ),
    "negative-length": (
        lambda d: d["route_options"][0].update(outbound_m=-1),
        "outbound_m",
    ),
    "bad-route-kind": (
        lambda d: d["routes"]["features"][0]["properties"].update(kind="teleport"),
        "kind",
    ),
    "pending-not-list": (
        lambda d: d["pending_sections"].append("title"),
        "pending section 'title'",
    ),
    "wrong-id": (lambda d: d.update(scenario_id="other"), "scenario_id"),
    "http-source": (
        lambda d: d["sources"][0].update(url="http://example.com"),
        "url",
    ),
}


@pytest.mark.parametrize("case", INVALID_CASES)
def test_invalid_scenario_fails_clearly(case: str) -> None:
    mutate, reason = INVALID_CASES[case]
    with pytest.raises(ScenarioValidationError, match="scenario.json") as info:
        check(broken(mutate))
    assert reason in str(info.value)


def test_non_object_document_fails() -> None:
    with pytest.raises(ScenarioValidationError, match="JSON object"):
        check([])


@pytest.fixture
def scenario_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Path]:
    path = tmp_path / "scenario.json"
    monkeypatch.setitem(scenario_module.SCENARIO_PATHS, "hawksbill-gap", path)
    load_scenario.cache_clear()
    yield path
    load_scenario.cache_clear()


def assert_unavailable_but_app_alive() -> None:
    response = client.get("/scenarios/hawksbill-gap")
    assert response.status_code == 503
    assert response.json() == {"detail": "Scenario temporarily unavailable"}
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/terrain/layers").status_code == 200
    assert client.get("/terrain/landmarks").status_code == 200


def test_invalid_bundle_returns_503_and_app_stays_up(
    scenario_file: Path, caplog: pytest.LogCaptureFixture
) -> None:
    document = broken(lambda d: d["stops"][0].update(source_ids=["nope"]))
    scenario_file.write_text(json.dumps(document), encoding="utf-8")
    assert_unavailable_but_app_alive()
    assert "unknown sources" in caplog.text


@pytest.mark.parametrize("content", [None, "{not json", "[]"])
def test_missing_or_malformed_bundle_returns_503(
    scenario_file: Path, content: str | None
) -> None:
    if content is not None:
        scenario_file.write_text(content, encoding="utf-8")
    assert_unavailable_but_app_alive()


def test_bundle_recovers_after_fix(scenario_file: Path) -> None:
    scenario_file.write_text("{}", encoding="utf-8")
    assert client.get("/scenarios/hawksbill-gap").status_code == 503
    scenario_file.write_text(json.dumps(COMMITTED), encoding="utf-8")
    assert client.get("/scenarios/hawksbill-gap").status_code == 200
