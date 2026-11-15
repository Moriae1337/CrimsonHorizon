import json

from prep.common import SCENARIO_DIR, load_manifest


def test_prelanding_geology_uses_scenario_coordinates_and_surface_units():
    layer = json.loads((SCENARIO_DIR / "prelanding_geology.geojson").read_text("utf-8"))
    extent = load_manifest()["extent"]
    assert layer["type"] == "FeatureCollection"
    assert layer["schema_version"] == "1.0"
    assert layer["source"]["scale_denominator"] == 75000
    assert layer["source"]["published_on"] == "2020-12-02"
    assert {feature["properties"]["unit_symbol"] for feature in layer["features"]} == {
        "NHjf2",
        "Njf",
    }
    for feature in layer["features"]:
        assert set(feature["properties"]) == {"unit_symbol", "unit_name"}
        geometry = feature["geometry"]
        assert geometry["type"] in {"Polygon", "MultiPolygon"}
        polygons = (
            [geometry["coordinates"]]
            if geometry["type"] == "Polygon"
            else geometry["coordinates"]
        )
        for rings in polygons:
            for ring in rings:
                assert len(ring) >= 4 and ring[0] == ring[-1]
                for lon, lat in ring:
                    assert extent["lon_min"] <= lon <= extent["lon_max"]
                    assert extent["lat_min"] <= lat <= extent["lat_max"]
