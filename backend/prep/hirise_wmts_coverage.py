"""Verify Mars Trek HiRISE WMTS coverage over Hawksbill Gap (CH26-013).

Read-only check of the public tile service used by the map's
`jezero-hirise-ortho` layer (frontend/src/marsCatalog.ts):

1. Fetch WMTSCapabilities.xml and record the tile matrix set, bounds and the
   deepest TileMatrix.
2. For every zoom from the layer's first visible level (z8) to the deepest
   level, request each tile over the scenario extent with an `Origin` header
   and record HTTP status, `Access-Control-Allow-Origin` and content type.
3. Decode each PNG (stdlib zlib, no Pillow) and sample the alpha channel at the
   start, both stops and every route vertex. Alpha 0 means no imagery.
4. Request one tile past the deepest level, which must fail.

Writes data/hawksbill_gap/hirise_wmts_coverage.json. Requires network access;
uses the standard library only:

    cd backend && uv run python -m prep.hirise_wmts_coverage
"""

import json
import struct
import urllib.error
import urllib.request
import zlib
from typing import Any
from xml.etree import ElementTree

from prep.common import SCENARIO_DIR, utc_now, write_json

LAYER = "JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd"
BASE = f"https://trek.nasa.gov/tiles/Mars/EQ/{LAYER}/1.0.0"
CAPABILITIES_URL = f"{BASE}/WMTSCapabilities.xml"
TILE_URL = BASE + "/default/default028mm/{z}/{y}/{x}.png"
MIN_ZOOM = 8  # MarsMap.tsx shows local layers from z8.
ORIGIN = "http://localhost:5173"  # Vite dev origin; checks CORS delivery.
TILE_SIZE = 256
RECORD_PATH = SCENARIO_DIR / "hirise_wmts_coverage.json"

OWS = "{http://www.opengis.net/ows/1.1}"
WMTS = "{http://www.opengis.net/wmts/1.0}"


def tile_index(lon: float, lat: float, z: int) -> tuple[int, int, int, int]:
    """Tile column/row and pixel offset for the 2x1 equirectangular grid."""
    res = 180.0 / (TILE_SIZE * 2**z)  # degrees per pixel
    px = (lon + 180.0) / res
    py = (90.0 - lat) / res
    return (
        int(px // TILE_SIZE),
        int(py // TILE_SIZE),
        int(px % TILE_SIZE),
        int(py % TILE_SIZE),
    )


def decode_png_alpha(data: bytes) -> list[bytearray]:
    """Return per-row alpha values of an 8-bit PNG (alpha 255 if none)."""
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a PNG")
    pos, idat = 8, b""
    width = height = color_type = 0
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos : pos + 4])
        kind = data[pos + 4 : pos + 8]
        body = data[pos + 8 : pos + 8 + length]
        pos += 12 + length
        if kind == b"IHDR":
            width, height, depth, color_type, _, _, interlace = struct.unpack(
                ">IIBBBBB", body
            )
            if depth != 8 or interlace != 0 or color_type == 3:
                raise ValueError("only 8-bit non-interlaced, non-palette PNG")
        elif kind == b"IDAT":
            idat += body
    channels = {0: 1, 2: 3, 4: 2, 6: 4}[color_type]
    raw = zlib.decompress(idat)
    stride = width * channels
    prev = bytearray(stride)
    rows: list[bytearray] = []
    for y in range(height):
        start = y * (stride + 1)
        ftype, line = raw[start], bytearray(raw[start + 1 : start + 1 + stride])
        for i in range(stride):
            a = line[i - channels] if i >= channels else 0
            b = prev[i]
            c = prev[i - channels] if i >= channels else 0
            if ftype == 1:
                line[i] = (line[i] + a) & 0xFF
            elif ftype == 2:
                line[i] = (line[i] + b) & 0xFF
            elif ftype == 3:
                line[i] = (line[i] + (a + b) // 2) & 0xFF
            elif ftype == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pred = a if pa <= pb and pa <= pc else b if pb <= pc else c
                line[i] = (line[i] + pred) & 0xFF
        rows.append(line)
        prev = line
    if color_type in (4, 6):
        return [row[channels - 1 :: channels] for row in rows]
    return [bytearray([255] * width) for _ in rows]


def fetch(url: str) -> tuple[int, dict[str, str], bytes]:
    req = urllib.request.Request(
        url, headers={"Origin": ORIGIN, "User-Agent": "crimsonhorizon-prep"}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, dict(resp.headers), resp.read()
    except urllib.error.HTTPError as err:
        return err.code, dict(err.headers), b""


def read_capabilities() -> dict[str, Any]:
    _, _, body = fetch(CAPABILITIES_URL)
    root = ElementTree.fromstring(body)
    layer = root.find(f"{WMTS}Contents/{WMTS}Layer")
    bbox = layer.find(f"{OWS}WGS84BoundingBox")
    lower = [float(v) for v in bbox.find(f"{OWS}LowerCorner").text.split()]
    upper = [float(v) for v in bbox.find(f"{OWS}UpperCorner").text.split()]
    link = layer.find(f"{WMTS}TileMatrixSetLink/{WMTS}TileMatrixSet").text
    for tms in root.findall(f"{WMTS}Contents/{WMTS}TileMatrixSet"):
        if tms.find(f"{OWS}Identifier").text == link:
            matrices = tms.findall(f"{WMTS}TileMatrix")
            break
    last = matrices[-1]
    return {
        "url": CAPABILITIES_URL,
        "format": layer.find(f"{WMTS}Format").text,
        "tile_matrix_set": link,
        "supported_crs": tms.find(f"{OWS}SupportedCRS").text.strip(),
        "bounds_lonlat": lower + upper,
        "tile_matrices": len(matrices),
        "max_zoom": int(last.find(f"{OWS}Identifier").text),
        "max_zoom_scale_denominator": float(last.find(f"{WMTS}ScaleDenominator").text),
        "top_left_corner": [
            float(v) for v in last.find(f"{WMTS}TopLeftCorner").text.split()
        ],
        "tile_size": int(last.find(f"{WMTS}TileWidth").text),
        "max_zoom_matrix": [
            int(float(last.find(f"{WMTS}MatrixWidth").text)),
            int(float(last.find(f"{WMTS}MatrixHeight").text)),
        ],
    }


def scenario_points() -> tuple[dict[str, list], dict[str, float]]:
    scenario = json.loads((SCENARIO_DIR / "scenario.json").read_text("utf-8"))
    points = {"start": [tuple(scenario["start"]["coordinates"][:2])]}
    for stop in scenario["stops"]:
        points[stop["id"]] = [tuple(stop["coordinates"][:2])]
    for option in scenario["route_options"]:
        verts: list[tuple[float, float]] = []
        for feat in scenario["routes"]["features"]:
            if feat["properties"]["option"] == option["id"]:
                verts += [tuple(c[:2]) for c in feat["geometry"]["coordinates"]]
        points[f"route-{option['id']}"] = sorted(set(verts))
    return points, scenario["extent"]


def check_zoom(z: int, extent: dict[str, float], points: dict) -> dict[str, Any]:
    x0, y0, _, _ = tile_index(extent["lon_min"], extent["lat_max"], z)
    x1, y1, _, _ = tile_index(extent["lon_max"], extent["lat_min"], z)
    tiles: dict[tuple[int, int], dict[str, Any]] = {}
    failures = []
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            status, headers, body = fetch(TILE_URL.format(z=z, y=y, x=x))
            headers = {k.lower(): v for k, v in headers.items()}
            entry: dict[str, Any] = {"status": status}
            ok = (
                status == 200
                and headers.get("access-control-allow-origin") in ("*", ORIGIN)
                and headers.get("content-type") == "image/png"
            )
            if ok:
                alpha = decode_png_alpha(body)
                entry["alpha"] = alpha
                entry["valid_pct"] = round(
                    100 * sum(sum(1 for v in r if v) for r in alpha) / TILE_SIZE**2, 2
                )
            else:
                failures.append(
                    {
                        "tile": f"{z}/{y}/{x}",
                        "status": status,
                        "cors": headers.get("access-control-allow-origin"),
                        "content_type": headers.get("content-type"),
                    }
                )
            tiles[(x, y)] = entry
    coverage = {}
    for name, pts in points.items():
        valid = 0
        for lon, lat in pts:
            x, y, px, py = tile_index(lon, lat, z)
            alpha = tiles.get((x, y), {}).get("alpha")
            valid += bool(alpha and alpha[py][px])
        coverage[name] = {"points": len(pts), "valid": valid}
    return {
        "zoom": z,
        "tiles_requested": len(tiles),
        "tiles_ok": len(tiles) - len(failures),
        "min_tile_valid_pct": min(
            (t["valid_pct"] for t in tiles.values() if "valid_pct" in t), default=0
        ),
        "failures": failures,
        "coverage": coverage,
    }


def main() -> None:
    caps = read_capabilities()
    points, extent = scenario_points()
    zooms = [
        check_zoom(z, extent, points) for z in range(MIN_ZOOM, caps["max_zoom"] + 1)
    ]
    lon, lat = points["start"][0]
    beyond = caps["max_zoom"] + 1
    x, y, _, _ = tile_index(lon, lat, beyond)
    beyond_status, _, _ = fetch(TILE_URL.format(z=beyond, y=y, x=x))
    findings = []
    for zr in zooms:
        for f in zr["failures"]:
            findings.append(f"z{zr['zoom']}: tile {f['tile']} failed ({f['status']})")
        for name, cov in zr["coverage"].items():
            if cov["valid"] != cov["points"]:
                findings.append(
                    f"z{zr['zoom']}: {name} {cov['valid']}/{cov['points']} on imagery"
                )
    if beyond_status == 200:
        findings.append(f"z{beyond} exists although capabilities stop at z{beyond - 1}")
    record = {
        "checked_at": utc_now(),
        "layer": LAYER,
        "tile_url": TILE_URL,
        "request_origin": ORIGIN,
        "capabilities": caps,
        "scenario_extent": extent,
        "zooms": zooms,
        "beyond_max_zoom": {"zoom": beyond, "status": beyond_status},
        "findings": findings,
    }
    write_json(RECORD_PATH, record)
    print("OK" if not findings else "GAPS FOUND", "->", RECORD_PATH)
    for zr in zooms:
        cov = ", ".join(
            f"{k} {v['valid']}/{v['points']}" for k, v in zr["coverage"].items()
        )
        print(f" z{zr['zoom']}: {zr['tiles_ok']}/{zr['tiles_requested']} tiles; {cov}")
    print(f" z{beyond}: HTTP {beyond_status}")
    for note in findings:
        print(" -", note)


if __name__ == "__main__":
    main()
