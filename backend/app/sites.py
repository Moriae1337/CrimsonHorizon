"""3D terrain sites: committed elevation grids and HiRISE textures.

Packages are built offline by prep.site_terrain (contract: specs/sites-api.md).
This module decodes them into a pure-Python grid used by app.routing; it needs
no GIS libraries at runtime.
"""

import base64
import json
import math
import struct
from dataclasses import dataclass
from functools import cache
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "sites"
SITE_DIRS: dict[str, Path] = {
    "columbia-hills": DATA_DIR / "columbia_hills",
    "hawksbill-gap": DATA_DIR / "hawksbill_gap",
    "jezero-crater": DATA_DIR / "jezero_crater",
    "gusev-crater": DATA_DIR / "gusev_crater",
}
TRAVERSES_PATH = DATA_DIR.parent / "rover_traverses.json"
# Which rover drove through each site (prep.rover_traverses).
SITE_ROVER: dict[str, str] = {
    "columbia-hills": "spirit",
    "gusev-crater": "spirit",
    "hawksbill-gap": "perseverance",
    "jezero-crater": "perseverance",
}

__all__ = [
    "SITE_DIRS",
    "TerrainGrid",
    "aeqd_forward",
    "aeqd_inverse",
    "load_grid",
    "load_site",
    "site_summaries",
    "site_traverse",
    "texture_path",
]


@cache
def load_site(site_id: str) -> dict[str, Any]:
    """Return the terrain package document. KeyError/OSError/ValueError on failure."""
    path = SITE_DIRS[site_id] / "terrain.json"
    doc: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    if doc.get("version") != 1 or doc.get("site_id") != site_id:
        raise ValueError(f"{path.name}: unsupported terrain package")
    rows, cols = doc["shape"]
    elevation = doc["elevation"]
    if elevation.get("encoding") != "uint16-le-base64":
        raise ValueError(f"{path.name}: unsupported elevation encoding")
    if len(base64.b64decode(elevation["data"])) != rows * cols * 2:
        raise ValueError(f"{path.name}: elevation size does not match shape")
    return doc


def texture_path(site_id: str) -> Path:
    doc = load_site(site_id)
    return SITE_DIRS[site_id] / doc["texture"]["path"]


def site_summaries() -> list[dict[str, Any]]:
    out = []
    for site_id in SITE_DIRS:
        doc = load_site(site_id)
        out.append(
            {
                "site_id": site_id,
                "name": doc["name"],
                "region": doc["region"],
                "center_lon_lat": doc["center_lon_lat"],
                "cell_size_m": doc["cell_size_m"],
                "shape": doc["shape"],
            }
        )
    return out


@cache
def _traverses() -> dict[str, Any]:
    doc: dict[str, Any] = json.loads(TRAVERSES_PATH.read_text(encoding="utf-8"))
    if doc.get("version") != 1 or not isinstance(doc.get("rovers"), dict):
        raise ValueError("unsupported rover traverse document")
    return doc


@cache
def site_traverse(site_id: str) -> dict[str, Any]:
    """The rover traverse inside a site window, in site metres and lon/lat.

    `lines` are the runs of the traverse that fall inside the window; `stops` are
    the rover's site positions (where it stopped and worked) inside the window.
    """
    doc = load_site(site_id)
    rover = _traverses()["rovers"][SITE_ROVER[site_id]]
    lon0, lat0 = doc["center_lon_lat"]
    radius = float(doc["radius_m"])
    b = doc["bounds_m"]

    def inside(x: float, y: float) -> bool:
        return b["left"] <= x <= b["right"] and b["bottom"] <= y <= b["top"]

    lines: list[list[list[float]]] = []
    run: list[list[float]] = []
    for lon, lat in rover["line"]:
        x, y = aeqd_forward(lon, lat, lon0, lat0, radius)
        if inside(x, y):
            run.append([round(x, 1), round(y, 1)])
        elif run:
            if len(run) > 1:
                lines.append(run)
            run = []
    if len(run) > 1:
        lines.append(run)
    stops = []
    for s in rover["stops"]:
        x, y = aeqd_forward(s["lon"], s["lat"], lon0, lat0, radius)
        if inside(x, y):
            stops.append({**s, "x": round(x, 1), "y": round(y, 1)})
    return {
        "site_id": site_id,
        "rover": rover["rover"],
        "name": rover["name"],
        "sols": rover["sols"],
        "length_m": rover["length_m"],
        "lines": lines,
        "stops": stops,
        "source": rover["source"],
    }


# --- Spherical azimuthal equidistant projection (matches the package CRS) ----


def aeqd_forward(
    lon: float, lat: float, lon0: float, lat0: float, radius: float
) -> tuple[float, float]:
    phi, lam = math.radians(lat), math.radians(lon)
    phi0, lam0 = math.radians(lat0), math.radians(lon0)
    cos_c = math.sin(phi0) * math.sin(phi) + math.cos(phi0) * math.cos(phi) * math.cos(
        lam - lam0
    )
    c = math.acos(max(-1.0, min(1.0, cos_c)))
    k = 1.0 if c < 1e-12 else c / math.sin(c)
    x = radius * k * math.cos(phi) * math.sin(lam - lam0)
    y = (
        radius
        * k
        * (
            math.cos(phi0) * math.sin(phi)
            - math.sin(phi0) * math.cos(phi) * math.cos(lam - lam0)
        )
    )
    return x, y


def aeqd_inverse(
    x: float, y: float, lon0: float, lat0: float, radius: float
) -> tuple[float, float]:
    phi0, lam0 = math.radians(lat0), math.radians(lon0)
    rho = math.hypot(x, y)
    if rho < 1e-9:
        return lon0, lat0
    c = rho / radius
    phi = math.asin(
        math.cos(c) * math.sin(phi0) + y * math.sin(c) * math.cos(phi0) / rho
    )
    lam = lam0 + math.atan2(
        x * math.sin(c),
        rho * math.cos(phi0) * math.cos(c) - y * math.sin(phi0) * math.sin(c),
    )
    lon = (math.degrees(lam) + 180.0) % 360.0 - 180.0
    return lon, math.degrees(phi)


# --- Decoded grid ----------------------------------------------------------


@dataclass(frozen=True)
class TerrainGrid:
    """Row-major elevation grid; cell (r, c) centre is (left + (c+.5)d, top - (r+.5)d)."""

    rows: int
    cols: int
    cell: float
    left: float
    top: float
    z: tuple[float | None, ...]
    slope_deg: tuple[float, ...]
    roughness_m: tuple[float, ...]
    lon0: float
    lat0: float
    radius: float

    def index(self, x: float, y: float) -> int | None:
        c = math.floor((x - self.left) / self.cell)
        r = math.floor((self.top - y) / self.cell)
        if 0 <= r < self.rows and 0 <= c < self.cols:
            return r * self.cols + c
        return None

    def center(self, i: int) -> tuple[float, float]:
        r, c = divmod(i, self.cols)
        return self.left + (c + 0.5) * self.cell, self.top - (r + 0.5) * self.cell

    def sample(self, x: float, y: float) -> float | None:
        """Bilinear elevation at (x, y); None if any contributing cell is NoData."""
        fc = (x - self.left) / self.cell - 0.5
        fr = (self.top - y) / self.cell - 0.5
        c0 = max(0, min(self.cols - 2, math.floor(fc)))
        r0 = max(0, min(self.rows - 2, math.floor(fr)))
        tc = max(0.0, min(1.0, fc - c0))
        tr = max(0.0, min(1.0, fr - r0))
        i = r0 * self.cols + c0
        z00, z01 = self.z[i], self.z[i + 1]
        z10, z11 = self.z[i + self.cols], self.z[i + self.cols + 1]
        if z00 is None or z01 is None or z10 is None or z11 is None:
            return None
        top = z00 + (z01 - z00) * tc
        bottom = z10 + (z11 - z10) * tc
        return top + (bottom - top) * tr

    def to_lon_lat(self, x: float, y: float) -> tuple[float, float]:
        return aeqd_inverse(x, y, self.lon0, self.lat0, self.radius)

    def from_lon_lat(self, lon: float, lat: float) -> tuple[float, float]:
        return aeqd_forward(lon, lat, self.lon0, self.lat0, self.radius)


def _decode(doc: dict[str, Any]) -> list[float | None]:
    e = doc["elevation"]
    raw = base64.b64decode(e["data"])
    values = struct.unpack(f"<{len(raw) // 2}H", raw)
    nodata, off, scale = e["nodata"], e["offset_m"], e["scale_m"]
    return [None if v == nodata else off + v * scale for v in values]


def _slope_and_roughness(
    z: list[float | None], rows: int, cols: int, cell: float
) -> tuple[list[float], list[float]]:
    """Horn 3x3 surface slope (deg) and mean absolute residual from that plane (m).

    Edge and NoData-adjacent cells take the centre value for missing neighbours,
    so they never look flatter than their valid neighbours imply.
    """
    slope = [0.0] * (rows * cols)
    rough = [0.0] * (rows * cols)
    for r in range(rows):
        for c in range(cols):
            i = r * cols + c
            z0 = z[i]
            if z0 is None:
                slope[i] = 90.0
                continue
            n = [[z0] * 3 for _ in range(3)]
            for dr in (-1, 0, 1):
                rr = r + dr
                if not 0 <= rr < rows:
                    continue
                for dc in (-1, 0, 1):
                    cc = c + dc
                    if 0 <= cc < cols:
                        v = z[rr * cols + cc]
                        if v is not None:
                            n[dr + 1][dc + 1] = v
            gx = (
                (n[0][2] + 2 * n[1][2] + n[2][2]) - (n[0][0] + 2 * n[1][0] + n[2][0])
            ) / (8 * cell)
            gy = (
                (n[2][0] + 2 * n[2][1] + n[2][2]) - (n[0][0] + 2 * n[0][1] + n[0][2])
            ) / (8 * cell)
            slope[i] = math.degrees(math.atan(math.hypot(gx, gy)))
            acc = 0.0
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    plane = z0 + gx * dc * cell + gy * dr * cell
                    acc += abs(n[dr + 1][dc + 1] - plane)
            rough[i] = acc / 8.0
    return slope, rough


@cache
def load_grid(site_id: str) -> TerrainGrid:
    doc = load_site(site_id)
    rows, cols = doc["shape"]
    cell = float(doc["cell_size_m"])
    z = _decode(doc)
    slope, rough = _slope_and_roughness(z, rows, cols, cell)
    lon0, lat0 = doc["center_lon_lat"]
    return TerrainGrid(
        rows=rows,
        cols=cols,
        cell=cell,
        left=float(doc["bounds_m"]["left"]),
        top=float(doc["bounds_m"]["top"]),
        z=tuple(z),
        slope_deg=tuple(slope),
        roughness_m=tuple(rough),
        lon0=float(lon0),
        lat0=float(lat0),
        radius=float(doc["radius_m"]),
    )
