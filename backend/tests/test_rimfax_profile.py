import json

import pytest

from prep.rimfax_profile import OUTPUT_PATH, build_profile, prepare


def test_profile_keeps_the_published_drive_interval() -> None:
    profile = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
    tracks = profile["track"]["features"]
    assert [track["properties"]["sol"] for track in tracks] == [535, 536, 537, 538]
    assert [
        (track["properties"]["fromRMC"], track["properties"]["toRMC"])
        for track in tracks
    ] == [
        ("26_1222", "26_1652"),
        ("26_1652", "26_2018"),
        ("26_2018", "26_2142"),
        ("26_2142", "26_2548"),
    ]
    coordinates = [track["geometry"]["coordinates"] for track in tracks]
    assert [len(line) for line in coordinates] == [61, 50, 5, 49]
    assert coordinates[0][0] == [77.40592495, 18.45864728, -2523.167969]
    assert coordinates[-1][-1] == [77.40865141, 18.45682814, -2540.948975]
    assert sum(track["properties"]["length"] for track in tracks) == pytest.approx(
        264.39
    )
    assert profile["vertical_axis"]["velocity_m_per_ns"] == 0.113
    assert build_profile(tracks) == profile

    tracks[1]["geometry"]["coordinates"][0] = [77.4, 18.4, -2500]
    with pytest.raises(ValueError, match="junction"):
        build_profile(tracks)


def test_prepare_rejects_unverified_traverse_bytes() -> None:
    with pytest.raises(ValueError, match="SHA-256"):
        prepare(b'{"features": []}')
