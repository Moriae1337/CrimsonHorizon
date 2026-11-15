"""Prepared field scenarios served from committed JSON.

Each document is built offline by prep.scenario_bundle and read once per
process. No network request is made at runtime.
"""

import json
from functools import cache
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
SCENARIO_PATHS = {
    "hawksbill-gap": DATA_DIR / "hawksbill_gap" / "scenario.json",
}
SUPPORTED_MAJOR = "1"


@cache
def load_scenario(scenario_id: str) -> dict[str, Any]:
    """Return the scenario document, or raise KeyError for an unknown id."""
    path = SCENARIO_PATHS[scenario_id]
    document = json.loads(path.read_text(encoding="utf-8"))
    version = str(document.get("schema_version", ""))
    if version.split(".")[0] != SUPPORTED_MAJOR:
        raise ValueError(f"{path.name}: unsupported schema_version {version!r}")
    return document
