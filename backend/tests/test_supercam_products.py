"""Checks for the verified SuperCam product records (CH26-018, #36)."""

import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "backend" / "data" / "hawksbill_gap" / "manifest.json"

EXPECTED = {
    "supercam-berry-hollow": {"sol": 515, "target": "Berry_Hollow_515_scam"},
    "supercam-thornton-gap": {"sol": 493, "target": "Thornton_Gap_493_scam"},
}


@pytest.fixture(scope="module")
def inputs() -> dict:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {item["id"]: item for item in manifest["inputs"]}


@pytest.mark.parametrize("input_id", sorted(EXPECTED))
def test_supercam_provenance_is_recorded(inputs: dict, input_id: str) -> None:
    item = inputs[input_id]
    check = item["verification"]
    expected = EXPECTED[input_id]

    assert check["sol"] == expected["sol"]
    assert check["target"] == expected["target"]
    assert check["processing_level"] == "Calibrated"
    assert check["measurement_condition"]
    assert item["doi"] == "10.17189/1522646"
    assert item["url"].startswith("https://pds-geosciences.wustl.edu/")

    # Version, sol and target must agree with the cited identifiers.
    assert f"label version {check['version_id']}" in item["title"]
    assert f"_{expected['sol']:04d}_" in item["product_id"]
    assert expected["target"].lower().removesuffix("_scam") in item["product_id"]
    assert item["url"].removesuffix(".xml") == check["data_url"].removesuffix(".fits")

    for key in ("data_sha256", "label_sha256"):
        assert re.fullmatch(r"[0-9a-f]{64}", check[key])


@pytest.mark.parametrize("input_id", sorted(EXPECTED))
def test_supercam_quality_flags_are_consistent(inputs: dict, input_id: str) -> None:
    check = inputs[input_id]["verification"]
    quality = check["quality"]
    low, high = check["wavelength_um"]

    assert check["spectral_channels"] == 256
    assert quality["glitch"] + quality["spike"] == len(quality["flagged_um"])
    assert all(low <= um <= high for um in quality["flagged_um"])
