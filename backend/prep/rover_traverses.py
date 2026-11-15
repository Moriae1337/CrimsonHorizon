"""Build data/rover_traverses.json: Perseverance and Spirit traverses with stops.

Sources (public, downloaded over HTTPS):

- Perseverance (Mars 2020): NASA/JPL MMGIS layers M20_traverse.json (drive
  polylines) and M20_waypoints.json (localized end-of-drive positions with sol,
  site and drive). Longitudes/latitudes are used as published.
- Spirit (MER-A): PDS Geosciences Node MER Analyst's Notebook MERA_traverse.csv
  (corrected positions per site/drive with start and end sol). Its label defines an
  equirectangular projection centred at 175.5 E, 0 N on a 3,396,190 m sphere, so
  lon = 175.5 + deg(x / R) and lat = deg(y / R).

Stops are one position per rover "site" (the rover's local frame, renewed at
notable places), i.e. where the rover stopped and worked; the sol range says when.
The traverse lines are thinned to one vertex per 10 m for display; length_m is
measured on the unthinned positions.

Run: uv run --group prep python -m prep.rover_traverses
"""

import csv
import io
import itertools
import json
import math
import urllib.request
from pathlib import Path
from typing import Any

from prep.common import utc_now, write_json

OUT = Path(__file__).resolve().parents[1] / "data" / "rover_traverses.json"
R = 3_396_190.0
M20 = "https://mars.nasa.gov/mmgis-maps/M20/Layers/json"
MERA = "https://an.rsl.wustl.edu/mera/AN/meri/MER/traverse/MERA_traverse.csv"
UA = {"User-Agent": "crimson-horizon-prep"}


def _get(url: str) -> bytes:
    with urllib.request.urlopen(
        urllib.request.Request(url, headers=UA), timeout=60
    ) as r:
        return r.read()


def _thin(line: list[list[float]], min_m: float = 10.0) -> list[list[float]]:
    out = [line[0]]
    for lon, lat in line[1:]:
        plon, plat = out[-1]
        dx = math.radians(lon - plon) * math.cos(math.radians(lat)) * R
        dy = math.radians(lat - plat) * R
        if math.hypot(dx, dy) >= min_m:
            out.append([lon, lat])
    if out[-1] != line[-1]:
        out.append(line[-1])
    return [[round(lon, 7), round(lat, 7)] for lon, lat in out]


def _length_m(line: list[list[float]]) -> float:
    total = 0.0
    for (a, b), (c, d) in itertools.pairwise(line):
        dx = math.radians(c - a) * math.cos(math.radians((b + d) / 2)) * R
        total += math.hypot(dx, math.radians(d - b) * R)
    return total


def perseverance() -> dict[str, Any]:
    trav = json.loads(_get(f"{M20}/M20_traverse.json"))
    line: list[list[float]] = []
    for f in sorted(trav["features"], key=lambda f: f["properties"]["sol"]):
        coords = f["geometry"]["coordinates"]
        line.extend([float(c[0]), float(c[1])] for c in coords)
    wps = json.loads(_get(f"{M20}/M20_waypoints.json"))["features"]
    by_site: dict[int, dict[str, Any]] = {}
    for f in wps:
        p = f["properties"]
        site = int(p["site"])
        s = by_site.setdefault(site, {"site": site, "sol_start": p["sol"]})
        s.update(sol_end=p["sol"], lon=round(p["lon"], 7), lat=round(p["lat"], 7))
    thinned = _thin(line)
    sols = [int(f["properties"]["sol"]) for f in wps]
    return {
        "rover": "perseverance",
        "name": "Perseverance (Mars 2020)",
        "sols": [min(sols), max(sols)],
        "length_m": round(_length_m(line)),
        "line": thinned,
        "stops": sorted(by_site.values(), key=lambda s: s["sol_start"]),
        "source": {
            "label": "NASA/JPL Mars 2020 MMGIS traverse and waypoints",
            "url": "https://mars.nasa.gov/mars2020/mission/where-is-the-rover/",
        },
    }


def spirit() -> dict[str, Any]:
    rows = list(csv.DictReader(io.StringIO(_get(MERA).decode("utf-8"))))
    line: list[list[float]] = []
    by_site: dict[int, dict[str, Any]] = {}
    for r in rows:
        lon = 175.5 + math.degrees(float(r["CORRECTED_X"]) / R)
        lat = math.degrees(float(r["CORRECTED_Y"]) / R)
        line.append([lon, lat])
        site = int(r["SITE"])
        s = by_site.setdefault(site, {"site": site, "sol_start": int(r["START_SOL"])})
        s.update(sol_end=int(r["END_SOL"]), lon=round(lon, 7), lat=round(lat, 7))
    thinned = _thin(line)
    return {
        "rover": "spirit",
        "name": "Spirit (MER-A)",
        "sols": [int(rows[0]["START_SOL"]), int(rows[-1]["END_SOL"])],
        "length_m": round(_length_m(line)),
        "line": thinned,
        "stops": sorted(by_site.values(), key=lambda s: s["sol_start"]),
        "source": {
            "label": "PDS MER Analyst's Notebook, Spirit traverse (corrected)",
            "url": "https://an.rsl.wustl.edu/mera/AN/pages/mer/mer_traverse.htm",
        },
    }


def main() -> None:
    doc = {
        "version": 1,
        "created_at": utc_now(),
        "rovers": {"perseverance": perseverance(), "spirit": spirit()},
    }
    write_json(OUT, doc)
    for r in doc["rovers"].values():
        print(
            r["rover"],
            len(r["line"]),
            "vertices",
            len(r["stops"]),
            "stops",
            r["length_m"],
            "m",
        )


if __name__ == "__main__":
    main()
