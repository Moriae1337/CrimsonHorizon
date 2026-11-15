"""Controlled numerical tests for core route metrics (CH26-072 / Issue #90).

Tests the fundamental topographic and geometric calculations in prep.profiles and
prep.routes against small, strictly controlled numerical fixtures:
1. Flat route: verify 0 elevation ascent/descent, correct distance calculation
   using Mars spherical radius R = 3,396,190 m.
2. Simple ramp: verify known ascent and slope calculation matching geometry.
3. Return leg: verify that on a round-trip route, outbound descent becomes return
   climb, avoiding reversed ascent logic.
4. Partial elevation coverage / NoData: verify that missing samples/NaN are NOT
   treated as level 0-degree terrain, but properly identified as missing/gap coverage.
"""

import itertools
import math

import pytest

from prep import profiles, routes

MARS_RADIUS_M = 3_396_190.0
NODATA_SENTINEL = -9999.0
USGS_NODATA = -3.4028226550889045e38


# ==============================================================================
# Helper fixtures and builders for controlled test setups
# ==============================================================================


def make_controlled_grid(
    elevations: list[list[float]],
    cell_size_m: float = 1.0,
    origin_x_m: float = 0.0,
    origin_y_m: float = 0.0,
    nodata: float = NODATA_SENTINEL,
    radius_m: float = MARS_RADIUS_M,
) -> profiles.Grid:
    """Build a Grid over a 2D matrix of elevations with known pixel size.

    Transform format: (a, b, c, d, e, f)
      x = c + col * a
      y = f + row * e
    Here a = cell_size_m, e = -cell_size_m (north-up: rows go southward).
    """
    rows = len(elevations)
    transform = (
        cell_size_m,
        0.0,
        origin_x_m,
        0.0,
        -cell_size_m,
        origin_y_m + rows * cell_size_m,
    )
    return profiles.Grid(elevations, transform, nodata, profiles.eqc(radius_m))


def meters_to_lon_deg(distance_m: float, radius_m: float = MARS_RADIUS_M) -> float:
    """Longitude degrees corresponding to distance_m along Mars equator."""
    return math.degrees(distance_m / radius_m)


def meters_to_lat_deg(distance_m: float, radius_m: float = MARS_RADIUS_M) -> float:
    """Latitude degrees corresponding to distance_m along a Mars meridian."""
    return math.degrees(distance_m / radius_m)


# ==============================================================================
# 1. Flat route & Mars Spherical Radius R = 3,396,190 m
# ==============================================================================


class TestFlatRouteMarsRadius:
    """Verify distance calculation with Mars spherical radius R=3,396,190 m

    and 0 elevation ascent/descent on level terrain.
    """

    @pytest.mark.parametrize(
        "distance_target_m",
        [1.0, 5.0, 10.0, 50.0, 100.0, 258.4, 345.2, 1000.0],
    )
    def test_mars_spherical_radius_distance_equator(
        self, distance_target_m: float
    ) -> None:
        """Great-circle distance along equator matches arc length on R=3,396,190 m."""
        dlon = meters_to_lon_deg(distance_target_m, MARS_RADIUS_M)
        p0 = [0.0, 0.0]
        p1 = [dlon, 0.0]

        calc_dist = routes.distance_m(p0, p1, MARS_RADIUS_M)
        assert calc_dist == pytest.approx(distance_target_m, rel=1e-9, abs=1e-6)

    @pytest.mark.parametrize(
        "distance_target_m",
        [5.0, 25.0, 100.0, 500.0],
    )
    def test_mars_spherical_radius_distance_meridian(
        self, distance_target_m: float
    ) -> None:
        """Great-circle distance along meridian matches arc length on R=3,396,190 m."""
        dlat = meters_to_lat_deg(distance_target_m, MARS_RADIUS_M)
        p0 = [77.45, 18.0]
        p1 = [77.45, 18.0 + dlat]

        calc_dist = routes.distance_m(p0, p1, MARS_RADIUS_M)
        assert calc_dist == pytest.approx(distance_target_m, rel=1e-9, abs=1e-6)

    def test_mars_spherical_radius_oblique_distance(self) -> None:
        """Oblique distance near Jezero crater (18.44 deg N, 77.45 deg E)."""
        lat0_rad = math.radians(18.44)
        # 30 m east, 40 m north -> expected hypotenuse ~ 50 m on plane,
        # spherical distance on Mars radius R=3,396,190 m should match within mm.
        dlat = meters_to_lat_deg(40.0, MARS_RADIUS_M)
        dlon = math.degrees(30.0 / (MARS_RADIUS_M * math.cos(lat0_rad)))
        p0 = [77.45, 18.44]
        p1 = [77.45 + dlon, 18.44 + dlat]

        calc_dist = routes.distance_m(p0, p1, MARS_RADIUS_M)
        # Small curvature correction over 50 m on a 3396 km sphere is < 1e-4 m
        assert calc_dist == pytest.approx(50.0, abs=1e-3)

    def test_cumulative_m_on_mars_sphere(self) -> None:
        """Verify cumulative distance tracking across multi-vertex path."""
        p0 = [0.0, 0.0]
        p1 = [meters_to_lon_deg(25.0), 0.0]
        p2 = [meters_to_lon_deg(60.0), 0.0]
        p3 = [meters_to_lon_deg(100.0), 0.0]

        cumulative = profiles.cumulative_m([p0, p1, p2, p3], MARS_RADIUS_M)
        assert cumulative == pytest.approx([0.0, 25.0, 60.0, 100.0], abs=1e-6)

    @pytest.mark.parametrize("flat_elevation", [-2500.0, -100.0, 0.0, 500.0])
    @pytest.mark.parametrize("step_m", [2.0, 5.0, 10.0])
    def test_flat_route_zero_ascent_and_zero_grade(
        self, flat_elevation: float, step_m: float
    ) -> None:
        """Level route has zero ascent, zero descent, and zero grade at all steps."""
        route_length_m = 60.0
        dlon = meters_to_lon_deg(route_length_m)
        coords = [[0.0, 0.0], [dlon, 0.0]]

        # Raster with uniform elevation
        cols = 70
        rows = 10
        elevations = [[flat_elevation for _ in range(cols)] for _ in range(rows)]
        grid = make_controlled_grid(
            elevations,
            cell_size_m=1.0,
            origin_x_m=-5.0,
            origin_y_m=-5.0,
            radius_m=MARS_RADIUS_M,
        )

        samples = profiles.sample_path(coords, grid, step_m, MARS_RADIUS_M)
        distances = samples["distance_m"]
        sampled_elevs = samples["elevation_m"]

        # All sample points must report the exact flat elevation
        assert all(z == pytest.approx(flat_elevation) for z in sampled_elevs)

        # Core metric checks: zero ascent, zero descent, zero grade
        ascent = profiles.round_trip_ascent_m(distances, sampled_elevs)
        assert ascent == 0.0

        grade = profiles.max_grade_deg(distances, sampled_elevs)
        assert grade == 0.0

        # Full coverage on valid flat grid
        cov = profiles.coverage(coords, distances, sampled_elevs, MARS_RADIUS_M)
        assert cov["covered_pct"] == 100.0
        assert cov["covered_m"] == pytest.approx(route_length_m, abs=1e-6)
        assert cov["gap_m"] == 0.0
        assert cov["gaps"] == []

    def test_flat_route_multi_segment_turns(self) -> None:
        """Turning multi-segment path on level ground maintains 0 ascent and grade."""
        d_seg = 20.0
        # Segment 1: east 20 m; Segment 2: north 20 m; Segment 3: east 20 m (total 60 m)
        p0 = [0.0, 0.0]
        p1 = [meters_to_lon_deg(d_seg), 0.0]
        p2 = [meters_to_lon_deg(d_seg), meters_to_lat_deg(d_seg)]
        p3 = [meters_to_lon_deg(2 * d_seg), meters_to_lat_deg(d_seg)]
        coords = [p0, p1, p2, p3]

        flat_z = -2550.0
        elevations = [[flat_z for _ in range(50)] for _ in range(50)]
        grid = make_controlled_grid(
            elevations,
            cell_size_m=1.0,
            origin_x_m=-5.0,
            origin_y_m=-5.0,
            radius_m=MARS_RADIUS_M,
        )

        samples = profiles.sample_path(coords, grid, 5.0, MARS_RADIUS_M)
        assert samples["distance_m"][-1] == pytest.approx(3 * d_seg, abs=1e-4)
        assert (
            profiles.round_trip_ascent_m(samples["distance_m"], samples["elevation_m"])
            == 0.0
        )
        assert (
            profiles.max_grade_deg(samples["distance_m"], samples["elevation_m"]) == 0.0
        )


# ==============================================================================
# 2. Simple ramp: known ascent and slope calculation matching geometry
# ==============================================================================


class TestSimpleRampGeometry:
    """Verify known ascent and slope calculations matching analytical geometry."""

    @pytest.mark.parametrize(
        ("slope_ratio", "expected_grade_deg"),
        [
            (0.05, 2.862405),  # 5% grade
            (0.10, 5.710593),  # 10% grade
            (0.20, 11.309932),  # 20% grade (~11.31 deg)
            (0.50, 26.565051),  # 1:2 slope
            (1.00, 45.000000),  # 1:1 45 degree slope
        ],
    )
    def test_analytical_ramp_metrics(
        self, slope_ratio: float, expected_grade_deg: float
    ) -> None:
        """Sample points on analytical ramp z(d) = z0 + slope * d."""
        route_length_m = 50.0
        step_m = 5.0
        z0 = 100.0

        distances = profiles.sample_distances(route_length_m, step_m)
        elevations = [z0 + slope_ratio * d for d in distances]

        # Ascent on uniform positive ramp = total elevation gain
        expected_ascent = slope_ratio * route_length_m
        ascent = profiles.round_trip_ascent_m(distances, elevations)
        assert ascent == pytest.approx(expected_ascent, abs=1e-6)

        # Max grade should match exact mathematical arctan(slope)
        grade = profiles.max_grade_deg(distances, elevations)
        assert grade is not None
        assert grade == pytest.approx(expected_grade_deg, abs=1e-5)

    def test_ramp_grid_sample_path_bilinear_exact(self) -> None:
        """End-to-end test with synthetic raster grid matching linear ramp.

        Bilinear interpolation of a planar surface z = z0 + s*x is exact everywhere.
        """
        route_length_m = 40.0
        slope = 0.15  # 15% grade -> arctan(0.15) = 8.530765 deg
        expected_grade = math.degrees(math.atan(slope))
        expected_ascent = slope * route_length_m  # 6.0 m
        base_z = -2500.0

        dlon = meters_to_lon_deg(route_length_m)
        coords = [[0.0, 0.0], [dlon, 0.0]]

        cols = 50
        rows = 6
        # At cell center (row, col): x = -5.0 + col + 0.5.
        # Elevation is linear in x:
        elevations = [
            [base_z + slope * (-5.0 + col + 0.5) for col in range(cols)]
            for _ in range(rows)
        ]
        grid = make_controlled_grid(
            elevations,
            cell_size_m=1.0,
            origin_x_m=-5.0,
            origin_y_m=-3.0,
            radius_m=MARS_RADIUS_M,
        )

        for step_m in (2.0, 5.0, 10.0):
            samples = profiles.sample_path(coords, grid, step_m, MARS_RADIUS_M)
            ascent = profiles.round_trip_ascent_m(
                samples["distance_m"], samples["elevation_m"]
            )
            grade = profiles.max_grade_deg(
                samples["distance_m"], samples["elevation_m"]
            )

            assert ascent == pytest.approx(expected_ascent, abs=1e-4)
            assert grade is not None
            assert grade == pytest.approx(expected_grade, abs=1e-4)

    def test_piecewise_ramp_detects_max_slope(self) -> None:
        """Max grade captures the steepest section, while ascent sums all climbs."""
        # 20 m at slope 0.05 (rise = 1.0 m, grade = 2.86 deg)
        # followed by 30 m at slope 0.25 (rise = 7.5 m, grade = 14.04 deg)
        d_shallow = 20.0
        d_steep = 30.0
        total_d = d_shallow + d_steep
        step_m = 5.0

        distances = profiles.sample_distances(total_d, step_m)
        elevations = []
        for d in distances:
            if d <= d_shallow:
                elevations.append(100.0 + 0.05 * d)
            else:
                elevations.append(100.0 + 0.05 * d_shallow + 0.25 * (d - d_shallow))

        expected_ascent = 1.0 + 7.5  # 8.5 m
        expected_max_grade = math.degrees(math.atan(0.25))  # 14.03624 deg

        ascent = profiles.round_trip_ascent_m(distances, elevations)
        grade = profiles.max_grade_deg(distances, elevations)

        assert ascent == pytest.approx(expected_ascent, abs=1e-6)
        assert grade is not None
        assert grade == pytest.approx(expected_max_grade, abs=1e-5)


# ==============================================================================
# 3. Return leg: outbound descent becomes return climb, avoiding reversed logic
# ==============================================================================


class TestReturnLegRoundTripAscent:
    """Verify that on a round-trip route, outbound descent becomes return climb,

    preventing inverted/reversed ascent logic where downhill paths report 0 climb.
    """

    def test_pure_descent_outbound_becomes_return_climb(self) -> None:
        """Outbound route going entirely downhill into a depression.

        Naive outbound-only ascent: sum(max(0, dz)) == 0.0.
        True round-trip ascent: crew must climb out on return, so ascent == |drop|.
        """
        distances = [0.0, 5.0, 10.0, 15.0, 20.0]
        # Descend from 100 m to 80 m (drop of 20 m)
        elevations = [100.0, 95.0, 90.0, 85.0, 80.0]

        # Naive outbound ascent check
        naive_outbound_ascent = sum(
            max(0.0, z1 - z0) for z0, z1 in itertools.pairwise(elevations)
        )
        assert naive_outbound_ascent == 0.0

        # round_trip_ascent_m accounts for the return climb
        rt_ascent = profiles.round_trip_ascent_m(distances, elevations)
        assert rt_ascent == 20.0

        # Mirrored full round-trip profile check
        rt_dist, rt_elev = profiles.round_trip(distances, elevations)
        assert rt_dist[-1] == 40.0
        mirrored_positive_climb = sum(
            max(0.0, z1 - z0)  # type: ignore[operator]
            for z0, z1 in itertools.pairwise(rt_elev)
            if z0 is not None and z1 is not None
        )
        assert mirrored_positive_climb == 20.0
        assert rt_ascent == mirrored_positive_climb

    def test_symmetric_ridge_vs_valley_round_trip(self) -> None:
        """A ridge (climb then descend) and a valley (descend then climb)

        with identical magnitude have the exact same round-trip climbing total.
        """
        distances = [0.0, 5.0, 10.0, 15.0, 20.0]
        # Ridge: +10 m, +10 m, -10 m, -10 m
        ridge = [50.0, 60.0, 70.0, 60.0, 50.0]
        # Valley: -10 m, -10 m, +10 m, +10 m
        valley = [50.0, 40.0, 30.0, 40.0, 50.0]

        # Outbound alone differs drastically:
        # Ridge outbound climb = 20 m; Valley outbound climb = 20 m
        # But for asymmetric portions, round trip balances both out.
        assert profiles.round_trip_ascent_m(distances, ridge) == 40.0
        assert profiles.round_trip_ascent_m(distances, valley) == 40.0

    def test_asymmetric_rolling_hills_accounting(self) -> None:
        """Outbound climbs and descents cleanly invert on the return leg."""
        distances = [0.0, 5.0, 10.0, 15.0, 20.0, 25.0]
        # Changes: +8, -3, +12, -7, +2
        # Outbound climbs: 8 + 12 + 2 = 22 m
        # Outbound descents: 3 + 7 = 10 m
        # Return climbs: 7 + 3 = 10 m (the return reverses the outbound descents)
        # Total round-trip climb: 22 + 10 = 32 m
        elevations = [100.0, 108.0, 105.0, 117.0, 110.0, 112.0]

        ascent = profiles.round_trip_ascent_m(distances, elevations)
        assert ascent == pytest.approx(32.0)

        # Compare with mirrored round trip
        _, rt_elev = profiles.round_trip(distances, elevations)
        full_climb = sum(
            max(0.0, z1 - z0)  # type: ignore[operator]
            for z0, z1 in itertools.pairwise(rt_elev)
            if z0 is not None and z1 is not None
        )
        assert full_climb == pytest.approx(32.0)

    def test_round_trip_mirrored_profile_properties(self) -> None:
        """Verify geometry of round_trip: distances continue, elevations mirror."""
        out_dist = [0.0, 5.0, 10.0, 15.0]
        out_elev = [10.0, 14.0, 11.0, 18.0]

        rt_dist, rt_elev = profiles.round_trip(out_dist, out_elev)

        # 4 outbound points -> 7 round-trip points (turnaround point is not duplicated)
        assert len(rt_dist) == 7
        assert len(rt_elev) == 7
        assert rt_dist == [0.0, 5.0, 10.0, 15.0, 20.0, 25.0, 30.0]
        assert rt_dist[-1] == 2 * out_dist[-1]

        # Elevation is an exact palindrome
        assert rt_elev == [10.0, 14.0, 11.0, 18.0, 11.0, 14.0, 10.0]
        assert rt_elev == list(reversed(rt_elev))
        assert rt_elev[0] == rt_elev[-1]


# ==============================================================================
# 4. Partial elevation coverage / NoData: missing/NaN not treated as 0-deg terrain
# ==============================================================================


class TestPartialCoverageAndNoData:
    """Verify that NoData and NaN samples are NOT treated as level 0-degree terrain

    or false zero-elevation cliffs, but properly identified as missing/gap coverage.
    """

    def test_nodata_samples_do_not_produce_zero_grade_or_false_ascent(self) -> None:
        """Intervals touching None are skipped entirely from grade/ascent."""
        distances = [0.0, 5.0, 10.0, 15.0, 20.0]
        # Sample at 10.0 is missing (None)
        elevations = [100.0, 105.0, None, 110.0, 112.0]

        # Valid pairs are only (0,5): dz=+5 and (15,20): dz=+2
        pairs = list(profiles.valid_pairs(distances, elevations))
        assert len(pairs) == 2
        assert pairs[0] == (5.0, 5.0)
        assert pairs[1] == (5.0, 2.0)

        # Ascent should be |5| + |2| = 7.0 (NOT bridging 105 to None or None to 110)
        ascent = profiles.round_trip_ascent_m(distances, elevations)
        assert ascent == 7.0

        # Grade is max of atan(5/5)=45 deg and atan(2/5)=21.8 deg -> 45 deg
        grade = profiles.max_grade_deg(distances, elevations)
        assert grade == pytest.approx(45.0)

    def test_missing_data_is_not_treated_as_zero_elevation_cliff(self) -> None:
        """If None were replaced by 0.0 m (a common bug), it would fabricate

        massive spurious ascents (e.g. 100 -> 0 -> 100 would be 200 m climb).
        """
        distances = [0.0, 5.0, 10.0]
        elevations = [100.0, None, 100.0]

        # Valid pairs is empty because both intervals touch None
        assert list(profiles.valid_pairs(distances, elevations)) == []
        assert profiles.round_trip_ascent_m(distances, elevations) == 0.0
        assert profiles.max_grade_deg(distances, elevations) is None

    def test_missing_data_not_treated_as_zero_degree_flat_terrain(self) -> None:
        """If None were treated as level 0-degree terrain, coverage would be 100%.

        Coverage must explicitly mark intervals touching None as gaps.
        """
        coords = [
            [0.0, 0.0],
            [meters_to_lon_deg(20.0), 0.0],
        ]
        distances = [0.0, 5.0, 10.0, 15.0, 20.0]
        elevations = [50.0, 50.0, None, 50.0, 50.0]

        cov = profiles.coverage(coords, distances, elevations, MARS_RADIUS_M)
        # Intervals [5, 10] and [10, 15] touch None -> merged gap [5, 15] of length 10 m
        assert cov["gap_m"] == 10.0
        assert cov["covered_m"] == 10.0
        assert cov["covered_pct"] == 50.0
        assert len(cov["gaps"]) == 1
        gap = cov["gaps"][0]
        assert gap["from_m"] == 5.0
        assert gap["to_m"] == 15.0
        assert gap["length_m"] == 10.0

    def test_nan_in_grid_masked_out_via_bilinear(self) -> None:
        """Cells containing IEEE 754 NaN produce None in bilinear interpolation."""
        route_length_m = 30.0
        dlon = meters_to_lon_deg(route_length_m)
        coords = [[0.0, 0.0], [dlon, 0.0]]

        cols = 35
        rows = 6
        # Fill raster with valid data, except column 15 contains float('nan')
        elevations: list[list[float]] = [
            [float("nan") if col in (14, 15, 16) else -2500.0 for col in range(cols)]
            for _ in range(rows)
        ]
        grid = make_controlled_grid(
            elevations,
            cell_size_m=1.0,
            origin_x_m=-2.0,
            origin_y_m=-2.0,
            radius_m=MARS_RADIUS_M,
        )

        samples = profiles.sample_path(coords, grid, 5.0, MARS_RADIUS_M)
        sampled_elevs = samples["elevation_m"]
        assert any(z is None for z in sampled_elevs)

        cov = profiles.coverage(
            coords, samples["distance_m"], sampled_elevs, MARS_RADIUS_M
        )
        assert cov["gap_m"] > 0
        assert cov["covered_pct"] < 100.0
        assert len(cov["gaps"]) > 0

    def test_sentinel_nodata_masked_out_via_bilinear(self) -> None:
        """Cells with sentinel NoData (-9999.0 or USGS -3.4028e38) yield None."""
        elevations = [
            [-2500.0, USGS_NODATA],
            [-2500.0, -2500.0],
        ]
        grid = make_controlled_grid(
            elevations,
            cell_size_m=1.0,
            origin_x_m=0.0,
            origin_y_m=0.0,
            nodata=USGS_NODATA,
            radius_m=MARS_RADIUS_M,
        )

        # Sampling at (0.5, 1.5) touches cell (0, 0), (0, 1), (1, 0), (1, 1).
        # Since cell (0, 1) is NoData, bilinear interpolation must return None.
        assert grid.sample(0.5, 1.5) is None

    def test_multiple_disjoint_gaps_identified(self) -> None:
        """Multiple separate NoData gaps along a route form discrete gap segments."""
        coords = [
            [0.0, 0.0],
            [meters_to_lon_deg(50.0), 0.0],
        ]
        distances = [0.0, 5.0, 10.0, 15.0, 20.0, 25.0, 30.0, 35.0, 40.0, 45.0, 50.0]
        # Gap 1 at 10.0 (intervals [5,10] and [10,15] -> 10 m gap from 5 to 15)
        # Gap 2 at 35.0 (intervals [30,35] and [35,40] -> 10 m gap from 30 to 40)
        elevations = [
            10.0,
            10.0,
            None,
            10.0,
            10.0,
            10.0,
            10.0,
            None,
            10.0,
            10.0,
            10.0,
        ]

        cov = profiles.coverage(coords, distances, elevations, MARS_RADIUS_M)
        assert cov["gap_m"] == 20.0
        assert cov["covered_m"] == 30.0
        assert cov["covered_pct"] == 60.0
        assert len(cov["gaps"]) == 2

        gap1, gap2 = cov["gaps"]
        assert (gap1["from_m"], gap1["to_m"], gap1["length_m"]) == (5.0, 15.0, 10.0)
        assert (gap2["from_m"], gap2["to_m"], gap2["length_m"]) == (30.0, 40.0, 10.0)

    def test_entirely_nodata_route_metrics(self) -> None:
        """Route entirely over NoData reports 0% coverage and None max grade."""
        coords = [
            [0.0, 0.0],
            [meters_to_lon_deg(25.0), 0.0],
        ]
        distances = [0.0, 5.0, 10.0, 15.0, 20.0, 25.0]
        elevations = [None, None, None, None, None, None]

        assert profiles.round_trip_ascent_m(distances, elevations) == 0.0
        assert profiles.max_grade_deg(distances, elevations) is None

        cov = profiles.coverage(coords, distances, elevations, MARS_RADIUS_M)
        assert cov["covered_pct"] == 0.0
        assert cov["gap_m"] == 25.0
        assert cov["covered_m"] == 0.0
        assert len(cov["gaps"]) == 1
        assert (cov["gaps"][0]["from_m"], cov["gaps"][0]["to_m"]) == (0.0, 25.0)

    def test_single_valid_sample_cannot_form_grade(self) -> None:
        """Single valid sample surrounded by None has no valid pairs."""
        distances = [0.0, 5.0, 10.0]
        elevations = [None, 50.0, None]

        assert list(profiles.valid_pairs(distances, elevations)) == []
        assert profiles.max_grade_deg(distances, elevations) is None
        assert profiles.round_trip_ascent_m(distances, elevations) == 0.0
