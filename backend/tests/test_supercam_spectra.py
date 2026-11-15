"""Unit tests for calibrated SuperCam spectra export (CH26-039, #57)."""

import struct
from pathlib import Path
from typing import Any

import pytest

from prep.supercam_spectra import (
    CITATION,
    DISPLAY_CREDIT,
    OUTPUT_PATH,
    UNIT_CONFIRMATION_NOTE,
    extract_spectrum_records,
    filter_quality_series,
    get_target,
    load_supercam_spectra,
    parse_fits_hdus,
    sort_records_ascending,
    verify_xml_label,
)

ROOT = Path(__file__).resolve().parents[2]
PRETTIERIGNORE = ROOT / ".prettierignore"


@pytest.fixture(scope="module")
def spectra_bundle() -> dict[str, Any]:
    """Load the exported SuperCam spectra JSON bundle."""
    assert OUTPUT_PATH.is_file(), f"Expected {OUTPUT_PATH} to exist"
    return load_supercam_spectra(OUTPUT_PATH)


def test_prettierignore_contains_supercam_spectra() -> None:
    """Verify backend/data/hawksbill_gap/supercam_spectra.json is in .prettierignore."""
    content = PRETTIERIGNORE.read_text(encoding="utf-8")
    assert "backend/data/hawksbill_gap/supercam_spectra.json" in content


def test_bundle_metadata(spectra_bundle: dict[str, Any]) -> None:
    """Check root schema metadata and citations."""
    assert spectra_bundle["schema_version"] == "1.0"
    assert spectra_bundle["scenario_id"] == "hawksbill-gap"
    assert spectra_bundle["citation"] == CITATION
    assert spectra_bundle["display_credit"] == DISPLAY_CREDIT
    assert spectra_bundle["doi"] == "10.17189/1522646"
    assert spectra_bundle["wavelength_unit"] == "µm"
    assert "reflectance factor" in spectra_bundle["reflectance_unit"].lower()
    assert "I/F" in spectra_bundle["reflectance_unit"]
    assert spectra_bundle["unit_confirmation_note"] == UNIT_CONFIRMATION_NOTE
    assert "berry_hollow" in spectra_bundle["targets"]
    assert "thornton_gap" in spectra_bundle["targets"]
    assert len(spectra_bundle["spectra"]) == 2


@pytest.mark.parametrize(
    "key,expected_sol,expected_stop,expected_valid,expected_flagged",
    [
        ("berry_hollow", 515, "wildcat-ridge", 251, 5),
        ("thornton_gap", 493, "skinner-ridge", 248, 8),
    ],
)
def test_target_metadata_and_counts(
    spectra_bundle: dict[str, Any],
    key: str,
    expected_sol: int,
    expected_stop: str,
    expected_valid: int,
    expected_flagged: int,
) -> None:
    """Check target properties, sol, and channel counts."""
    target = spectra_bundle["targets"][key]
    assert target["sol"] == expected_sol
    assert target["stop_id"] == expected_stop
    assert target["total_channels"] == 256
    assert target["valid_channels"] == expected_valid
    assert target["flagged_channels_count"] == expected_flagged
    assert len(target["series"]) == expected_valid
    assert len(target["filtered_series"]) == expected_valid
    assert len(target["flagged_channels"]) == expected_flagged
    assert len(target["all_channels"]) == 256


@pytest.mark.parametrize("key", ["berry_hollow", "thornton_gap"])
def test_wavelength_sorting_ascending(spectra_bundle: dict[str, Any], key: str) -> None:
    """Verify wavelength channels are sorted in strictly ascending order."""
    target = spectra_bundle["targets"][key]
    wavelengths = [pt["wavelength_um"] for pt in target["series"]]

    assert min(wavelengths) >= 1.31
    assert max(wavelengths) <= 2.60

    # Strictly monotonic ascending
    for i in range(len(wavelengths) - 1):
        assert wavelengths[i] < wavelengths[i + 1], (
            f"Wavelengths not ascending at index {i}: {wavelengths[i]} >= {wavelengths[i + 1]}"
        )

    all_wavelengths = [pt["wavelength_um"] for pt in target["all_channels"]]
    for i in range(len(all_wavelengths) - 1):
        assert all_wavelengths[i] < all_wavelengths[i + 1]


@pytest.mark.parametrize("key", ["berry_hollow", "thornton_gap"])
def test_quality_flags_filtering(spectra_bundle: dict[str, Any], key: str) -> None:
    """Verify that series points have quality_flag == 0 and flagged points have quality_flag == 1."""
    target = spectra_bundle["targets"][key]

    for pt in target["series"]:
        assert pt["quality_flag"] == 0, (
            f"Found non-zero quality_flag in clean series: {pt}"
        )

    for pt in target["flagged_channels"]:
        assert pt["quality_flag"] == 1, (
            f"Found unexpected quality_flag in flagged channels: {pt}"
        )
        assert pt["glitch"] > 0 or pt["spike"] > 0 or pt["saturation"] > 0


def test_berry_hollow_flagged_channels(spectra_bundle: dict[str, Any]) -> None:
    """Check Berry Hollow flagged channels match known glitches and spikes."""
    target = spectra_bundle["targets"]["berry_hollow"]
    summary = target["quality_summary"]
    assert summary["saturated"] == 0
    assert summary["glitch"] == 3
    assert summary["spike"] == 2
    assert summary["quality_flag_0"] == 251
    assert summary["quality_flag_1"] == 5

    flagged_wl = [round(pt["wavelength_um"], 4) for pt in target["flagged_channels"]]
    assert flagged_wl == [1.5162, 2.4224, 2.4760, 2.5036, 2.5606]


def test_thornton_gap_flagged_channels(spectra_bundle: dict[str, Any]) -> None:
    """Check Thornton Gap flagged channels match known spikes."""
    target = spectra_bundle["targets"]["thornton_gap"]
    summary = target["quality_summary"]
    assert summary["saturated"] == 0
    assert summary["glitch"] == 0
    assert summary["spike"] == 8
    assert summary["quality_flag_0"] == 248
    assert summary["quality_flag_1"] == 8

    flagged_wl = [round(pt["wavelength_um"], 4) for pt in target["flagged_channels"]]
    assert flagged_wl == [
        1.4269,
        1.4299,
        1.5028,
        1.5727,
        1.8477,
        1.8733,
        2.1637,
        2.1778,
    ]


def test_reflectance_ranges(spectra_bundle: dict[str, Any]) -> None:
    """Verify I_F_Atm values match documented reflectance factor ranges."""
    bh = spectra_bundle["targets"]["berry_hollow"]
    tg = spectra_bundle["targets"]["thornton_gap"]

    # Berry Hollow is abraded dark rock, I/F roughly 0.0528 to 0.0690
    assert bh["i_f_atm_min"] == pytest.approx(0.052839, abs=0.001)
    assert bh["i_f_atm_max"] == pytest.approx(0.069017, abs=0.001)

    # Thornton Gap is brighter sandstone, I/F roughly 0.3385 to 0.4991
    assert tg["i_f_atm_min"] == pytest.approx(0.338477, abs=0.001)
    assert tg["i_f_atm_max"] == pytest.approx(0.49911, abs=0.001)

    # All values positive
    for pt in bh["series"]:
        assert 0.0 < pt["i_f_atm"] < 1.0
    for pt in tg["series"]:
        assert 0.0 < pt["i_f_atm"] < 1.0


def test_get_target_helper(spectra_bundle: dict[str, Any]) -> None:
    """Check get_target resolves targets by key, input_id, or stop_id."""
    bh1 = get_target(spectra_bundle, "berry_hollow")
    bh2 = get_target(spectra_bundle, "supercam-berry-hollow")
    bh3 = get_target(spectra_bundle, "wildcat-ridge")
    bh4 = get_target(spectra_bundle, "Berry Hollow")

    assert bh1["sol"] == 515
    assert bh1 == bh2 == bh3 == bh4

    tg1 = get_target(spectra_bundle, "thornton_gap")
    tg2 = get_target(spectra_bundle, "supercam-thornton-gap")
    tg3 = get_target(spectra_bundle, "skinner-ridge")
    tg4 = get_target(spectra_bundle, "Thornton Gap")

    assert tg1["sol"] == 493
    assert tg1 == tg2 == tg3 == tg4

    with pytest.raises(KeyError, match="Target 'unknown' not found"):
        get_target(spectra_bundle, "unknown")


# Pure function unit tests with synthetic data --------------------------------


def test_sort_records_ascending_pure() -> None:
    """Verify descending records are properly inverted by sort_records_ascending."""
    records = [
        {"wavelength_um": 2.5, "i_f_atm": 0.1},
        {"wavelength_um": 1.5, "i_f_atm": 0.2},
        {"wavelength_um": 2.0, "i_f_atm": 0.15},
    ]
    sorted_recs = sort_records_ascending(records)
    assert [r["wavelength_um"] for r in sorted_recs] == [1.5, 2.0, 2.5]


def test_filter_quality_series_pure() -> None:
    """Verify quality filtering splits clean vs flagged records correctly."""
    records = [
        {
            "wavelength_um": 1.4,
            "i_f_atm": 0.1,
            "quality_flag": 0,
            "saturation": 0,
            "glitch": 0,
            "spike": 0,
        },
        {
            "wavelength_um": 1.5,
            "i_f_atm": 0.2,
            "quality_flag": 1,
            "saturation": 0,
            "glitch": 1,
            "spike": 0,
        },
        {
            "wavelength_um": 1.6,
            "i_f_atm": 0.3,
            "quality_flag": 0,
            "saturation": 0,
            "glitch": 0,
            "spike": 0,
        },
        {
            "wavelength_um": 1.7,
            "i_f_atm": 0.4,
            "quality_flag": 1,
            "saturation": 0,
            "glitch": 0,
            "spike": 1,
        },
    ]
    clean, flagged, summary = filter_quality_series(records)
    assert len(clean) == 2
    assert [c["wavelength_um"] for c in clean] == [1.4, 1.6]
    assert len(flagged) == 2
    assert [f["wavelength_um"] for f in flagged] == [1.5, 1.7]
    assert summary["glitch"] == 1
    assert summary["spike"] == 1
    assert summary["quality_flag_0"] == 2
    assert summary["quality_flag_1"] == 2


def test_verify_xml_label_pure() -> None:
    """Verify XML parsing extracts LID, title, and I_F_Atm description."""
    sample_xml = b"""<?xml version="1.0" encoding="UTF-8"?>
    <Product_Observational xmlns="http://pds.nasa.gov/pds4/pds/v1">
      <Identification_Area>
        <logical_identifier>urn:nasa:pds:mock:product</logical_identifier>
        <title>Mock SuperCam Spectra</title>
      </Identification_Area>
      <File_Area_Observational>
        <Table_Binary>
          <Record_Binary>
            <Field_Binary>
              <name>I_F_Atm</name>
              <unit>W/m2/sr/um</unit>
              <description>Reflectance corrected for atmospheric absorption</description>
            </Field_Binary>
          </Record_Binary>
        </Table_Binary>
      </File_Area_Observational>
    </Product_Observational>"""

    info = verify_xml_label(sample_xml)
    assert info["logical_identifier"] == "urn:nasa:pds:mock:product"
    assert info["title"] == "Mock SuperCam Spectra"
    assert "Reflectance" in info["i_f_atm_description"]
    assert info["label_unit_string"] == "W/m2/sr/um"


def test_parse_fits_hdus_and_extract_records_pure() -> None:
    """Verify pure FITS parsing and record extraction with synthetic 256-channel binary table."""

    def make_header_block(cards: list[str]) -> bytes:
        block = "".join(c.ljust(80) for c in cards)
        block += "END".ljust(80)
        # Pad to 2880
        rem = len(block) % 2880
        if rem != 0:
            block += " " * (2880 - rem)
        return block.encode("latin1")

    # Primary HDU
    primary_hdr = make_header_block(
        [
            "SIMPLE  =                    T",
            "BITPIX  =                    8",
            "NAXIS   =                    0",
            "EXTEND  =                    T",
        ]
    )

    # HDU 1: SPECTRA (256 rows, 48 bytes per row)
    spectra_hdr = make_header_block(
        [
            "XTENSION= 'BINTABLE'",
            "BITPIX  =                    8",
            "NAXIS   =                    2",
            "NAXIS1  =                   48",
            "NAXIS2  =                  256",
            "PCOUNT  =                    0",
            "GCOUNT  =                    1",
            "TFIELDS =                    6",
            "EXTNAME = 'SPECTRA '",
        ]
    )
    # 6 doubles: DN, Radiance, I_F, I_F_atm, F_Sky, AtmTrans
    spectra_data = bytearray()
    for i in range(256):
        spectra_data += struct.pack(
            ">6d", 100.0, 0.005, 0.05, 0.055 + i * 0.0001, 0.01, 0.95
        )
    # Pad to 2880
    pad_len = ((len(spectra_data) + 2879) // 2880) * 2880 - len(spectra_data)
    spectra_data += b"\x00" * pad_len

    # HDU 2: WAVELENGTH (256 rows, 16 bytes per row)
    wave_hdr = make_header_block(
        [
            "XTENSION= 'BINTABLE'",
            "BITPIX  =                    8",
            "NAXIS   =                    2",
            "NAXIS1  =                   16",
            "NAXIS2  =                  256",
            "PCOUNT  =                    0",
            "GCOUNT  =                    1",
            "TFIELDS =                    2",
            "EXTNAME = 'WAVELENGTH'",
        ]
    )
    wave_data = bytearray()
    # Descending wavelengths from 2.59 to 1.31
    for i in range(256):
        w = 2.59 - i * (2.59 - 1.31) / 255
        wave_data += struct.pack(">2d", w, 20.0)
    pad_len = ((len(wave_data) + 2879) // 2880) * 2880 - len(wave_data)
    wave_data += b"\x00" * pad_len

    # HDU 3: DATA QUALITY (256 rows, 32 bytes per row)
    qual_hdr = make_header_block(
        [
            "XTENSION= 'BINTABLE'",
            "BITPIX  =                    8",
            "NAXIS   =                    2",
            "NAXIS1  =                   32",
            "NAXIS2  =                  256",
            "PCOUNT  =                    0",
            "GCOUNT  =                    1",
            "TFIELDS =                    4",
            "EXTNAME = 'DATA QUALITY'",
        ]
    )
    qual_data = bytearray()
    for i in range(256):
        # Spike at row 10
        sp = 1.0 if i == 10 else 0.0
        qual_data += struct.pack(">4d", 0.0, 0.0, sp, 0.001)
    pad_len = ((len(qual_data) + 2879) // 2880) * 2880 - len(qual_data)
    qual_data += b"\x00" * pad_len

    fits_bytes = (
        primary_hdr
        + spectra_hdr
        + bytes(spectra_data)
        + wave_hdr
        + bytes(wave_data)
        + qual_hdr
        + bytes(qual_data)
    )

    hdus = parse_fits_hdus(fits_bytes)
    assert "SPECTRA" in hdus
    assert "WAVELENGTH" in hdus
    assert "DATA QUALITY" in hdus

    records = extract_spectrum_records(hdus)
    assert len(records) == 256
    assert records[0]["wavelength_um"] == pytest.approx(2.59, abs=0.001)
    assert records[255]["wavelength_um"] == pytest.approx(1.31, abs=0.001)
    assert records[10]["spike"] == 1
    assert records[10]["quality_flag"] == 1
    assert records[0]["quality_flag"] == 0
