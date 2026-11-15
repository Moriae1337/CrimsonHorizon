"""Sample-point alignment check for Hawksbill Gap (CH26-016, issue #34).

Compares the PDS Initial Reports sample coordinates with the MMGIS rover
localizations and the science-stop pins in the committed scenario document.
Standard library only.

Print the offset table with: uv run python tests/test_sample_alignment.py
"""

import json
import math
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data" / "hawksbill_gap"
MARS_RADIUS_M = 3_396_190

# Latitude (N) and longitude (E) from the report headers in Mars 2020 Initial
# Reports Volume 2 Release 2 (sections 11, 12, 14, 15). Stored [lon, lat].
SAMPLES = {
    "Swift Run": ("skinner-ridge", (77.40617078, 18.458931)),
    "Skyland": ("skinner-ridge", (77.40617078, 18.458931)),
    "Hazeltop": ("wildcat-ridge", (77.40588851, 18.45863707)),
    "Bearwallow": ("wildcat-ridge", (77.40588685, 18.45863832)),
}
# The stop pin is placed at the first core of each stop.
PIN_SAMPLE = {"skinner-ridge": "Swift Run", "wildcat-ridge": "Hazeltop"}
# Robotic arm length is about 2.1 m; allow for the arm's mount on the rover body.
MAX_LOCALIZATION_OFFSET_M = 3.0


def great_circle_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Haversine distance in meters between two [lon, lat] points on the Mars sphere."""
    lon1, lat1, lon2, lat2 = map(math.radians, (*a[:2], *b[:2]))
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    )
    return 2 * MARS_RADIUS_M * math.asin(math.sqrt(h))


def bearing_deg(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Initial bearing from a to b, degrees clockwise from north."""
    lon1, lat1, lon2, lat2 = map(math.radians, (*a[:2], *b[:2]))
    y = math.sin(lon2 - lon1) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(
        lon2 - lon1
    )
    return math.degrees(math.atan2(y, x)) % 360


def load(name: str) -> dict:
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def offset_rows() -> list[dict]:
    # Use lon/lat only. The waypoint easting/northing fields are not in the DTM
    # projection (manifest.json, input m20-waypoints) and are never read here.
    waypoints = [
        (f["properties"]["RMC"], f["properties"]["sol"], f["geometry"]["coordinates"])
        for f in load("inputs/rover_waypoints.geojson")["features"]
    ]
    stops = {s["id"]: s for s in load("scenario.json")["stops"]}
    rows = []
    for name, (stop_id, sample) in SAMPLES.items():
        rmc, sol, position = min(waypoints, key=lambda w: great_circle_m(sample, w[2]))
        stop = stops[stop_id]
        rows.append(
            {
                "sample": name,
                "stop_id": stop_id,
                "nearest_rmc": rmc,
                "rmc_sol": sol,
                "to_rmc_m": great_circle_m(sample, position),
                "rmc_to_sample_bearing_deg": bearing_deg(position, sample),
                "to_pin_m": great_circle_m(sample, stop["coordinates"]),
                "scenario_nearest_rmc": stop.get("nearest_rmc"),
            }
        )
    return rows


def test_stop_pins_equal_pds_sample_coordinates():
    stops = {s["id"]: s for s in load("scenario.json")["stops"]}
    assert set(stops) == set(PIN_SAMPLE)
    for stop_id, sample in PIN_SAMPLE.items():
        assert stops[stop_id]["coordinates"][:2] == list(SAMPLES[sample][1])


def test_samples_sit_within_arm_reach_of_a_rover_localization():
    for row in offset_rows():
        assert row["to_rmc_m"] < MAX_LOCALIZATION_OFFSET_M, row
        assert row["nearest_rmc"] == row["scenario_nearest_rmc"], row


def test_samples_are_drilled_after_the_parking_drive():
    sols = {"Swift Run": 490, "Skyland": 495, "Hazeltop": 509, "Bearwallow": 516}
    for row in offset_rows():
        assert row["rmc_sol"] < sols[row["sample"]], row


def test_pins_are_within_a_meter_of_every_core_at_the_stop():
    for row in offset_rows():
        assert row["to_pin_m"] < 1.0, row


if __name__ == "__main__":
    print(
        "| Sample | Stop | Nearest RMC (sol) | To RMC (m) | Bearing RMC->sample | To pin (m) |"
    )
    print("| --- | --- | --- | ---: | ---: | ---: |")
    for r in offset_rows():
        print(
            f"| {r['sample']} | {r['stop_id']} | {r['nearest_rmc']} ({r['rmc_sol']}) "
            f"| {r['to_rmc_m']:.2f} | {r['rmc_to_sample_bearing_deg']:.0f} deg "
            f"| {r['to_pin_m']:.2f} |"
        )
