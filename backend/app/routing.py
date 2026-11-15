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
from dataclasses import dataclass
from typing import Any

from app.sites import TerrainGrid, _slope_and_roughness

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


def _risk_weights(grid: TerrainGrid, max_grade: float, rough_ref: float) -> list[float]:
    """Per-cell lower-risk factor: 1 + 4 (slope / max_grade)^2 + roughness / p90."""
    inv = 1.0 / max_grade
    return [
        1.0 + SLOPE_WEIGHT * (s * inv) ** 2 + r / rough_ref
        for s, r in zip(grid.slope_deg, grid.roughness_m, strict=True)
    ]


def _astar(
    grid: TerrainGrid,
    start: int,
    goal: int,
    max_tan: float,
    weight: list[float] | None,
    allowed: bytearray | None = None,
) -> list[int]:
    """A* on the 8-connected grid; `allowed` optionally restricts it to a corridor."""
    rows, cols, cell, z = grid.rows, grid.cols, grid.cell, grid.z
    n = rows * cols
    g_cost = [math.inf] * n
    came = [-1] * n
    if allowed is None:
        closed = bytearray(n)
    else:
        # Cells outside the corridor behave as already closed.
        closed = bytearray(allowed.translate(_INVERT))
        closed[start] = 0
        closed[goal] = 0
    goal_r, goal_c = divmod(goal, cols)
    moves = [
        (dr, dc, dr * cols + dc, k * cell, max_tan * k * cell, max_tan * k * cell / 2)
        for dr, dc, k in NEIGHBOURS
    ]
    diag_extra = (SQRT2 - 2.0) * cell
    g_cost[start] = 0.0
    heap = [(0.0, start)]
    push, pop, sqrt = heapq.heappush, heapq.heappop, math.sqrt
    while heap:
        _, cur = pop(heap)
        if cur == goal:
            path = [cur]
            while came[cur] >= 0:
                cur = came[cur]
                path.append(cur)
            return path[::-1]
        if closed[cur]:
            continue
        closed[cur] = 1
        r, c = divmod(cur, cols)
        zc = z[cur]
        if zc is None:
            continue
        wc = weight[cur] if weight is not None else 1.0
        base = g_cost[cur]
        for dr, dc, off, run, lim, half in moves:
            rr = r + dr
            cc = c + dc
            if rr < 0 or rr >= rows or cc < 0 or cc >= cols:
                continue
            nb = cur + off
            if closed[nb]:
                continue
            zn = z[nb]
            if zn is None:
                continue
            dz = zn - zc
            if dz > lim or -dz > lim:
                continue
            if dr and dc:
                # A diagonal crosses two more cells; check both halves through
                # the bilinear midpoint so the densified profile obeys the limit.
                za = z[cur + dc]
                zb = z[cur + dr * cols]
                if za is None or zb is None:
                    continue
                zm = 0.25 * (zc + zn + za + zb)
                if abs(zm - zc) > half or abs(zn - zm) > half:
                    continue
            step = sqrt(run * run + dz * dz)
            if weight is not None:
                step *= 0.5 * (wc + weight[nb])
            ng = base + step
            if ng < g_cost[nb]:
                g_cost[nb] = ng
                came[nb] = cur
                # Octile distance: admissible, as every move costs at least its run.
                ar = rr - goal_r if rr > goal_r else goal_r - rr
                ac = cc - goal_c if cc > goal_c else goal_c - cc
                h = cell * (ar + ac) + diag_extra * (min(ac, ar))
                push(heap, (ng + h, nb))
    raise RouteError("no route within the grade limit between these points")


_INVERT = bytes([1, 0]) + bytes(254)

# Grids at least this large are searched coarse-to-fine: first on a block-averaged
# grid, then on the full grid inside a corridor around the coarse path. If either
# step finds nothing, the full grid is searched, so no route is lost.
HIERARCHY_MIN_CELLS = 300_000
CORRIDOR_RADIUS = 10  # coarse cells on each side of the coarse path


@dataclass(frozen=True)
class _Coarse:
    grid: TerrainGrid
    factor: int


_COARSE_CACHE: dict[int, tuple[TerrainGrid, _Coarse]] = {}


def _coarse(grid: TerrainGrid) -> _Coarse:
    """Block-averaged copy of a large grid (cached per grid object)."""
    hit = _COARSE_CACHE.get(id(grid))
    if hit is not None and hit[0] is grid:
        return hit[1]
    f = max(2, math.ceil(math.sqrt(grid.rows * grid.cols / 60_000)))
    rows, cols = math.ceil(grid.rows / f), math.ceil(grid.cols / f)
    z: list[float | None] = []
    for r in range(rows):
        for c in range(cols):
            vals = [
                v
                for rr in range(r * f, min((r + 1) * f, grid.rows))
                for cc in range(c * f, min((c + 1) * f, grid.cols))
                if (v := grid.z[rr * grid.cols + cc]) is not None
            ]
            z.append(sum(vals) / len(vals) if 2 * len(vals) >= f * f else None)
    slope, rough = _slope_and_roughness(z, rows, cols, grid.cell * f)
    coarse = _Coarse(
        TerrainGrid(
            rows=rows,
            cols=cols,
            cell=grid.cell * f,
            left=grid.left,
            top=grid.top,
            z=tuple(z),
            slope_deg=tuple(slope),
            roughness_m=tuple(rough),
            lon0=grid.lon0,
            lat0=grid.lat0,
            radius=grid.radius,
        ),
        f,
    )
    if len(_COARSE_CACHE) > 8:
        _COARSE_CACHE.clear()
    _COARSE_CACHE[id(grid)] = (grid, coarse)
    return coarse


def _corridor(grid: TerrainGrid, coarse: _Coarse, path: list[int]) -> bytearray:
    f, cg = coarse.factor, coarse.grid
    rad = CORRIDOR_RADIUS
    marked: set[int] = set()
    for i in path:
        r, c = divmod(i, cg.cols)
        for rr in range(max(r - rad, 0), min(r + rad + 1, cg.rows)):
            for cc in range(max(c - rad, 0), min(c + rad + 1, cg.cols)):
                marked.add(rr * cg.cols + cc)
    mask = bytearray(grid.rows * grid.cols)
    for i in marked:
        r, c = divmod(i, cg.cols)
        c0 = c * f
        c1 = min(c0 + f, grid.cols)
        ones = b"\x01" * (c1 - c0)
        for rr in range(r * f, min(r * f + f, grid.rows)):
            row = rr * grid.cols
            mask[row + c0 : row + c1] = ones
    return mask


def _leg(
    grid: TerrainGrid,
    a: int,
    b: int,
    max_tan: float,
    weight: list[float] | None,
    coarse_weight: Callable[[TerrainGrid], list[float] | None],
) -> list[int]:
    """One leg a->b: coarse-to-fine on large grids, full search otherwise."""
    if grid.rows * grid.cols >= HIERARCHY_MIN_CELLS:
        co = _coarse(grid)
        cg, f = co.grid, co.factor
        ra, ca = divmod(a, grid.cols)
        rb, cb = divmod(b, grid.cols)
        sa = (ra // f) * cg.cols + ca // f
        sb = (rb // f) * cg.cols + cb // f
        if sa != sb and cg.z[sa] is not None and cg.z[sb] is not None:
            try:
                coarse_path = _astar(cg, sa, sb, max_tan, coarse_weight(cg))
                return _astar(
                    grid, a, b, max_tan, weight, _corridor(grid, co, coarse_path)
                )
            except RouteError:
                pass
    return _astar(grid, a, b, max_tan, weight)


def _segment_cost(
    grid: TerrainGrid,
    a: tuple[float, float],
    b: tuple[float, float],
    max_tan: float,
    weight: list[float] | None,
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
        if weight is not None:
            i = grid.index(x, y)
            if i is None:
                return None
            step *= weight[i]
        total += step
        prev_z = zk
    return total


def _string_pull(
    grid: TerrainGrid,
    pts: list[tuple[float, float]],
    max_tan: float,
    weight: list[float] | None,
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


# A and B must lie this close to the rover's line for its real path to be offered.
ROVER_SNAP_M = 150.0


def rover_segment(
    lines: list[list[tuple[float, float]]],
    start: tuple[float, float],
    end: tuple[float, float],
    tol_m: float = ROVER_SNAP_M,
) -> list[tuple[float, float]] | None:
    """The rover's own path between the line points nearest A and B.

    Picks the run where A and B are both within `tol_m` and closest in total, and
    returns its vertices from A's nearest point to B's (reversed if B comes first).
    """
    best: tuple[float, list[tuple[float, float]], int, int] | None = None
    for run in lines:
        if len(run) < 2:
            continue
        ia = min(range(len(run)), key=lambda k: math.dist(run[k], start))
        ib = min(range(len(run)), key=lambda k: math.dist(run[k], end))
        da, db = math.dist(run[ia], start), math.dist(run[ib], end)
        if (
            da <= tol_m
            and db <= tol_m
            and ia != ib
            and (best is None or da + db < best[0])
        ):
            best = (da + db, run, ia, ib)
    if best is None:
        return None
    _, run, ia, ib = best
    return run[ia : ib + 1] if ia < ib else run[ib : ia + 1][::-1]


def _route(
    grid: TerrainGrid, route_id: str, poly: list[tuple[float, float]]
) -> dict[str, Any]:
    samples = [s for s in _densify_profile(grid, poly) if not math.isnan(s["z"])]
    if len(samples) < 2:
        raise RouteError(f"{route_id} route has no valid elevation")
    return {
        "id": route_id,
        "metrics": _metrics(samples),
        "path_xy": [[round(x, 2), round(y, 2)] for x, y in poly],
        "path_lon_lat": [[round(v, 7) for v in grid.to_lon_lat(x, y)] for x, y in poly],
        "profile": [
            {
                "d": round(s["d"], 1),
                "z": round(s["z"], 2),
                "x": round(s["x"], 2),
                "y": round(s["y"], 2),
                "slope": None if math.isnan(s["slope"]) else round(s["slope"], 1),
            }
            for s in samples
        ],
    }


def plan_routes(
    grid: TerrainGrid,
    waypoints: list[tuple[float, float]],
    max_grade_deg: float = 25.0,
    rover_lines: list[list[tuple[float, float]]] | None = None,
) -> dict[str, Any]:
    """Plan shortest and lower-risk routes through waypoints (local metres).

    With `rover_lines` (the rover traverse in the site frame), also returns the
    rover's real path between A and B as route "rover" when both lie near it; it
    ignores stops and the grade limit, since it is the drive the rover made.
    """
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
    weights: dict[str, list[float] | None] = {
        "shortest": None,
        "lower_risk": _risk_weights(grid, max_grade_deg, rough_ref),
    }
    coarse_weights: dict[str, Callable[[TerrainGrid], list[float] | None]] = {
        "shortest": lambda _g: None,
        "lower_risk": lambda g: _risk_weights(g, max_grade_deg, _p90(g.roughness_m)),
    }
    routes = []
    for route_id, weight in weights.items():
        poly: list[tuple[float, float]] = []
        for a, b in itertools.pairwise(idx):
            if a == b:
                continue
            cells = _leg(grid, a, b, max_tan, weight, coarse_weights[route_id])
            pts = [grid.center(i) for i in cells]
            leg = _string_pull(grid, pts, max_tan, weight)
            poly.extend(leg if not poly else leg[1:])
        if len(poly) < 2:
            raise RouteError("start and end are in the same cell")
        routes.append(_route(grid, route_id, poly))
    if rover_lines:
        seg = rover_segment(rover_lines, waypoints[0], waypoints[-1])
        if seg and len(seg) > 1:
            try:
                routes.append(_route(grid, "rover", seg))
            except RouteError:
                pass  # no valid elevation under the rover line here: offer the two routes
    return {
        "max_grade_deg": max_grade_deg,
        "waypoints_xy": [[round(x, 2), round(y, 2)] for x, y in waypoints],
        "routes": routes,
        "model": {
            "search": "A* on the 8-connected grid (coarse-to-fine corridor on "
            "large grids) + line-of-sight string pulling",
            "lower_risk_weight": "d * (1 + 4 (slope / max_grade)^2 + roughness / p90)",
            "walk_speed": "spacesuit-scaled Tobler, 2.5 km/h on flat ground",
            "caveat": "max_grade_deg is a planning parameter, not a cited suit "
            "limit; no route is declared safe.",
        },
    }
