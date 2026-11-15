"""Tests for 3D terrain sites and the route planner."""

import math

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routing import RouteError, plan_routes, suit_speed_kmh
from app.sites import (
    SITE_DIRS,
    TerrainGrid,
    _slope_and_roughness,
    aeqd_forward,
    aeqd_inverse,
    load_grid,
    load_site,
)

client = TestClient(app)


def make_grid(z: list[list[float | None]], cell: float = 1.0) -> TerrainGrid:
    rows, cols = len(z), len(z[0])
    flat = [v for row in z for v in row]
    slope, rough = _slope_and_roughness(flat, rows, cols, cell)
    return TerrainGrid(
        rows=rows,
        cols=cols,
        cell=cell,
        left=0.0,
        top=rows * cell,
        z=tuple(flat),
        slope_deg=tuple(slope),
        roughness_m=tuple(rough),
        lon0=0.0,
        lat0=0.0,
        radius=3_396_190.0,
    )


def flat_grid(n: int = 20) -> TerrainGrid:
    return make_grid([[0.0] * n for _ in range(n)])


def test_aeqd_round_trip() -> None:
    for lon0, lat0 in ((175.5235, -14.605), (77.406, 18.459)):
        x, y = aeqd_forward(lon0 + 0.01, lat0 - 0.008, lon0, lat0, 3_396_190.0)
        lon, lat = aeqd_inverse(x, y, lon0, lat0, 3_396_190.0)
        assert lon == pytest.approx(lon0 + 0.01, abs=1e-9)
        assert lat == pytest.approx(lat0 - 0.008, abs=1e-9)
        # ~0.01 deg of longitude is ~593 m * cos(lat) on Mars.
        assert x == pytest.approx(592.75 * math.cos(math.radians(lat0)), rel=2e-3)


def test_flat_route_is_straight_line() -> None:
    grid = flat_grid()
    result = plan_routes(grid, [(0.5, 0.5), (19.5, 19.5)])
    for route in result["routes"]:
        assert route["path_xy"] == [[0.5, 0.5], [19.5, 19.5]]
        assert route["metrics"]["length_m"] == pytest.approx(19 * math.sqrt(2), 0.01)
        assert route["metrics"]["ascent_m"] == 0
        assert route["metrics"]["max_grade_deg"] == 0


def test_routes_avoid_a_steep_wall_and_respect_the_grade_limit() -> None:
    # A 3 m high wall across the grid with a single low gap near the top.
    n = 20
    z: list[list[float | None]] = [[0.0] * n for _ in range(n)]
    for r in range(n):
        if r > 2:
            z[r][10] = 3.0
    grid = make_grid(z)
    result = plan_routes(grid, [(2.5, 10.5), (17.5, 10.5)], max_grade_deg=20)
    for route in result["routes"]:
        assert route["metrics"]["max_grade_deg"] <= 20.0
        # Must detour through the gap (rows 0-2 => y >= 17).
        assert max(y for _, y in route["path_xy"]) >= 17.0
        assert route["metrics"]["length_m"] > 15.0


def test_lower_risk_trades_distance_for_gentler_slopes() -> None:
    # A rough, sloped hump in the middle of the direct line.
    n = 40
    z: list[list[float | None]] = [[0.0] * n for _ in range(n)]
    for r in range(n):
        for c in range(n):
            d = math.hypot(r - 20, c - 20)
            if d < 10:
                z[r][c] = 4.0 * (1 - d / 10) + (0.4 if (r + c) % 2 else 0.0)
    grid = make_grid(z)
    result = plan_routes(grid, [(1.5, 20.5), (38.5, 20.5)], max_grade_deg=30)
    by_id = {r["id"]: r["metrics"] for r in result["routes"]}
    assert by_id["lower_risk"]["length_m"] >= by_id["shortest"]["length_m"]
    assert (
        by_id["lower_risk"]["mean_surface_slope_deg"]
        < by_id["shortest"]["mean_surface_slope_deg"]
    )


def test_nodata_is_never_crossed() -> None:
    n = 12
    z: list[list[float | None]] = [[0.0] * n for _ in range(n)]
    for r in range(n):
        z[r][6] = None
    grid = make_grid(z)
    with pytest.raises(RouteError, match="no route"):
        plan_routes(grid, [(1.5, 5.5), (10.5, 5.5)])
    with pytest.raises(RouteError, match="no valid elevation"):
        plan_routes(grid, [(6.5, 5.5), (10.5, 5.5)])


def test_waypoints_are_visited_in_order() -> None:
    grid = flat_grid()
    result = plan_routes(grid, [(0.5, 0.5), (19.5, 0.5), (19.5, 19.5)])
    path = result["routes"][0]["path_xy"]
    assert [19.5, 0.5] in path
    assert result["routes"][0]["metrics"]["length_m"] == pytest.approx(38.0, 0.01)


def test_invalid_requests() -> None:
    grid = flat_grid()
    with pytest.raises(RouteError, match="outside"):
        plan_routes(grid, [(0.5, 0.5), (99.0, 0.5)])
    with pytest.raises(RouteError, match="max_grade_deg"):
        plan_routes(grid, [(0.5, 0.5), (5.5, 0.5)], max_grade_deg=60)
    with pytest.raises(RouteError, match="at most 8"):
        plan_routes(grid, [(0.5, 0.5)] * 11)


def test_suit_speed_matches_eva_budget_baseline() -> None:
    assert suit_speed_kmh(0.0) == pytest.approx(2.5)
    assert suit_speed_kmh(0.2) < suit_speed_kmh(0.0)


@pytest.mark.parametrize("site_id", sorted(SITE_DIRS))
def test_committed_packages_decode(site_id: str) -> None:
    doc = load_site(site_id)
    grid = load_grid(site_id)
    rows, cols = doc["shape"]
    assert len(grid.z) == rows * cols
    valid = [v for v in grid.z if v is not None]
    assert min(valid) == pytest.approx(doc["elevation"]["min_m"], abs=0.01)
    assert max(valid) == pytest.approx(doc["elevation"]["max_m"], abs=0.01)
    assert doc["sources"] and all(
        s["url"].startswith("https://") for s in doc["sources"]
    )
    assert (SITE_DIRS[site_id] / doc["texture"]["path"]).is_file()


def test_sites_endpoints() -> None:
    listing = client.get("/sites").json()["sites"]
    assert {s["site_id"] for s in listing} == set(SITE_DIRS)

    terrain = client.get("/sites/columbia-hills/terrain")
    assert terrain.status_code == 200
    assert terrain.json()["region"] == "Gusev crater"
    # Rebuilt packages must reach browsers: revalidate with an ETag, 304 when unchanged.
    assert "no-cache" in terrain.headers["cache-control"]
    etag = terrain.headers["etag"]
    again = client.get("/sites/columbia-hills/terrain", headers={"If-None-Match": etag})
    assert again.status_code == 304
    assert again.headers["etag"] == etag

    texture = client.get("/sites/columbia-hills/texture.jpg")
    assert texture.status_code == 200
    assert texture.headers["content-type"] == "image/jpeg"

    assert client.get("/sites/olympus/terrain").status_code == 404
    assert client.get("/sites/olympus/texture.jpg").status_code == 404


def test_routes_endpoint() -> None:
    response = client.get(
        "/sites/hawksbill-gap/routes",
        params={"start": "-100,-150", "end": "120,140", "max_grade_deg": 25},
    )
    assert response.status_code == 200
    body = response.json()
    assert [r["id"] for r in body["routes"]] == ["shortest", "lower_risk"]
    for route in body["routes"]:
        assert route["metrics"]["max_grade_deg"] <= 25.0
        lon, lat = route["path_lon_lat"][0]
        assert 77.40 < lon < 77.41 and 18.45 < lat < 18.47
        assert route["profile"][0]["d"] == 0


@pytest.mark.parametrize(
    ("params", "status"),
    [
        ({"start": "a,b", "end": "1,1"}, 422),
        ({"start": "1,1;2,2", "end": "1,1"}, 422),
        ({"start": "0,0", "end": "9999,0"}, 422),
        ({"start": "0,0", "end": "10,0", "max_grade_deg": 80}, 422),
        ({"start": "nan,0", "end": "10,0"}, 422),
    ],
)
def test_routes_endpoint_rejects_bad_input(params: dict, status: int) -> None:
    assert (
        client.get("/sites/hawksbill-gap/routes", params=params).status_code == status
    )


def test_nomenclature_endpoint() -> None:
    response = client.get("/terrain/nomenclature")
    assert response.status_code == 200
    features = {f["name"]: f for f in response.json()["features"]}
    assert len(features) > 500
    assert features["Olympus Mons"]["lon"] == pytest.approx(-133.8, abs=0.1)
    assert features["Jezero"]["category"] == "crater"
    assert all(-180 <= f["lon"] <= 180 for f in features.values())
    assert features["Gusev"]["link"].startswith("https://planetarynames.wr.usgs.gov/")


def test_coarse_to_fine_matches_full_search_and_detours_a_wall(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """On a large grid the corridor search must still respect walls and the limit."""
    from app import routing

    n = 120
    # A ridge across the grid with one gap near the top: the route must use the gap.
    z = [[0.0] * n for _ in range(n)]
    for r in range(n):
        if r > 12:
            z[r][60] = 50.0
            z[r][61] = 50.0
    grid = make_grid(z, cell=2.0)
    wps = [(20.0, 30.0), (220.0, 30.0)]
    monkeypatch.setattr(routing, "HIERARCHY_MIN_CELLS", 10**9)
    full = plan_routes(grid, wps)
    monkeypatch.setattr(routing, "HIERARCHY_MIN_CELLS", 1_000)
    fine = plan_routes(grid, wps)
    for a, b in zip(full["routes"], fine["routes"], strict=True):
        assert b["metrics"]["max_grade_deg"] <= 25.0
        # The detour through the gap is long; the corridor result stays near optimal.
        assert b["metrics"]["length_m"] == pytest.approx(
            a["metrics"]["length_m"], rel=0.03
        )
        assert min(y for _, y in b["path_xy"]) < 2.0 * n - 2.0 * 12


def test_coarse_to_fine_falls_back_when_coarse_grid_is_blocked(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A gap narrower than a coarse cell is invisible at coarse scale: fall back."""
    from app import routing

    n = 80
    z = [[0.0] * n for _ in range(n)]
    for r in range(n):
        if r != 40:  # one-cell gap in the wall at row 40
            z[r][40] = 80.0
    grid = make_grid(z, cell=2.0)
    monkeypatch.setattr(routing, "HIERARCHY_MIN_CELLS", 1_000)
    result = plan_routes(grid, [(10.0, 80.0), (150.0, 80.0)])
    for route in result["routes"]:
        assert route["metrics"]["max_grade_deg"] <= 25.0


@pytest.mark.parametrize("site_id", sorted(SITE_DIRS))
def test_traverse_endpoint(site_id: str) -> None:
    res = client.get(f"/sites/{site_id}/traverse")
    assert res.status_code == 200
    doc = res.json()
    assert doc["rover"] in ("spirit", "perseverance")
    pkg = load_site(site_id)
    b = pkg["bounds_m"]
    assert doc["stops"], "every site window holds part of a rover traverse"
    for s in doc["stops"]:
        assert b["left"] <= s["x"] <= b["right"]
        assert b["bottom"] <= s["y"] <= b["top"]
        assert s["sol_start"] <= s["sol_end"]
    assert all(len(line) > 1 for line in doc["lines"])
    assert "no-cache" in res.headers["cache-control"]
    cached = client.get(
        f"/sites/{site_id}/traverse", headers={"If-None-Match": res.headers["etag"]}
    )
    assert cached.status_code == 304
    assert client.get("/sites/nowhere/traverse").status_code == 404


def test_rover_segment_follows_the_line_between_nearest_points() -> None:
    from app.routing import rover_segment

    line = [(0.0, 0.0), (100.0, 0.0), (100.0, 100.0), (0.0, 100.0)]
    assert rover_segment([line], (5.0, 3.0), (2.0, 98.0)) == line
    # B before A along the rover's order: the slice comes back reversed.
    assert rover_segment([line], (100.0, 95.0), (98.0, 2.0)) == [
        (100.0, 100.0),
        (100.0, 0.0),
    ]
    # Too far from the line: no rover route.
    assert rover_segment([line], (500.0, 500.0), (0.0, 100.0)) is None


def test_routes_endpoint_returns_rover_path_between_rover_stops() -> None:
    trav = client.get("/sites/jezero-crater/traverse").json()
    first, last = trav["stops"][0], trav["stops"][-1]
    params = {
        "start": f"{first['x']},{first['y']}",
        "end": f"{last['x']},{last['y']}",
        "rover": "true",
    }
    res = client.get("/sites/jezero-crater/routes", params=params)
    assert res.status_code == 200
    routes = {r["id"]: r for r in res.json()["routes"]}
    assert set(routes) == {"shortest", "lower_risk", "rover"}
    rover = routes["rover"]["metrics"]["length_m"]
    # The real drive wanders: much longer than the planned shortest route.
    assert rover > routes["shortest"]["metrics"]["length_m"] * 1.5
    # Without the flag the response is unchanged.
    plain = client.get(
        "/sites/jezero-crater/routes",
        params={k: v for k, v in params.items() if k != "rover"},
    )
    assert {r["id"] for r in plain.json()["routes"]} == {"shortest", "lower_risk"}
