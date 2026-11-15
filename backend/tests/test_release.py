"""Release regressions for the scenario API, CORS, and the Render build (CH26-037).

Shape checks only: the schema MINOR and the scenario contents may change.
"""

import importlib
import json
import re
import socket
import subprocess
import sys
import tomllib
import urllib.request
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app.main
from app.scenario import SCENARIO_PATHS, load_scenario

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
SCENARIO_URL = "/scenarios/hawksbill-gap"
LOCAL_ORIGIN = "http://localhost:5173"
PAGES_ORIGIN = "https://crimson-horizon.pages.dev"


@pytest.fixture
def client() -> Iterator[TestClient]:
    """Client that turns unhandled errors into 500 responses, as in production."""
    load_scenario.cache_clear()
    yield TestClient(app.main.app, raise_server_exceptions=False)
    load_scenario.cache_clear()


@pytest.fixture
def cors_client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    """App built with two allowed origins (CORS_ORIGINS is read at import time)."""
    monkeypatch.setenv("CORS_ORIGINS", f"{LOCAL_ORIGIN}, {PAGES_ORIGIN}/")
    module = importlib.reload(app.main)
    yield TestClient(module.app)
    monkeypatch.undo()
    importlib.reload(app.main)


def preflight(client: TestClient, origin: str, method: str = "GET"):
    return client.options(
        SCENARIO_URL,
        headers={"Origin": origin, "Access-Control-Request-Method": method},
    )


# Success


def test_scenario_is_json_with_major_1_and_sources(client: TestClient) -> None:
    response = client.get(SCENARIO_URL)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    doc = response.json()
    assert re.fullmatch(r"1\.\d+", doc["schema_version"])
    assert doc["scenario_id"] == "hawksbill-gap"
    assert doc["sources"]
    for source in doc["sources"]:
        assert source["id"] and source["url"].startswith("https://")


# Unavailable bundle


def write(path: Path, content: str | bytes) -> Path:
    if isinstance(content, bytes):
        path.write_bytes(content)
    else:
        path.write_text(content, encoding="utf-8")
    return path


@pytest.mark.parametrize(
    "make_path",
    [
        pytest.param(lambda tmp: tmp / "missing.json", id="missing"),
        pytest.param(lambda tmp: tmp, id="unreadable-directory"),
        pytest.param(lambda tmp: write(tmp / "s.json", "{not json"), id="invalid-json"),
        pytest.param(lambda tmp: write(tmp / "s.json", b"\xff\x00"), id="invalid-utf8"),
        pytest.param(
            lambda tmp: write(tmp / "s.json", json.dumps({"schema_version": "2.0"})),
            id="unsupported-major",
        ),
        pytest.param(lambda tmp: write(tmp / "s.json", "{}"), id="missing-version"),
    ],
)
def test_unavailable_bundle_returns_clean_503(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, tmp_path: Path, make_path
) -> None:
    monkeypatch.setitem(SCENARIO_PATHS, "hawksbill-gap", make_path(tmp_path))
    response = client.get(SCENARIO_URL)
    assert response.status_code == 503
    assert response.headers["content-type"].startswith("application/json")
    assert response.json() == {"detail": "Scenario temporarily unavailable"}
    assert "Traceback" not in response.text
    assert str(tmp_path) not in response.text


def test_failure_is_not_cached(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    real_path = SCENARIO_PATHS["hawksbill-gap"]
    monkeypatch.setitem(SCENARIO_PATHS, "hawksbill-gap", tmp_path / "missing.json")
    assert client.get(SCENARIO_URL).status_code == 503
    monkeypatch.setitem(SCENARIO_PATHS, "hawksbill-gap", real_path)
    assert client.get(SCENARIO_URL).status_code == 200


def test_503_keeps_cors_header_so_the_browser_can_show_it(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setitem(SCENARIO_PATHS, "hawksbill-gap", tmp_path / "missing.json")
    response = client.get(SCENARIO_URL, headers={"Origin": LOCAL_ORIGIN})
    assert response.status_code == 503
    assert response.headers["access-control-allow-origin"] == LOCAL_ORIGIN


# CORS with several configured origins


@pytest.mark.parametrize("origin", [LOCAL_ORIGIN, PAGES_ORIGIN])
def test_each_configured_origin_may_get_the_scenario(
    cors_client: TestClient, origin: str
) -> None:
    response = cors_client.get(SCENARIO_URL, headers={"Origin": origin})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert "access-control-allow-credentials" not in response.headers


@pytest.mark.parametrize("origin", [LOCAL_ORIGIN, PAGES_ORIGIN])
def test_each_configured_origin_passes_preflight(
    cors_client: TestClient, origin: str
) -> None:
    response = preflight(cors_client, origin)
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert "GET" in response.headers["access-control-allow-methods"]


@pytest.mark.parametrize(
    "origin",
    [
        "https://evil.example.com",
        "https://1a2b3c4d.crimson-horizon.pages.dev",  # previews need their own entry
        "http://crimson-horizon.pages.dev",
        "http://localhost:3000",
    ],
)
def test_unlisted_origin_gets_no_cors_header(
    cors_client: TestClient, origin: str
) -> None:
    response = cors_client.get(SCENARIO_URL, headers={"Origin": origin})
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers
    rejected = preflight(cors_client, origin)
    assert rejected.status_code == 400
    assert "access-control-allow-origin" not in rejected.headers


def test_preflight_rejects_write_methods(cors_client: TestClient) -> None:
    assert preflight(cors_client, PAGES_ORIGIN, method="POST").status_code == 400


# Existing response shapes


def test_health_shape(client: TestClient) -> None:
    payload = client.get("/health").json()
    assert set(payload) == {"status"} and isinstance(payload["status"], str)


def test_terrain_layers_shape(client: TestClient) -> None:
    response = client.get("/terrain/layers")
    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {
        "crs",
        "radius_m",
        "default_center",
        "default_zoom",
        "layers",
    }
    assert isinstance(payload["crs"], str)
    assert isinstance(payload["radius_m"], float)
    assert len(payload["default_center"]) == 2
    assert isinstance(payload["default_zoom"], int)
    layer_keys = {
        "id",
        "name",
        "scope",
        "resolution_m",
        "tile_url",
        "format",
        "min_zoom",
        "max_zoom",
        "extent",
        "attribution",
        "source_url",
    }
    for layer in payload["layers"]:
        assert set(layer) == layer_keys
        assert isinstance(layer["min_zoom"], int) and isinstance(layer["max_zoom"], int)
        assert len(layer["extent"]) == 4
        assert "{z}" in layer["tile_url"] and "{x}" in layer["tile_url"]


def test_terrain_landmarks_shape(client: TestClient) -> None:
    response = client.get("/terrain/landmarks")
    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {"type", "features"}
    for feature in payload["features"]:
        assert set(feature) == {"type", "id", "geometry", "properties"}
        assert set(feature["geometry"]) == {"type", "coordinates"}
        assert set(feature["properties"]) == {"name", "category", "summary", "source"}


# No network at runtime


def test_scenario_endpoint_makes_no_upstream_request(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def blocked(*args, **kwargs):
        raise AssertionError("network access attempted")

    # Start the in-process event loop first: on Windows it opens a local socketpair.
    with client:
        monkeypatch.setattr(socket.socket, "connect", blocked)
        monkeypatch.setattr(socket, "create_connection", blocked)
        monkeypatch.setattr(socket, "getaddrinfo", blocked)
        monkeypatch.setattr(urllib.request, "urlopen", blocked)
        response = client.get(SCENARIO_URL)
        monkeypatch.undo()
    assert response.status_code == 200
    assert response.json()["sources"]


# Render build (render.yaml: rootDir backend, uv sync --frozen --no-dev)


def test_scenario_file_ships_inside_the_backend_root() -> None:
    path = SCENARIO_PATHS["hawksbill-gap"].resolve()
    assert path.is_relative_to(BACKEND_ROOT / "data")
    assert path.is_file() and path.stat().st_size > 0


def test_render_blueprint_matches_the_runtime_layout() -> None:
    text = (REPO_ROOT / "render.yaml").read_text(encoding="utf-8")
    lines = {line.strip() for line in text.splitlines()}
    assert "rootDir: backend" in lines
    assert "buildCommand: uv sync --frozen --no-dev" in lines
    assert "healthCheckPath: /health" in lines
    assert "- key: CORS_ORIGINS" in lines
    assert "uvicorn app.main:app" in text


def test_runtime_dependencies_exclude_prep_tools() -> None:
    project = tomllib.loads((BACKEND_ROOT / "pyproject.toml").read_text("utf-8"))
    runtime = " ".join(project["project"]["dependencies"]).lower()
    for name in ("rasterio", "numpy", "gdal"):
        assert name not in runtime
    assert "default-groups" not in project.get("tool", {}).get("uv", {})


def test_app_serves_the_scenario_without_prep_modules() -> None:
    script = (
        "import sys\n"
        "for name in ('prep', 'rasterio', 'numpy', 'osgeo'):\n"
        "    sys.modules[name] = None\n"
        "from fastapi.testclient import TestClient\n"
        "from app.main import app\n"
        "response = TestClient(app).get('/scenarios/hawksbill-gap')\n"
        "assert response.status_code == 200, response.status_code\n"
    )
    result = subprocess.run(
        [sys.executable, "-c", script],
        cwd=BACKEND_ROOT,
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    assert result.returncode == 0, result.stderr
