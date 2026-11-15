"""Offline checks for the HiRISE WMTS coverage record (CH26-013)."""

import json
import struct
import zlib

from prep import hirise_wmts_coverage as wmts
from prep.common import SCENARIO_DIR


def _png_gray_alpha(rows: list[bytes], width: int) -> bytes:
    def chunk(kind: bytes, body: bytes) -> bytes:
        crc = zlib.crc32(kind + body)
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", width, len(rows), 8, 4, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(b"".join(rows)))
        + chunk(b"IEND", b"")
    )


def test_decode_png_alpha_handles_filters() -> None:
    # Row 0: no filter. Row 1: "up" filter adds the row above (alpha 7 -> 7+5).
    rows = [b"\x00" + bytes([10, 0, 20, 7]), b"\x02" + bytes([0, 0, 0, 5])]
    assert wmts.decode_png_alpha(_png_gray_alpha(rows, 2)) == [
        bytearray([0, 7]),
        bytearray([0, 12]),
    ]


def test_tile_index_matches_two_by_one_grid() -> None:
    assert wmts.tile_index(-180.0, 90.0, 0) == (0, 0, 0, 0)
    assert wmts.tile_index(0.0, 0.0, 0)[:2] == (1, 0)
    # Skinner Ridge at the deepest HiRISE level.
    assert wmts.tile_index(77.40617078, 18.458931, 17)[:2] == (187437, 52094)


def test_record_covers_stops_and_routes_at_every_zoom() -> None:
    record = json.loads((SCENARIO_DIR / "hirise_wmts_coverage.json").read_text())
    assert record["capabilities"]["max_zoom"] == 17
    assert [z["zoom"] for z in record["zooms"]] == list(range(8, 18))
    assert record["beyond_max_zoom"]["status"] != 200
    assert record["findings"] == []
    for zoom in record["zooms"]:
        assert zoom["tiles_ok"] == zoom["tiles_requested"]
        assert {"start", "skinner-ridge", "wildcat-ridge", "route-A", "route-B"} <= set(
            zoom["coverage"]
        )
        for cov in zoom["coverage"].values():
            assert cov["valid"] == cov["points"]
