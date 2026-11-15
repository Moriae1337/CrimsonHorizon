"""Route planner over a terrain site: shortest vs lower-risk (specs/sites-api.md).

Both routes are A* searches on the 8-connected elevation grid, then shortened
with line-of-sight string pulling so they are not bound to 45-degree steps.

- shortest: cost = 3D distance. Moves steeper than `max_grade_deg` along the
  direction of travel, or touching NoData, are not allowed.
- lower_risk: the same constraint, with distance weighted by surface slope and
  roughness: d * (1 + 4 (slope / max_grade)^2 + roughness / roughness_p90).

`max_grade_deg` is a planning parameter chosen by the user, not a cited
spacesuit limit (none is cited yet), so the response never calls a route safe.
Walking time uses the project's spacesuit-scaled Tobler function
(prep.eva_budget): W(S) = (2.5 / (6 exp(-0.175))) * 6 exp(-3.5 |S + 0.05|) km/h.
"""

import heapq
import itertools
import math
from collections.abc import Callable
from typing import Any

from app.sites import TerrainGrid

GRADE_CLASS_EDGES_DEG = (0.0, 5.0, 10.0, 15.0, 20.0, 25.0)
SLOPE_WEIGHT = 4.0
FLAT_SUIT_KMH = 2.5
MAX_WAYPOINTS = 8
SQRT2 = math.sqrt(2.0)
NEIGHBOURS = (
    (-1, -1, SQRT2),
    (-1, 0, 1.0),
    (-1, 1, SQRT2),
    (0, -1, 1.0),
    (0, 1, 1.0),
    (1, -1, SQRT2),
    (1, 0, 1.0),
    (1, 1, SQRT2),
)


class RouteError(ValueError):
    """A request that cannot produce a route (outside grid, NoData, unreachable)."""


def _p90(values: tuple[float, ...]) -> float:
    s = sorted(values)
    return max(s[int(0.9 * (len(s) - 1))], 1e-3)


def _risk_factor(
    grid: TerrainGrid, i: int, max_grade: float, rough_ref: float
) -> float:
    s = grid.slope_deg[i] / max_grade
    return 1.0 + SLOPE_WEIGHT * s * s + grid.roughness_m[i] / rough_ref


def _astar(
    grid: TerrainGrid,
    start: int,
    goal: int,
    max_tan: float,
    weight: Callable[[int], float] | None,
) -> list[int]:
    rows, cols, cell, z = grid.rows, grid.cols, grid.cell, grid.z
    gx, gy = divmod(goal, cols)
    g_cost = {start: 0.0}
    came: dict[int, int] = {}
    heap = [(0.0, start)]
    closed: set[int] = set()
    while heap:
        _, cur = heapq.heappop(heap)
        if cur == goal:
            path = [cur]
            while cur in came:
                cur = came[cur]
                path.append(cur)
            return path[::-1]
        if cur in closed:
            continue
        closed.add(cur)
        r, c = divmod(cur, cols)
        zc = z[cur]
        assert zc is not None
        wc = weight(cur) if weight else 1.0
        base = g_cost[cur]
        for dr, dc, k in NEIGHBOURS:
            rr, cc = r + dr, c + dc
            if not (0 <= rr < rows and 0 <= cc < cols):
                continue
            nb = rr * cols + cc
            if nb in closed:
                continue
            zn = z[nb]
            if zn is None:
                continue
            run = k * cell
            dz = zn - zc
            if abs(dz) > max_tan * run:
                continue
            if dr and dc:
                # A diagonal crosses two more cells; check both halves through
                # the bilinear midpoint so the densified profile obeys the limit.
                za, zb = z[r * cols + cc], z[rr * cols + c]
                if za is None or zb is None:
                    continue
                zm = 0.25 * (zc + zn + za + zb)
                half = max_tan * run * 0.5
                if abs(zm - zc) > half or abs(zn - zm) > half:
                    continue
            step = math.sqrt(run * run + dz * dz)
            if weight:
                step *= 0.5 * (wc + weight(nb))
            ng = base + step
            if ng < g_cost.get(nb, math.inf):
                g_cost[nb] = ng
                came[nb] = cur
                h = cell * math.hypot(rr - gx, cc - gy)
                heapq.heappush(heap, (ng + h, nb))
    raise RouteError("no route within the grade limit between these points")


def _segment_cost(
    grid: TerrainGrid,
    a: tuple[float, float],
    b: tuple[float, float],
    max_tan: float,
    weight: Callable[[int], float] | None,
) -> float | None:
    """Cost of the straight segment a->b sampled at half-cell steps; None if invalid."""
    length = math.dist(a, b)
    # Twice the profile density, so every profile step spans two checked steps.
    n = 2 * max(1, (math.ceil(length / grid.cell)))
    total = 0.0
    prev_z = grid.sample(*a)
    if prev_z is None:
        return None
    run = length / n
    for k in range(1, n + 1):
        t = k / n
        x = a[0] + (b[0] - a[0]) * t
        y = a[1] + (b[1] - a[1]) * t
        zk = grid.sample(x, y)
        if zk is None:
            return None
        dz = zk - prev_z
        if abs(dz) > max_tan * run + 1e-9:
            return None
        step = math.sqrt(run * run + dz * dz)
        if weight:
            i = grid.index(x, y)
            if i is None:
                return None
            step *= weight(i)
        total += step
        prev_z = zk
    return total


def _string_pull(
    grid: TerrainGrid,
    pts: list[tuple[float, float]],
    max_tan: float,
    weight: Callable[[int], float] | None,
    lookahead: int = 48,
) -> list[tuple[float, float]]:
    """Greedy any-angle shortcutting; a shortcut must not cost more than the path."""
    if len(pts) <= 2:
        return pts
    # Prefix costs along the grid path for cost comparison.
    prefix = [0.0]
    for p, q in itertools.pairwise(pts):
        c = _segment_cost(grid, p, q, math.inf, weight)
        prefix.append(prefix[-1] + (c if c is not None else math.dist(p, q) * 1e3))
    out = [pts[0]]
    i = 0
    while i < len(pts) - 1:
        best = i + 1
        for j in range(min(len(pts) - 1, i + lookahead), i + 1, -1):
            c = _segment_cost(grid, pts[i], pts[j], max_tan, weight)
            if c is not None and c <= (prefix[j] - prefix[i]) * 1.001:
                best = j
                break
        out.append(pts[best])
        i = best
    return out


def _densify_profile(
    grid: TerrainGrid, poly: list[tuple[float, float]]
) -> list[dict[str, float]]:
    """Samples every cell length along the polyline: d (2D), z, grade, slope."""
    out: list[dict[str, float]] = []
    d0 = 0.0
    for a, b in itertools.pairwise(poly):
        length = math.dist(a, b)
        n = max(1, (math.ceil(length / grid.cell)))
        for k in range(0 if not out else 1, n + 1):
            t = k / n
            x = a[0] + (b[0] - a[0]) * t
            y = a[1] + (b[1] - a[1]) * t
            zk = grid.sample(x, y)
            i = grid.index(x, y)
            out.append(
                {
                    "d": d0 + length * t,
                    "x": x,
                    "y": y,
                    "z": zk if zk is not None else math.nan,
                    "slope": grid.slope_deg[i] if i is not None else math.nan,
                }
            )
        d0 += length
    return out


def suit_speed_kmh(grade_tan: float) -> float:
    return (
        (FLAT_SUIT_KMH / (6.0 * math.exp(-0.175)))
        * 6.0
        * math.exp(-3.5 * abs(grade_tan + 0.05))
    )


def _grade_class(grade: float) -> str:
    for low, high in itertools.pairwise(GRADE_CLASS_EDGES_DEG):
        if low <= grade < high:
            return f"{low:g}-{high:g}"
    return f"{GRADE_CLASS_EDGES_DEG[-1]:g}+"


def _metrics(samples: list[dict[str, float]]) -> dict[str, Any]:
    length3d = ascent = descent = minutes = max_grade = 0.0
    classes = {_grade_class(g): 0.0 for g in GRADE_CLASS_EDGES_DEG}
    for a, b in itertools.pairwise(samples):
        run = b["d"] - a["d"]
        if run <= 0:
            continue
        dz = b["z"] - a["z"]
        grade = math.degrees(math.atan(abs(dz) / run))
        length3d += math.hypot(run, dz)
        ascent += max(dz, 0.0)
        descent += max(-dz, 0.0)
        max_grade = max(max_grade, grade)
        classes[_grade_class(grade)] += run
        minutes += (math.hypot(run, dz) / 1000.0) / suit_speed_kmh(dz / run) * 60.0
    slopes = [s["slope"] for s in samples if not math.isnan(s["slope"])]
    return {
        "length_m": round(samples[-1]["d"], 1) if samples else 0.0,
        "length_3d_m": round(length3d, 1),
        "ascent_m": round(ascent, 1),
        "descent_m": round(descent, 1),
        "max_grade_deg": round(max_grade, 1),
        "mean_surface_slope_deg": round(sum(slopes) / len(slopes), 1) if slopes else 0,
        "max_surface_slope_deg": round(max(slopes), 1) if slopes else 0,
        "walk_minutes": round(minutes, 1),
        "grade_class_m": {k: round(v, 1) for k, v in classes.items()},
    }


def _snap(grid: TerrainGrid, xy: tuple[float, float], label: str) -> int:
    i = grid.index(*xy)
    if i is None:
        raise RouteError(f"{label} is outside the terrain window")
    if grid.z[i] is None:
        raise RouteError(f"{label} has no valid elevation")
    return i


def plan_routes(
    grid: TerrainGrid,
    waypoints: list[tuple[float, float]],
    max_grade_deg: float = 25.0,
) -> dict[str, Any]:
    """Plan shortest and lower-risk routes through waypoints (local metres)."""
    if not 2 <= len(waypoints) <= MAX_WAYPOINTS + 2:
        raise RouteError("need a start, an end and at most 8 stops")
    if not 5.0 <= max_grade_deg <= 45.0:
        raise RouteError("max_grade_deg must be between 5 and 45")
    max_tan = math.tan(math.radians(max_grade_deg))
    idx = [
        _snap(
            grid,
            p,
            "start" if k == 0 else "end" if k == len(waypoints) - 1 else f"stop {k}",
        )
        for k, p in enumerate(waypoints)
    ]
    rough_ref = _p90(grid.roughness_m)
    weights: dict[str, Callable[[int], float] | None] = {
        "shortest": None,
        "lower_risk": lambda i: _risk_factor(grid, i, max_grade_deg, rough_ref),
    }
    routes = []
    for route_id, weight in weights.items():
        poly: list[tuple[float, float]] = []
        for a, b in itertools.pairwise(idx):
            if a == b:
                continue
            cells = _astar(grid, a, b, max_tan, weight)
            pts = [grid.center(i) for i in cells]
            leg = _string_pull(grid, pts, max_tan, weight)
            poly.extend(leg if not poly else leg[1:])
        if len(poly) < 2:
            raise RouteError("start and end are in the same cell")
        samples = _densify_profile(grid, poly)
        metrics = _metrics(samples)
        routes.append(
            {
                "id": route_id,
                "metrics": metrics,
                "path_xy": [[round(x, 2), round(y, 2)] for x, y in poly],
                "path_lon_lat": [
                    [round(v, 7) for v in grid.to_lon_lat(x, y)] for x, y in poly
                ],
                "profile": [
                    {
                        "d": round(s["d"], 1),
                        "z": None if math.isnan(s["z"]) else round(s["z"], 2),
                        "x": round(s["x"], 2),
                        "y": round(s["y"], 2),
                        "slope": None
                        if math.isnan(s["slope"])
                        else round(s["slope"], 1),
                    }
                    for s in samples
                ],
            }
        )
    return {
        "max_grade_deg": max_grade_deg,
        "waypoints_xy": [[round(x, 2), round(y, 2)] for x, y in waypoints],
        "routes": routes,
        "model": {
            "search": "A* on the 8-connected grid + line-of-sight string pulling",
            "lower_risk_weight": "d * (1 + 4 (slope / max_grade)^2 + roughness / p90)",
            "walk_speed": "spacesuit-scaled Tobler, 2.5 km/h on flat ground",
            "caveat": "max_grade_deg is a planning parameter, not a cited suit "
            "limit; no route is declared safe.",
        },
    }
