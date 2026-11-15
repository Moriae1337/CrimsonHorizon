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
