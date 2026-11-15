"""Archival environment context for Hawksbill Gap (CH26-095 #113, CH26-096 #114).

Summarizes Mars 2020 MEDA files from the PDS Atmospheres Node for sols 490-516,
the window in which Perseverance sampled at Skinner Ridge (sols 490, 495) and
Wildcat Ridge (sols 509, 516). For each sol it keeps the UTC span from the PDS
label, the minimum, maximum and mean of each parameter, how many hours of the
sol have samples, and the gaps in local mean solar time (LMST). Raw files are
never committed; their PDS logical IDs and SHA-256 are recorded instead.

The radiation card (CH26-096) is not derived from files: it restates published
Curiosity RAD values measured at Gale crater, with their window and location.

Run from backend/: ``uv run python -m prep.environment_context``.
"""

import csv
import io
import itertools
import math
import re
import statistics
import urllib.request
from typing import Any

from prep.common import SCENARIO_DIR, sha256_bytes, utc_now, write_json

OUTPUT_PATH = SCENARIO_DIR / "environment.json"
SCHEMA_VERSION = "1.0"

MEDA_BASE = "https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda"
SOLS = range(490, 517)
SOL_S = 88775.244  # one Mars solar day in SI seconds
GAP_MIN_S = 15 * 60  # LMST gaps shorter than this are not listed

# Parameter id -> (collection, product tag, columns, unit, label). The air
# temperature is the median of the three ATS units on the remote sensing mast
# (RSM), which sit about 1.45 m above the ground; the two body-mounted units are
# closer to the rover's own heat and are left out.
PARAMETERS: dict[str, dict[str, Any]] = {
    "pressure": {
        "collection": "data_derived_env",
        "tag": "DER_PS",
        "columns": ["PRESSURE"],
        "unit": "Pa",
        "label": "Surface pressure",
        "level": "MEDA derived (DER_PS)",
    },
    "air_temperature": {
        "collection": "data_calibrated_env",
        "tag": "CAL_ATS",
        "columns": ["ATS_LOCAL_TEMP1", "ATS_LOCAL_TEMP2", "ATS_LOCAL_TEMP3"],
        "unit": "K",
        "label": "Air temperature, median of the three mast sensors (~1.45 m)",
        "level": "MEDA calibrated (CAL_ATS)",
    },
}

LMST_RE = re.compile(r"^\d{5}M(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)$")


def sol_dir(collection: str, sol: int) -> str:
    start = 420 + ((sol - 420) // 120) * 120
    return f"{MEDA_BASE}/{collection}/sol_{start:04d}_{start + 119:04d}/sol_{sol:04d}"


def product_name(tag: str, sol: int) -> str:
    return f"WE__{sol:04d}___________{tag}".ljust(43, "_") + "P01"


def fetch(url: str) -> bytes | None:
    try:
        with urllib.request.urlopen(url, timeout=120) as response:
            return response.read()
    except urllib.error.HTTPError as err:
        if err.code == 404:
            return None
        raise


def label_field(label: str, tag: str) -> str | None:
    match = re.search(rf"<{tag}>([^<]+)</{tag}>", label)
    return match.group(1).strip() if match else None


def lmst_seconds(value: str) -> float | None:
    match = LMST_RE.match(value.strip())
    if not match:
        return None
    h, m, s = int(match.group(1)), int(match.group(2)), float(match.group(3))
    return h * 3600 + m * 60 + s


def hhmm(seconds: float) -> str:
    minutes = min(round(seconds / 60), 24 * 60)
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def summarize(rows: list[tuple[float, float]]) -> dict[str, Any]:
    """Min/max/mean, hours covered and LMST gaps for (lmst_s, value) samples."""
    rows.sort()
    values = [v for _, v in rows]
    times = [t for t, _ in rows]
    hours = {int(t // 3600) for t in times}
    gaps = []
    gap_s = 0.0
    edges = [0.0, *times, 24 * 3600.0]
    for before, after in itertools.pairwise(edges):
        if after - before >= GAP_MIN_S:
            gaps.append({"from_lmst": hhmm(before), "to_lmst": hhmm(after)})
            gap_s += after - before
    return {
        "min": round(min(values), 2),
        "max": round(max(values), 2),
        "mean": round(statistics.fmean(values), 2),
        "samples": len(values),
        "hours_with_data": len(hours),
        "covered_h": round((24 * 3600 - gap_s) / 3600, 1),
        "lmst_gaps": gaps,
    }


def read_parameter(param: dict[str, Any], sol: int) -> dict[str, Any] | None:
    base = f"{sol_dir(param['collection'], sol)}/{product_name(param['tag'], sol)}"
    label_bytes = fetch(f"{base}.xml")
    data = fetch(f"{base}.CSV")
    if label_bytes is None or data is None:
        return None
    label = label_bytes.decode("utf-8")
    rows: list[tuple[float, float]] = []
    for record in csv.DictReader(io.StringIO(data.decode("utf-8"))):
        t = lmst_seconds(record["LMST"])
        # Samples stamped with the previous or next sol fall outside 00:00-24:00.
        if t is None or not record["LMST"].startswith(f"{sol:05d}M"):
            continue
        values = [float(record[c]) for c in param["columns"] if record.get(c)]
        values = [v for v in values if math.isfinite(v)]
        if len(values) == len(param["columns"]):
            rows.append((t, statistics.median(values)))
    if not rows:
        return None
    return {
        "utc_start": label_field(label, "start_date_time"),
        "utc_stop": label_field(label, "stop_date_time"),
        "summary": summarize(rows),
        "product": {
            "lid": label_field(label, "logical_identifier"),
            "version": label_field(label, "version_id"),
            "url": f"{base}.CSV",
            "sha256": sha256_bytes(data),
        },
    }


def build_meda() -> dict[str, Any]:
    sols = []
    for sol in SOLS:
        entry: dict[str, Any] = {"sol": sol, "utc_start": None, "utc_stop": None}
        for param_id, param in PARAMETERS.items():
            result = read_parameter(param, sol)
            if result is None:
                entry[param_id] = None
                continue
            entry["utc_start"] = entry["utc_start"] or result["utc_start"]
            entry["utc_stop"] = entry["utc_stop"] or result["utc_stop"]
            entry[param_id] = {**result["summary"], "product": result["product"]}
        print(f"sol {sol}: {[k for k in PARAMETERS if entry[k]]}")
        sols.append(entry)
    return {
        "id": "meda-hawksbill-gap",
        "title": "Perseverance MEDA weather, sols 490-516 (archival)",
        "archival": True,
        "instrument": "Mars Environmental Dynamics Analyzer (MEDA), Perseverance",
        "place": "Jezero crater, Hawksbill Gap and nearby on the rover's path",
        "sol_range": [SOLS.start, SOLS.stop - 1],
        "parameters": [
            {
                "id": pid,
                "label": p["label"],
                "unit": p["unit"],
                "processing_level": p["level"],
                "columns": p["columns"],
            }
            for pid, p in PARAMETERS.items()
        ],
        "method": (
            "Per sol, samples stamped 00:00-24:00 LMST of that sol. min/max/mean are "
            "over all samples; hours_with_data counts LMST hours with at least one "
            f"sample; lmst_gaps lists gaps of {GAP_MIN_S // 60} min or more and "
            "covered_h is 24 LMST hours minus those gaps. A null "
            "parameter means no PDS product for that sol."
        ),
        "source_ids": ["pds-meda"],
        "sols": sols,
    }


RADIATION = {
    "id": "rad-gale-2012-2013",
    "title": "Curiosity RAD surface radiation at Gale crater (archival, not Jezero)",
    "archival": True,
    "instrument": "Radiation Assessment Detector (RAD), Curiosity rover (MSL)",
    "place": {
        "name": "Gale crater",
        "mission": "Mars Science Laboratory (Curiosity)",
        "coordinates": [137.4417, -4.5895],
        "coordinates_note": "Bradbury Landing, Curiosity's landing site; the window covers its early drive to Yellowknife Bay.",
        "elevation_m": -4400,
        "elevation_note": "About -4.4 km relative to the MOLA datum (Hassler et al. 2014).",
    },
    "window": {
        "utc_start": "2012-08-07",
        "utc_stop": "2013-06-01",
        "note": "About 300 sols near the maximum of solar cycle 24.",
    },
    "measurements": [
        {
            "id": "gcr-absorbed-dose-rate",
            "label": "Average galactic cosmic ray (GCR) absorbed dose rate",
            "value": 0.210,
            "uncertainty": 0.040,
            "unit": "mGy/day",
            "source_ids": ["hassler-2014"],
        },
        {
            "id": "gcr-dose-equivalent-rate",
            "label": "Average GCR dose equivalent rate",
            "value": 0.67,
            "uncertainty": None,
            "unit": "mSv/day",
            "source_ids": ["swri-2013-rad"],
        },
    ],
    "limits": [
        "Measured at Gale crater by Curiosity, not at Jezero crater; Perseverance carries no radiation detector.",
        "Measured 2012-2013 near solar maximum; the Hawksbill Gap sols (mid-2022) had different solar activity, which changes the GCR flux.",
        "Jezero's floor (about -2.5 km) is about 1.9 km higher than Gale's landing site, so it has less atmosphere overhead and a somewhat higher dose is expected.",
        "Averages over months; they exclude large solar particle events and say nothing about the dose of a single walk.",
        "Not a dose estimate for any crew, suit or route option.",
    ],
    "source_ids": ["hassler-2014", "swri-2013-rad"],
}

SOURCES = [
    {
        "id": "pds-meda",
        "title": "Mars 2020 MEDA bundle (urn:nasa:pds:mars2020_meda), derived and calibrated environmental data",
        "url": f"{MEDA_BASE}/",
        "credit": "NASA/JPL-Caltech/CAB(CSIC-INTA); PDS Atmospheres Node",
        "license": "NASA PDS public data",
        "doi": None,
    },
    {
        "id": "meda-instrument",
        "title": "Rodriguez-Manfredi et al. (2021), The Mars Environmental Dynamics Analyzer, MEDA, Space Science Reviews 217, 48",
        "url": "https://doi.org/10.1007/s11214-021-00816-9",
        "credit": "Rodriguez-Manfredi, J.A., et al.",
        "license": "CC BY 4.0",
        "doi": "10.1007/s11214-021-00816-9",
    },
    {
        "id": "hassler-2014",
        "title": "Hassler et al. (2014), Mars' surface radiation environment measured with the Mars Science Laboratory's Curiosity rover, Science 343, 1244797",
        "url": "https://doi.org/10.1126/science.1244797",
        "credit": "Hassler, D.M., et al., MSL Science Team",
        "license": "Cited; values restated, no text reproduced",
        "doi": "10.1126/science.1244797",
    },
    {
        "id": "swri-2013-rad",
        "title": "SwRI scientists publish first radiation measurements from the surface of Mars (press release, 9 Dec 2013)",
        "url": "https://www.swri.org/press-release/swri-scientists-publish-first-radiation-measurements-surface-mars",
        "credit": "Southwest Research Institute",
        "license": "Cited; values restated, no text reproduced",
        "doi": None,
    },
]


def main() -> None:
    meda = build_meda()
    meda["source_ids"] = ["pds-meda", "meda-instrument"]
    document = {
        "schema_version": SCHEMA_VERSION,
        "scenario_id": "hawksbill-gap",
        "generated_at": utc_now(),
        "weather": meda,
        "radiation": RADIATION,
        "sources": SOURCES,
    }
    write_json(OUTPUT_PATH, document)
    print(f"wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
