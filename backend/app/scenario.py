"""Prepared field scenarios served from committed JSON.

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

__all__ = ["DATA_DIR", "SCENARIO_PATHS", "load_scenario"]


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
