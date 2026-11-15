"""Snapshot the Perseverance traverse inputs for Hawksbill Gap (CH26-015).

Downloads the NASA/JPL MMGIS waypoint and traverse files, records when they
were fetched and their SHA-256, and keeps only what the scenario needs:
waypoints inside the working extent plus the named stops, and the drive
segments for the sols both route options use. Image lists are dropped to keep
the snapshot small; sol, RMC and drive IDs are preserved.
"""

import json
import urllib.request
from typing import Any

from prep.common import (
    INPUTS_DIR,
    load_manifest,
    manifest_input,
    sha256_bytes,
    utc_now,
    write_json,
)

# Rover localizations named in the scope: start, Skinner Ridge, Wildcat Ridge end.
REQUIRED_RMCS = ("25_446", "26_1004", "26_1222")

# Drive sols per option, from the project scope's calculation section. Option A
# uses only part of the sol 501 feature (from its ninth vertex); #40 assembles
# the exact geometry and the proposed 5.2 m connector.
OPTION_SOLS = {
    "A": [449, 455, 456, 460, 461, 501, 502],
    "B": [449, 455, 456, 460, 461, 464, 474, 477, 501, 502],
}

DROP_PROPERTIES = ("images",)


def in_extent(lon: float, lat: float, extent: dict[str, float]) -> bool:
    return (
        extent["lon_min"] <= lon <= extent["lon_max"]
        and extent["lat_min"] <= lat <= extent["lat_max"]
    )


def strip(feature: dict[str, Any]) -> dict[str, Any]:
    props = {k: v for k, v in feature["properties"].items() if k not in DROP_PROPERTIES}
    return {"type": "Feature", "properties": props, "geometry": feature["geometry"]}


def select_waypoints(
    features: list[dict[str, Any]], extent: dict[str, float], rmcs: tuple[str, ...]
) -> list[dict[str, Any]]:
    """Waypoints inside the extent, plus any required RMC outside it."""
    selected = []
    for feature in features:
        props = feature["properties"]
        inside = in_extent(props["lon"], props["lat"], extent)
        if inside or props["RMC"] in rmcs:
            selected.append(strip(feature))
    return selected


def select_traverse(
    features: list[dict[str, Any]], sols: set[int]
) -> list[dict[str, Any]]:
    return [strip(f) for f in features if f["properties"]["sol"] in sols]


def check(
    waypoints: list[dict[str, Any]],
    traverse: list[dict[str, Any]],
    option_sols: dict[str, list[int]],
    rmcs: tuple[str, ...],
) -> list[str]:
    """Problems that would stop #40 from assembling both options."""
    problems = []
    found = {f["properties"]["RMC"] for f in waypoints}
    problems += [f"waypoint {rmc} not found" for rmc in rmcs if rmc not in found]
    sols = {f["properties"]["sol"] for f in traverse}
    for option, wanted in option_sols.items():
        missing = [s for s in wanted if s not in sols]
        if missing:
            problems.append(
                f"option {option} has no traverse segment for sols {missing}"
            )
    return problems


def fetch(url: str) -> bytes:
    request = urllib.request.Request(
        url, headers={"User-Agent": "crimson-horizon-prep"}
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def feature_collection(
    name: str, features: list[dict[str, Any]], declared_crs: Any = None
) -> dict[str, Any]:
    collection: dict[str, Any] = {"type": "FeatureCollection", "name": name}
    if declared_crs:
        collection["crs"] = declared_crs
    collection["features"] = features
    return collection


def main() -> None:
    manifest = load_manifest()
    extent = manifest["extent"]
    sources = {}
    raw = {}
    for input_id in ("m20-waypoints", "m20-traverse"):
        item = manifest_input(manifest, input_id)
        body = fetch(item["url"])
        raw[input_id] = json.loads(body)
        digest = sha256_bytes(body)
        sources[input_id] = {
            "url": item["url"],
            "fetched_at": utc_now(),
            "bytes": len(body),
            "sha256": digest,
            "matches_manifest": digest == item["sha256"],
        }

    waypoints = select_waypoints(
        raw["m20-waypoints"]["features"], extent, REQUIRED_RMCS
    )
    all_sols = {sol for sols in OPTION_SOLS.values() for sol in sols}
    traverse = select_traverse(raw["m20-traverse"]["features"], all_sols)
    problems = check(waypoints, traverse, OPTION_SOLS, REQUIRED_RMCS)
    problems += [
        f"{input_id} changed since the manifest hash was pinned"
        for input_id, meta in sources.items()
        if not meta["matches_manifest"]
    ]

    write_json(
        INPUTS_DIR / "rover_waypoints.geojson",
        feature_collection("M20_waypoints (Hawksbill Gap subset)", waypoints),
    )
    write_json(
        INPUTS_DIR / "rover_traverse.geojson",
        feature_collection(
            "M20_traverse (Hawksbill Gap subset)",
            traverse,
            raw["m20-traverse"].get("crs"),
        ),
    )
    write_json(
        INPUTS_DIR / "rover_inputs.json",
        {
            "sources": sources,
            "coordinate_order": ["lon", "lat", "elev_geoid"],
            "note": "Mars planetocentric, positive-east degrees. The traverse file's "
            "CRS84 label is carried over unchanged and does not describe Mars.",
            "required_rmcs": list(REQUIRED_RMCS),
            "option_sols": OPTION_SOLS,
            "waypoint_count": len(waypoints),
            "traverse_segment_count": len(traverse),
            "problems": problems,
        },
    )
    status = "OK" if not problems else "PROBLEMS"
    print(f"{status}: {len(waypoints)} waypoints, {len(traverse)} traverse segments")
    for problem in problems:
        print(" -", problem)


if __name__ == "__main__":
    main()
