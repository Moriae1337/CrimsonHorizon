"""Prepared field scenarios served from committed JSON (specs/scenario-api.md).

Each document is built offline by prep.scenario_bundle and read once per
process. No network request is made at runtime. The document is checked
against the v1 contract (app.scenario_schema) before it is served.
"""

import json
from functools import cache
from pathlib import Path
from typing import Any

from app.scenario_schema import validate_scenario

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
SCENARIO_PATHS = {
    "hawksbill-gap": DATA_DIR / "hawksbill_gap" / "scenario.json",
}
SLOPE_PATHS = {
    "hawksbill-gap": DATA_DIR / "hawksbill_gap" / "slope_overlay.json",
}

__all__ = [
    "DATA_DIR",
    "SCENARIO_PATHS",
    "SLOPE_PATHS",
    "load_scenario",
    "load_slope_overlay",
]


@cache
def load_scenario(scenario_id: str) -> dict[str, Any]:
    """Return the validated scenario document.

    Raises KeyError for an unknown id, OSError for a missing or unreadable file,
    and ValueError (including ScenarioValidationError) for invalid JSON or a
    document that breaks the contract. Failures are not cached.
    """
    path = SCENARIO_PATHS[scenario_id]
    document = json.loads(path.read_text(encoding="utf-8"))
    validate_scenario(document, expected_id=scenario_id, name=path.name)
    return document


@cache
def load_slope_overlay(scenario_id: str) -> dict[str, Any]:
    """Return the precomputed slope overlay document.

    Raises KeyError for an unknown id, FileNotFoundError if the file does not exist,
    OSError for an unreadable file, and ValueError for invalid JSON or malformed content.
    Failures are not cached.
    """
    if scenario_id not in SLOPE_PATHS:
        raise KeyError(scenario_id)
    path = SLOPE_PATHS[scenario_id]
    if not path.is_file():
        raise FileNotFoundError(f"Slope overlay not found: {path}")
    document: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    if (
        not isinstance(document, dict)
        or "grid" not in document
        or "slope_degrees" not in document
        or "values" not in document
    ):
        raise ValueError(f"{path.name}: malformed slope overlay document")
    document.setdefault("scenario_id", scenario_id)
    return document
