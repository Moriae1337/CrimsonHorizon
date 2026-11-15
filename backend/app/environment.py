"""Archival environment context served from committed JSON.

Built offline by prep.environment_context: Perseverance MEDA weather for the
Hawksbill Gap sols (CH26-095) and Curiosity RAD radiation at Gale (CH26-096).
No network request is made at runtime.
"""

import json
from functools import cache
from typing import Any

from app.scenario import DATA_DIR

ENVIRONMENT_PATHS = {
    "hawksbill-gap": DATA_DIR / "hawksbill_gap" / "environment.json",
}
SUPPORTED_MAJOR = "1"


@cache
def load_environment(scenario_id: str) -> dict[str, Any]:
    """Return the environment document, or raise KeyError for an unknown id."""
    path = ENVIRONMENT_PATHS[scenario_id]
    document = json.loads(path.read_text(encoding="utf-8"))
    version = str(document.get("schema_version", ""))
    if version.split(".")[0] != SUPPORTED_MAJOR:
        raise ValueError(f"{path.name}: unsupported schema_version {version!r}")
    return document
