import pytest
from fastapi.testclient import TestClient

from app.config import get_cors_origins
from app.main import app

client = TestClient(app)


def test_root_returns_hello_mars():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello, Mars!"}


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_allows_default_local_origin():
    response = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_rejects_unknown_origin():
    response = client.get("/health", headers={"Origin": "https://evil.example.com"})
    assert "access-control-allow-origin" not in response.headers


def test_cors_origins_parses_comma_separated_list(monkeypatch):
    monkeypatch.setenv(
        "CORS_ORIGINS", "https://a.example.com, https://b.example.com/ ,"
    )
    assert get_cors_origins() == ["https://a.example.com", "https://b.example.com"]


def test_cors_origins_defaults_to_localhost(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    assert get_cors_origins() == ["http://localhost:5173"]


@pytest.mark.parametrize("origins", ["*", "https://a.example.com, *"])
def test_cors_origins_rejects_wildcard(monkeypatch, origins):
    monkeypatch.setenv("CORS_ORIGINS", origins)
    with pytest.raises(ValueError, match="CORS_ORIGINS"):
        get_cors_origins()


def test_cors_origins_can_disable_cross_origin_access(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", " , ")
    assert get_cors_origins() == []


def test_terrain_layers_returns_cited_mars_catalog():
    response = client.get("/terrain/layers")
    assert response.status_code == 200
    payload = response.json()
    assert payload["crs"] == "IAU2000:104905"
    assert payload["radius_m"] == 3_396_190.0
    assert len(payload["layers"]) == 4
    layer_ids = {layer["id"] for layer in payload["layers"]}
    assert {
        "mola-color-hillshade",
        "viking-mdim21",
        "jezero-ctx-ortho",
        "jezero-hirise-ortho",
    } == layer_ids
    for layer in payload["layers"]:
        assert layer["tile_url"].startswith("https://trek.nasa.gov/tiles/Mars/EQ/")
        assert layer["attribution"]


def test_terrain_landmarks_returns_valid_jezero_geojson():
    response = client.get("/terrain/landmarks")
    assert response.status_code == 200
    payload = response.json()
    assert payload["type"] == "FeatureCollection"
    assert len(payload["features"]) >= 3
    for feature in payload["features"]:
        assert feature["type"] == "Feature"
        assert feature["geometry"]["type"] == "Point"
        lon, lat = feature["geometry"]["coordinates"]
        assert 77.0 <= lon <= 78.0
        assert 18.0 <= lat <= 19.0
        assert feature["properties"]["source"]
