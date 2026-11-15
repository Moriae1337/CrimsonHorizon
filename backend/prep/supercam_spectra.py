"""Export calibrated SuperCam VISIR chart series for Hawksbill Gap (CH26-039, #57).

Reads the verified SuperCam calibrated IR FITS and PDS4 XML records for:
- Berry Hollow (sol 515, Wildcat Ridge abrasion patch)
- Thornton Gap (sol 493, Skinner Ridge abrasion patch)

Processes spectral channels:
1. Sorts 256 wavelength channels ascending across roughly 1.31–2.59 µm.
2. Evaluates documented quality flags (saturation, glitch, spike) to produce quality_flag == 0.
3. Confirms units of I_F_Atm as dimensionless reflectance factor (I/F) / radiance factor,
   documenting the label unit discrepancy vs. SIS section 5.1.5.
4. Exports compact JSON to backend/data/hawksbill_gap/supercam_spectra.json.
"""

from __future__ import annotations

import json
import math
import struct
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

from prep.common import (
    DERIVED_DIR,
    INPUTS_DIR,
    SCENARIO_DIR,
    load_manifest,
    manifest_input,
    sha256_bytes,
    utc_now,
    write_json,
)

OUTPUT_PATH = SCENARIO_DIR / "supercam_spectra.json"

TARGET_SPECS = [
    {
        "input_id": "supercam-berry-hollow",
        "key": "berry_hollow",
        "stop_id": "wildcat-ridge",
        "target_name": "Berry Hollow",
        "cache_filename": "supercam_berry_hollow_sol515.fits",
        "label_filename": "supercam_berry_hollow_sol515.xml",
    },
    {
        "input_id": "supercam-thornton-gap",
        "key": "thornton_gap",
        "stop_id": "skinner-ridge",
        "target_name": "Thornton Gap",
        "cache_filename": "supercam_thornton_gap_sol493.fits",
        "label_filename": "supercam_thornton_gap_sol493.xml",
    },
]

CITATION = (
    "Wiens, R. C., and Maurice, S. A. (2021). Mars 2020 SuperCam Bundle, version 9.0. "
    "NASA Planetary Data System. https://doi.org/10.17189/1522646"
)

DISPLAY_CREDIT = "NASA/JPL-Caltech/LANL/CNES/CNRS, Mars 2020 SuperCam team, NASA PDS Geosciences Node"

UNIT_CONFIRMATION_NOTE = (
    "The SIS (section 5.1.5) defines I_F as reflectance (radiance divided by a modelled solar "
    "spectrum for the observation geometry and time) and I_F_Atm as that reflectance corrected "
    "for atmospheric absorption (mainly CO2). Both are dimensionless reflectance factor / radiance "
    "factor (I/F). The PDS4 label field carries unit 'W/m2/sr/µm', which is an archive label "
    "clerical artifact; the data values are dimensionless reflectance factor."
)


def fetch_bytes(url: str, timeout: int = 60) -> bytes:
    """Download binary data over HTTP with a designated user-agent."""
    request = urllib.request.Request(
        url, headers={"User-Agent": "crimson-horizon-prep"}
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def load_or_fetch(
    url: str, expected_sha256: str, cache_name: str, allow_remote: bool = True
) -> bytes:
    """Load cached file from inputs or derived directories, or fetch and verify."""
    # Check possible local locations
    for directory in (INPUTS_DIR, DERIVED_DIR):
        local_file = directory / cache_name
        if local_file.is_file():
            content = local_file.read_bytes()
            if sha256_bytes(content) == expected_sha256:
                return content

    if not allow_remote:
        raise FileNotFoundError(
            f"No valid local cache found for {cache_name} and remote fetch is disabled"
        )

    content = fetch_bytes(url)
    digest = sha256_bytes(content)
    if digest != expected_sha256:
        raise ValueError(
            f"SHA-256 mismatch for {url}: expected {expected_sha256}, got {digest}"
        )

    # Save to derived directory cache
    DERIVED_DIR.mkdir(parents=True, exist_ok=True)
    (DERIVED_DIR / cache_name).write_bytes(content)
    return content


def parse_fits_hdus(data: bytes) -> dict[str, tuple[dict[str, str], bytes]]:
    """Parse standard FITS file into HDU headers and data blocks.

    Returns a dict mapping EXTNAME (or 'PRIMARY') to (header_dict, raw_data_bytes).
    """
    offset = 0
    hdus: dict[str, tuple[dict[str, str], bytes]] = {}
    file_len = len(data)

    while offset < file_len:
        header_cards: list[str] = []
        while True:
            if offset + 2880 > file_len:
                break
            block = data[offset : offset + 2880]
            offset += 2880
            for i in range(0, 2880, 80):
                card = block[i : i + 80].decode("latin1", errors="replace")
                header_cards.append(card)
                if card.startswith("END "):
                    break
            if header_cards and header_cards[-1].startswith("END "):
                break

        header_info: dict[str, str] = {}
        for card in header_cards:
            if "=" in card:
                key, val = card.split("=", 1)
                header_info[key.strip()] = val.split("/")[0].strip()

        extname = header_info.get("EXTNAME", "PRIMARY").strip().strip("'\"").strip()
        if not extname:
            extname = "PRIMARY"

        naxis = int(header_info.get("NAXIS", 0))
        naxis1 = int(header_info.get("NAXIS1", 0))
        naxis2 = int(header_info.get("NAXIS2", 0))
        pcount = int(header_info.get("PCOUNT", 0))
        bitpix = int(header_info.get("BITPIX", 8))
        xtension = header_info.get("XTENSION", "")

        if "BINTABLE" in xtension or "TABLE" in xtension:
            raw_data_size = naxis1 * naxis2 + pcount
        elif naxis > 0:
            raw_data_size = (abs(bitpix) // 8) * naxis1 * (naxis2 if naxis2 else 1)
        else:
            raw_data_size = 0

        padded_size = ((raw_data_size + 2879) // 2880) * 2880
        raw_bytes = data[offset : offset + raw_data_size]
        hdus[extname] = (header_info, raw_bytes)
        offset += padded_size

    return hdus


def extract_spectrum_records(
    hdus: dict[str, tuple[dict[str, str], bytes]],
) -> list[dict[str, Any]]:
    """Extract 256 spectel records from HDU 6 (SPECTRA), 7 (WAVELENGTH), and 9 (DATA QUALITY)."""
    if "SPECTRA" not in hdus or "WAVELENGTH" not in hdus or "DATA QUALITY" not in hdus:
        raise KeyError(f"FITS file is missing required HDUs: found {list(hdus.keys())}")

    _, spectra_bytes = hdus["SPECTRA"]
    _, wave_bytes = hdus["WAVELENGTH"]
    _, qual_bytes = hdus["DATA QUALITY"]

    # Each row formats:
    # SPECTRA: 6 big-endian doubles (48 bytes): DN, Radiance, I_F, I_F_atm, F_Sky, AtmTrans
    # WAVELENGTH: 2 big-endian doubles (16 bytes): Wavelength (um), FWHM (cm-1)
    # DATA QUALITY: 4 big-endian doubles (32 bytes): Saturation, Glitch, Spike, StDev
    num_rows = len(wave_bytes) // 16
    if num_rows != 256:
        raise ValueError(f"Expected 256 wavelength channels, found {num_rows}")

    records: list[dict[str, Any]] = []
    for i in range(num_rows):
        w_row = struct.unpack(">2d", wave_bytes[i * 16 : (i + 1) * 16])
        s_row = struct.unpack(">6d", spectra_bytes[i * 48 : (i + 1) * 48])
        q_row = struct.unpack(">4d", qual_bytes[i * 32 : (i + 1) * 32])

        wavelength_um = float(w_row[0])
        fwhm_cm1 = float(w_row[1])

        sat_val = q_row[0]
        gl_val = q_row[1]
        sp_val = q_row[2]
        std_val = q_row[3]

        saturation = int(sat_val) if not math.isnan(sat_val) else 0
        glitch = int(gl_val) if not math.isnan(gl_val) else 0
        spike = int(sp_val) if not math.isnan(sp_val) else 0
        stdev = float(std_val) if not math.isnan(std_val) else None

        # Quality flag is 0 if no saturation, glitch, or spike is detected; 1 if flagged.
        quality_flag = 1 if (saturation > 0 or glitch > 0 or spike > 0) else 0

        records.append(
            {
                "original_index": i,
                "wavelength_um": round(wavelength_um, 5),
                "fwhm_cm1": round(fwhm_cm1, 2),
                "i_f_atm": round(float(s_row[3]), 6),
                "radiance": round(float(s_row[1]), 6),
                "i_f": round(float(s_row[2]), 6),
                "quality_flag": quality_flag,
                "saturation": saturation,
                "glitch": glitch,
                "spike": spike,
                "stdev": round(stdev, 6) if stdev is not None else None,
            }
        )

    return records


def sort_records_ascending(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Sort wavelength channels ascending across roughly 1.31 to 2.59 µm."""
    return sorted(records, key=lambda r: r["wavelength_um"])


def filter_quality_series(
    sorted_records: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, int]]:
    """Filter records by quality_flag == 0 and produce compact chart series.

    Returns:
    - filtered_series: records with quality_flag == 0
    - flagged_records: records with quality_flag != 0
    - quality_counts: summary counts of saturation, glitch, spike, clean, flagged
    """
    filtered_series: list[dict[str, Any]] = []
    flagged_records: list[dict[str, Any]] = []

    sat_count = 0
    glitch_count = 0
    spike_count = 0

    for r in sorted_records:
        if r["saturation"] > 0:
            sat_count += 1
        if r["glitch"] > 0:
            glitch_count += 1
        if r["spike"] > 0:
            spike_count += 1

        if r["quality_flag"] == 0:
            filtered_series.append(
                {
                    "wavelength_um": r["wavelength_um"],
                    "i_f_atm": r["i_f_atm"],
                    "quality_flag": 0,
                }
            )
        else:
            flagged_records.append(
                {
                    "wavelength_um": r["wavelength_um"],
                    "i_f_atm": r["i_f_atm"],
                    "quality_flag": 1,
                    "glitch": r["glitch"],
                    "spike": r["spike"],
                    "saturation": r["saturation"],
                }
            )

    quality_counts = {
        "saturated": sat_count,
        "glitch": glitch_count,
        "spike": spike_count,
        "quality_flag_0": len(filtered_series),
        "quality_flag_1": len(flagged_records),
    }

    return filtered_series, flagged_records, quality_counts


def verify_xml_label(xml_bytes: bytes) -> dict[str, Any]:
    """Parse PDS4 XML label to confirm logical identifier and I_F_Atm definition."""
    root = ET.fromstring(xml_bytes)
    ns = {
        "pds": "http://pds.nasa.gov/pds4/pds/v1",
    }
    lid_elem = root.find(".//pds:logical_identifier", ns)
    title_elem = root.find(".//pds:title", ns)

    i_f_atm_desc = None
    i_f_atm_unit = None
    for field in root.findall(".//pds:Field_Binary", ns):
        name = field.find("pds:name", ns)
        if name is not None and name.text == "I_F_Atm":
            desc = field.find("pds:description", ns)
            unit = field.find("pds:unit", ns)
            if desc is not None:
                i_f_atm_desc = desc.text.strip() if desc.text else ""
            if unit is not None:
                i_f_atm_unit = unit.text.strip() if unit.text else ""

    return {
        "logical_identifier": (
            lid_elem.text.strip() if lid_elem is not None and lid_elem.text else ""
        ),
        "title": (
            title_elem.text.strip()
            if title_elem is not None and title_elem.text
            else ""
        ),
        "i_f_atm_description": i_f_atm_desc,
        "label_unit_string": i_f_atm_unit,
    }


def build_target_entry(
    spec: dict[str, Any], manifest: dict[str, Any], allow_remote: bool = True
) -> dict[str, Any]:
    """Process a single SuperCam target from manifest and FITS/XML data."""
    inp = manifest_input(manifest, spec["input_id"])
    verif = inp["verification"]

    # Load FITS data
    fits_data = load_or_fetch(
        verif["data_url"],
        verif["data_sha256"],
        spec["cache_filename"],
        allow_remote=allow_remote,
    )
    hdus = parse_fits_hdus(fits_data)
    raw_records = extract_spectrum_records(hdus)
    sorted_records = sort_records_ascending(raw_records)
    filtered_series, flagged_records, qual_summary = filter_quality_series(
        sorted_records
    )

    # Load & verify XML label
    label_bytes = load_or_fetch(
        inp["url"],
        verif["label_sha256"],
        spec["label_filename"],
        allow_remote=allow_remote,
    )
    xml_info = verify_xml_label(label_bytes)

    wavelengths = [r["wavelength_um"] for r in sorted_records]
    i_f_atms = [r["i_f_atm"] for r in sorted_records]

    return {
        "id": spec["input_id"],
        "stop_id": spec["stop_id"],
        "target_name": spec["target_name"],
        "target_identifier": verif["target"],
        "sol": verif["sol"],
        "rover_motion_counter": verif["rover_motion_counter"],
        "measurement_condition": verif["measurement_condition"],
        "product_id": inp["product_id"],
        "pds4_title": xml_info["title"],
        "data_url": verif["data_url"],
        "data_sha256": verif["data_sha256"],
        "label_url": inp["url"],
        "label_sha256": verif["label_sha256"],
        "citation": CITATION,
        "display_credit": DISPLAY_CREDIT,
        "wavelength_unit": "µm",
        "reflectance_unit": "reflectance factor (I/F, atmospheric-corrected)",
        "total_channels": len(sorted_records),
        "valid_channels": len(filtered_series),
        "flagged_channels_count": len(flagged_records),
        "quality_summary": qual_summary,
        "wavelength_min_um": min(wavelengths),
        "wavelength_max_um": max(wavelengths),
        "i_f_atm_min": min(i_f_atms),
        "i_f_atm_max": max(i_f_atms),
        "series": filtered_series,
        "filtered_series": filtered_series,
        "flagged_channels": flagged_records,
        "all_channels": [
            {
                "wavelength_um": r["wavelength_um"],
                "i_f_atm": r["i_f_atm"],
                "quality_flag": r["quality_flag"],
                "saturation": r["saturation"],
                "glitch": r["glitch"],
                "spike": r["spike"],
                "stdev": r["stdev"],
            }
            for r in sorted_records
        ],
    }


def build_supercam_spectra_bundle(
    manifest: dict[str, Any] | None = None, allow_remote: bool = True
) -> dict[str, Any]:
    """Assemble the complete SuperCam spectra dataset."""
    if manifest is None:
        manifest = load_manifest()

    bh_spec = TARGET_SPECS[0]
    tg_spec = TARGET_SPECS[1]

    berry_hollow = build_target_entry(bh_spec, manifest, allow_remote=allow_remote)
    thornton_gap = build_target_entry(tg_spec, manifest, allow_remote=allow_remote)

    return {
        "schema_version": "1.0",
        "scenario_id": manifest.get("scenario_id", "hawksbill-gap"),
        "generated_at": utc_now(),
        "title": "Calibrated Mars 2020 SuperCam VISIR Spectra: Berry Hollow & Thornton Gap",
        "description": (
            "Calibrated passive VISIR reflectance spectra (roughly 1.31–2.59 µm) for Berry Hollow "
            "(sol 515, Wildcat Ridge abrasion patch) and Thornton Gap (sol 493, Skinner Ridge "
            "abrasion patch). Channels are sorted by ascending wavelength and filtered by "
            "quality_flag == 0."
        ),
        "citation": CITATION,
        "display_credit": DISPLAY_CREDIT,
        "doi": "10.17189/1522646",
        "instrument": "Mars 2020 SuperCam VISIR (IR Spectrometer)",
        "wavelength_unit": "µm",
        "wavelength_range_um": [1.31149, 2.5901],
        "reflectance_unit": "reflectance factor (I/F, atmospheric-corrected, dimensionless)",
        "unit_confirmation_note": UNIT_CONFIRMATION_NOTE,
        "targets": {
            "berry_hollow": berry_hollow,
            "thornton_gap": thornton_gap,
        },
        "spectra": [berry_hollow, thornton_gap],
    }


def load_supercam_spectra(path: Path = OUTPUT_PATH) -> dict[str, Any]:
    """Read the exported SuperCam spectra JSON file."""
    return json.loads(path.read_text(encoding="utf-8"))


def get_target(bundle: dict[str, Any], identifier: str) -> dict[str, Any]:
    """Retrieve target entry by key ('berry_hollow'), input_id ('supercam-berry-hollow'), or stop_id ('wildcat-ridge')."""
    if "targets" in bundle and identifier in bundle["targets"]:
        return bundle["targets"][identifier]
    for target in bundle.get("spectra", []):
        if identifier in (
            target.get("id"),
            target.get("stop_id"),
            target.get("target_name"),
            target.get("target_identifier"),
        ):
            return target
    raise KeyError(f"Target {identifier!r} not found in SuperCam spectra bundle")


def main() -> None:
    """Build and export supercam_spectra.json."""
    bundle = build_supercam_spectra_bundle(allow_remote=True)
    write_json(OUTPUT_PATH, bundle)
    print(f"Exported SuperCam spectra to {OUTPUT_PATH}")
    for target in bundle["spectra"]:
        print(
            f"  {target['target_name']} (sol {target['sol']}): "
            f"{target['valid_channels']} clean / {target['total_channels']} total channels, "
            f"wavelengths {target['wavelength_min_um']}–{target['wavelength_max_um']} µm, "
            f"I/F range [{target['i_f_atm_min']}, {target['i_f_atm_max']}]"
        )


if __name__ == "__main__":
    main()
