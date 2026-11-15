"""Assemble the two Hawksbill Gap route options (CH26-040).

Both options are built from the snapshot of historical Perseverance drive
segments (prep.rover_inputs). They start at waypoint 25_446 and return along
their own outbound path.

- Option B follows ten consecutive drives, through Skinner Ridge (26_1004) to
  Wildcat Ridge (26_1222).
- Option A leaves the historical path after sol 461 and joins the sol 501 drive
  at its ninth vertex. The rover never drove that straight 5.2 m connection, so
  it is a separate feature flagged as proposed.

Lengths are horizontal distances on the Mars sphere (R = 3,396,190 m).
"""

import itertools
import math
from typing import Any

from prep.common import INPUTS_DIR, SCENARIO_DIR, load_manifest, write_json
from prep.rover_inputs import OPTION_SOLS

ROUTES_PATH = SCENARIO_DIR / "routes.geojson"
START_RMC = "25_446"
END_RMC = "26_1222"
SKINNER_RMC = "26_1004"

# Option A joins sol 501 here: index 8 is the ninth vertex, 5.196 m from the
# end of sol 461 (index 9 would give 5.97 m; the scope cites 5.2 m).
A_JOIN_SOL = 501
A_JOIN_INDEX = 8
A_LEAVE_AFTER_SOL = 461

Point = list[float]


def distance_m(a: Point, b: Point, radius_m: float) -> float:
    """Great-circle distance between [lon, lat, ...] points, in meters."""
    lon1, lat1, lon2, lat2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    )
    return 2 * radius_m * math.asin(math.sqrt(h))


def line_length_m(coords: list[Point], radius_m: float) -> float:
    return sum(distance_m(a, b, radius_m) for a, b in itertools.pairwise(coords))


def join(lines: list[list[Point]]) -> list[Point]:
    """Concatenate lines, dropping each repeated junction vertex."""
    out: list[Point] = []
    for line in lines:
        start = 1 if out and line and line[0][:2] == out[-1][:2] else 0
        out.extend(line[start:])
    return out


def piece(
    option: str,
    leg: str,
    kind: str,
    coords: list[Point],
    radius_m: float,
    **props: Any,
) -> dict[str, Any]:
    return {
        "type": "Feature",
        "properties": {
            "option": option,
            "leg": leg,
            "kind": kind,
            "length_m": round(line_length_m(coords, radius_m), 2),
            **props,
        },
        "geometry": {"type": "LineString", "coordinates": coords},
    }


def outbound_pieces(
    option: str, drives: dict[int, dict[str, Any]], radius_m: float
) -> list[dict[str, Any]]:
    """Ordered outbound pieces: historical drives and, for A, the connector."""
    sols = OPTION_SOLS[option]
    if option == "B":
        coords = join([drives[s]["geometry"]["coordinates"] for s in sols])
        return [piece("B", "outbound", "historical", coords, radius_m, sols=sols)]

    cut = sols.index(A_LEAVE_AFTER_SOL) + 1
    before, after = sols[:cut], sols[cut:]
    first = join([drives[s]["geometry"]["coordinates"] for s in before])
    join_line = drives[A_JOIN_SOL]["geometry"]["coordinates"][A_JOIN_INDEX:]
    rest = [drives[s]["geometry"]["coordinates"] for s in after[1:]]
    second = join([join_line, *rest])
    connector = [first[-1], second[0]]
    return [
        piece("A", "outbound", "historical", first, radius_m, sols=before),
        piece(
            "A",
            "outbound",
            "connector",
            connector,
            radius_m,
            proposed=True,
            note=f"Straight line from the end of sol {A_LEAVE_AFTER_SOL} to vertex "
            f"{A_JOIN_INDEX} of sol {A_JOIN_SOL}. Not driven by the rover.",
        ),
        piece(
            "A",
            "outbound",
            "historical",
            second,
            radius_m,
            sols=after,
            first_vertex={str(A_JOIN_SOL): A_JOIN_INDEX},
        ),
    ]


def return_pieces(outbound: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """The return leg retraces the outbound pieces in reverse."""
    pieces = []
    for feature in reversed(outbound):
        props = {**feature["properties"], "leg": "return"}
        coords = list(reversed(feature["geometry"]["coordinates"]))
        geometry = {"type": "LineString", "coordinates": coords}
        pieces.append({"type": "Feature", "properties": props, "geometry": geometry})
    return pieces


def summary(features: list[dict[str, Any]], radius_m: float) -> dict[str, Any]:
    out = [f for f in features if f["properties"]["leg"] == "outbound"]
    outbound_m = sum(line_length_m(f["geometry"]["coordinates"], radius_m) for f in out)
    return {
        "outbound_m": round(outbound_m, 2),
        "round_trip_m": round(2 * outbound_m, 2),
        "proposed_m": round(
            sum(
                f["properties"]["length_m"]
                for f in out
                if f["properties"].get("proposed")
            ),
            2,
        ),
    }


def nearest_vertex_m(coords: list[Point], target: Point, radius_m: float) -> float:
    return min(distance_m(c, target, radius_m) for c in coords)


def build(
    traverse: list[dict[str, Any]],
    waypoints: list[dict[str, Any]],
    radius_m: float,
) -> dict[str, Any]:
    drives = {f["properties"]["sol"]: f for f in traverse}
    stops = {f["properties"]["RMC"]: f["geometry"]["coordinates"] for f in waypoints}
    features: list[dict[str, Any]] = []
    options: dict[str, Any] = {}
    for option in OPTION_SOLS:
        outbound = outbound_pieces(option, drives, radius_m)
        pieces = outbound + return_pieces(outbound)
        features += pieces
        coords = join([f["geometry"]["coordinates"] for f in outbound])
        options[option] = {
            **summary(pieces, radius_m),
            "start_offset_m": round(
                distance_m(coords[0], stops[START_RMC], radius_m), 3
            ),
            "end_offset_m": round(distance_m(coords[-1], stops[END_RMC], radius_m), 3),
            "skinner_offset_m": round(
                nearest_vertex_m(coords, stops[SKINNER_RMC], radius_m), 3
            ),
        }
    return {
        "type": "FeatureCollection",
        "name": "Hawksbill Gap route options",
        "start_rmc": START_RMC,
        "end_rmc": END_RMC,
        "coordinate_order": ["lon", "lat", "elev_geoid"],
        "options": options,
        "features": features,
    }


def main() -> None:
    import json

    manifest = load_manifest()
    radius_m = manifest["conventions"]["geographic"]["reference_sphere_radius_m"]
    traverse = json.loads(
        (INPUTS_DIR / "rover_traverse.geojson").read_text(encoding="utf-8")
    )["features"]
    waypoints = json.loads(
        (INPUTS_DIR / "rover_waypoints.geojson").read_text(encoding="utf-8")
    )["features"]
    routes = build(traverse, waypoints, radius_m)
    write_json(ROUTES_PATH, routes)
    for option, info in routes["options"].items():
        print(option, info)


if __name__ == "__main__":
    main()
