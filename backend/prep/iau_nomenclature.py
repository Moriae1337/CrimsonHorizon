"""IAU-named Mars features for the 3D globe labels.

Source: USGS Gazetteer of Planetary Nomenclature, Mars center points
(MARS_nomenclature_center_pts.zip, the dBASE table of the shapefile).
https://planetarynames.wr.usgs.gov/GIS_Downloads

Keeps IAU-adopted features at least MIN_DIAMETER_KM across, converts the
gazetteer's 0-360 E longitudes to -180..180 E, and writes
data/iau_mars_nomenclature.json (served by GET /terrain/nomenclature).

Run from backend/: uv run python -m prep.iau_nomenclature [path/to/zip]
"""

import io
import struct
import sys
import urllib.request
import zipfile
from pathlib import Path
from typing import Any

from prep.common import sha256_bytes, utc_now, write_json

SOURCE_URL = (
    "https://planetarynames.wr.usgs.gov/shapefiles/MARS_nomenclature_center_pts.zip"
)
OUT_PATH = Path(__file__).resolve().parents[1] / "data" / "iau_mars_nomenclature.json"
MIN_DIAMETER_KM = 100.0
# Smaller craters kept because rover missions worked in them.
ALWAYS_INCLUDE = frozenset({"Jezero", "Gale", "Gusev", "Endeavour", "Eberswalde"})

# Gazetteer descriptor -> short category used for label styling.
CATEGORIES = {
    "Crater, craters": "crater",
    "Mons, montes": "mons",
    "Tholus, tholi": "mons",
    "Patera, paterae": "mons",
    "Planitia, planitiae": "planitia",
    "Planum, plana": "planum",
    "Terra, terrae": "terra",
    "Vastitas, vastitates": "planitia",
    "Vallis, valles": "vallis",
    "Chasma, chasmata": "vallis",
    "Fossa, fossae": "fossa",
}


def read_dbf(data: bytes) -> list[dict[str, str]]:
    """Minimal dBASE III reader (character and numeric fields only)."""
    count, header_len, record_len = struct.unpack("<IHH", data[4:12])
    fields: list[tuple[str, int]] = []
    pos = 32
    while data[pos] != 0x0D:
        name = data[pos : pos + 11].split(b"\0")[0].decode("ascii")
        fields.append((name, data[pos + 16]))
        pos += 32
    records = []
    for r in range(count):
        offset = header_len + r * record_len
        if data[offset] == 0x2A:  # deleted
            continue
        offset += 1
        rec = {}
        for name, length in fields:
            rec[name] = (
                data[offset : offset + length].decode("utf-8", "replace").strip()
            )
            offset += length
        records.append(rec)
    return records


def select_features(records: list[dict[str, str]]) -> list[dict[str, Any]]:
    out = []
    for rec in records:
        if rec.get("approval") != "Adopted by IAU":
            continue
        try:
            diameter = float(rec["diameter"])
            lon = float(rec["center_lon"])
            lat = float(rec["center_lat"])
        except (KeyError, ValueError):
            continue
        if diameter < MIN_DIAMETER_KM and rec["name"] not in ALWAYS_INCLUDE:
            continue
        lon = (lon + 180.0) % 360.0 - 180.0
        out.append(
            {
                "name": rec["name"],
                "type": rec["type"],
                "category": CATEGORIES.get(rec["type"], "other"),
                "lon": round(lon, 4),
                "lat": round(lat, 4),
                "diameter_km": round(diameter, 1),
                "link": rec["link"].replace("http://", "https://"),
            }
        )
    out.sort(key=lambda f: -f["diameter_km"])
    return out


def main() -> None:
    if len(sys.argv) > 1:
        raw = Path(sys.argv[1]).read_bytes()
    else:
        with urllib.request.urlopen(SOURCE_URL, timeout=120) as resp:
            raw = resp.read()
    with zipfile.ZipFile(io.BytesIO(raw)) as zf:
        dbf_name = next(n for n in zf.namelist() if n.lower().endswith(".dbf"))
        features = select_features(read_dbf(zf.read(dbf_name)))
    write_json(
        OUT_PATH,
        {
            "version": 1,
            "created_at": utc_now(),
            "source": {
                "label": "USGS Gazetteer of Planetary Nomenclature (IAU WGPSN)",
                "url": SOURCE_URL,
                "sha256": sha256_bytes(raw),
                "filter": (
                    f"Adopted by IAU, diameter >= {MIN_DIAMETER_KM:g} km, plus "
                    + ", ".join(sorted(ALWAYS_INCLUDE))
                ),
                "longitude": "planetocentric, -180..180 E",
            },
            "features": features,
        },
    )
    print(f"{len(features)} features -> {OUT_PATH}")


if __name__ == "__main__":
    main()
