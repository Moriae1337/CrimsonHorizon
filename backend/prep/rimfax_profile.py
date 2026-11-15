"""Prepare the historical traverse for Stack et al. (2024), Figure 5."""

import argparse
import json
from itertools import pairwise
from pathlib import Path
from typing import Any

from prep.common import (
    SCENARIO_DIR,
    load_manifest,
    manifest_input,
    sha256_bytes,
    write_json,
)
from prep.routes import line_length_m
from prep.rover_inputs import feature_collection, fetch, select_traverse

OUTPUT_PATH = SCENARIO_DIR / "rimfax_profile.json"
DRIVES = (
    (535, "26_1222", "26_1652"),
    (536, "26_1652", "26_2018"),
    (537, "26_2018", "26_2142"),
    (538, "26_2142", "26_2548"),
)
PDS_COLLECTION = (
    "https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_rimfax"
    "/data_calibrated/2022/"
)


def build_profile(tracks: list[dict[str, Any]]) -> dict[str, Any]:
    ids = [
        (props["sol"], props["fromRMC"], props["toRMC"])
        for props in (track["properties"] for track in tracks)
    ]
    if tuple(ids) != DRIVES:
        raise ValueError("Expected the four Figure 5 drives in rover travel order.")
    if any(track["geometry"]["type"] != "LineString" for track in tracks):
        raise ValueError("Expected a LineString for each drive.")
    lines = [track["geometry"]["coordinates"] for track in tracks]
    if any(len(line) < 2 for line in lines) or any(
        left[-1] != right[0] for left, right in pairwise(lines)
    ):
        raise ValueError("Drive vertices are missing or disagree at a junction.")

    manifest = load_manifest()
    source = manifest_input(manifest, "m20-traverse")
    geographic = manifest["conventions"]["geographic"]
    radius = geographic["reference_sphere_radius_m"]
    return {
        "id": "hawksbill-gap-rimfax-stack-fig5",
        "publication": {
            "citation": "Stack et al. (2024), Sedimentology and Stratigraphy of the "
            "Shenandoah Formation, Western Fan, Jezero Crater, Mars",
            "doi_url": "https://doi.org/10.1029/2023JE008187",
            "figure": "5a (drive path) and 5b (radar section)",
            "figure_url": "https://lamb.caltech.edu/documents/34123/"
            "JGR_Planets_-_2024_-_Stack_-_Sedimentology_and_Stratigraphy_of_the_"
            "Shenandoah_Formation_Western_Fan_Jezero_Crater_Mars.pdf#page=10",
            "license": "Creative Commons Attribution-NonCommercial",
            "credit": "© 2024 Jet Propulsion Laboratory, California Institute of Technology",
        },
        "track_source": {
            key: source[key]
            for key in ("product_id", "url", "sha256", "credit", "license")
        },
        "coordinate_convention": {
            "body": geographic["body"],
            "latitude_type": geographic["latitude_type"],
            "longitude_direction": geographic["longitude_direction"],
            "coordinate_order": source["convention"]["coordinate_order"],
        },
        "track": feature_collection(
            "Perseverance drives in Stack et al. Figure 5", tracks
        ),
        "track_length_m": round(sum(line_length_m(line, radius) for line in lines), 2),
        "calibrated_products": [
            {
                "sol": sol,
                "lidvid": "urn:nasa:pds:mars2020_rimfax:data_calibrated:"
                f"rimfax_calibrated_{sol:05d}::1.1",
                "label_url": f"{PDS_COLLECTION}rimfax_calibrated_{sol:05d}.xml",
            }
            for sol, _, _ in DRIVES
        ],
        "vertical_axis": {
            "travel_time_unit": "ns",
            "travel_time_type": "two-way",
            "velocity_m_per_ns": 0.113,
            "conversion": "depth increment (m) = 0.113 × two-way time increment (ns) / 2",
            "reference": "The negative metre ticks are on an elevation-like scale. "
            "Read depth below ground from the local surface trace, not the plot's top edge.",
        },
        "coverage": {
            "published_distance_m_approx": [0, 260],
            "match": "The start and four end-of-drive markers in Figure 5a match the "
            "NASA/JPL route from RMC 26_1222 to 26_2548. Figure distances come from "
            "the plot. Map length comes from the line vertices.",
            "gaps": [
                (
                    "Adjacent drives, off-track areas and depths outside the "
                    "recorded panel have no coverage in this profile."
                ),
                (
                    "Blank areas above the sloping surface trace are outside the "
                    "subsurface record."
                ),
                (
                    "Within-drive gaps are unknown. The figure and archive labels "
                    "provide no column-to-coordinate mapping or list of missing soundings."
                ),
            ],
            "airwave_distance_m_approx": [0, 40],
        },
    }


def prepare(body: bytes) -> dict[str, Any]:
    source = manifest_input(load_manifest(), "m20-traverse")
    if sha256_bytes(body) != source["sha256"]:
        raise ValueError(
            "NASA/JPL traverse SHA-256 differs from the scenario manifest."
        )
    tracks = select_traverse(
        json.loads(body)["features"], {sol for sol, _, _ in DRIVES}
    )
    return build_profile(sorted(tracks, key=lambda track: track["properties"]["sol"]))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--traverse", type=Path, help="Path to the pinned M20_traverse JSON"
    )
    args = parser.parse_args()
    source = manifest_input(load_manifest(), "m20-traverse")
    body = args.traverse.read_bytes() if args.traverse else fetch(source["url"])
    write_json(OUTPUT_PATH, prepare(body))


if __name__ == "__main__":
    main()
