"""Shared helpers for the offline preparation scripts."""

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

SCENARIO_DIR = Path(__file__).resolve().parents[1] / "data" / "hawksbill_gap"
MANIFEST_PATH = SCENARIO_DIR / "manifest.json"
DERIVED_DIR = SCENARIO_DIR / "derived"
INPUTS_DIR = SCENARIO_DIR / "inputs"


def load_manifest(path: Path = MANIFEST_PATH) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def manifest_input(manifest: dict[str, Any], input_id: str) -> dict[str, Any]:
    for item in manifest["inputs"]:
        if item["id"] == input_id:
            return item
    raise KeyError(f"manifest has no input {input_id!r}")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    path.write_text(text, encoding="utf-8", newline="\n")
