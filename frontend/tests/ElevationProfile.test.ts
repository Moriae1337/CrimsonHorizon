import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  CANONICAL_START_ELEVATION_M,
  COLOR_ACCENT,
  COLOR_SECONDARY,
  COLOR_SURFACE,
  DEFAULT_HAWKSBILL_PROFILES,
  ElevationProfile,
  OPTION_A_PROFILE,
  OPTION_B_PROFILE,
  buildSvgPath,
  buildSvgPathSegments,
  formatDeltaElev,
  formatGradeDeg,
  formatMeters,
  isValidElevation,
  type RouteProfileData,
} from '../src/elevationProfile.ts'

describe('ElevationProfile Unit Tests', () => {
  describe('Canonical Hawksbill Gap Profile Metrics', () => {
    it('exports default Hawksbill profiles with Option A and Option B', () => {
      assert.equal(DEFAULT_HAWKSBILL_PROFILES.length, 2)
      assert.deepEqual(DEFAULT_HAWKSBILL_PROFILES, [OPTION_A_PROFILE, OPTION_B_PROFILE])
    })

    it('provides Option A full round trip covering 258.01 m', () => {
      assert.equal(OPTION_A_PROFILE.id, 'A')
      assert.equal(OPTION_A_PROFILE.metrics.round_trip_m, 258.01)
      assert.equal(OPTION_A_PROFILE.metrics.outbound_m, 129.0)
      assert.equal(OPTION_A_PROFILE.metrics.ascent_m, 13.34)
      assert.equal(OPTION_A_PROFILE.metrics.max_grade_deg['5'], 14.82)
      assert.equal(OPTION_A_PROFILE.metrics.max_grade_deg['2'], 20.69)
      assert.equal(OPTION_A_PROFILE.metrics.max_grade_deg['10'], 14.15)
      assert.equal(OPTION_A_PROFILE.metrics.proposed_m, 5.2)

      // Verify distance series covers full round trip from 0 to 258.01 m
      assert.equal(OPTION_A_PROFILE.distance_m[0], 0.0)
      assert.equal(OPTION_A_PROFILE.distance_m[OPTION_A_PROFILE.distance_m.length - 1], 258.01)
      assert.equal(OPTION_A_PROFILE.distance_m.length, 53)
      assert.equal(OPTION_A_PROFILE.elevation_m.length, 53)

      // Start elevation and round-trip return elevation agree
      assert.equal(OPTION_A_PROFILE.elevation_m[0], -2535.608)
      assert.equal(OPTION_A_PROFILE.elevation_m[OPTION_A_PROFILE.elevation_m.length - 1], -2535.608)

      // Symmetrical round trip: outbound leg mirrored by return leg
      const half = 26 // 0..26 is outbound (129.0 m), 26..52 is return
      assert.equal(OPTION_A_PROFILE.distance_m[half], 129.0)
      for (let i = 0; i <= half; i++) {
        assert.equal(
          OPTION_A_PROFILE.elevation_m[i],
          OPTION_A_PROFILE.elevation_m[OPTION_A_PROFILE.elevation_m.length - 1 - i],
          `Mismatch at index ${i}`,
        )
      }
    })

    it('provides Option B full round trip covering 345.28 m', () => {
      assert.equal(OPTION_B_PROFILE.id, 'B')
      assert.equal(OPTION_B_PROFILE.metrics.round_trip_m, 345.28)
      assert.equal(OPTION_B_PROFILE.metrics.outbound_m, 172.64)
      assert.equal(OPTION_B_PROFILE.metrics.ascent_m, 17.8)
      assert.equal(OPTION_B_PROFILE.metrics.max_grade_deg['5'], 14.93)
      assert.equal(OPTION_B_PROFILE.metrics.max_grade_deg['2'], 22.13)
      assert.equal(OPTION_B_PROFILE.metrics.max_grade_deg['10'], 13.95)
      assert.equal(OPTION_B_PROFILE.metrics.proposed_m, 0)

      // Verify distance series covers full round trip from 0 to 345.28 m
      assert.equal(OPTION_B_PROFILE.distance_m[0], 0.0)
      assert.equal(OPTION_B_PROFILE.distance_m[OPTION_B_PROFILE.distance_m.length - 1], 345.28)
      assert.equal(OPTION_B_PROFILE.distance_m.length, 71)
      assert.equal(OPTION_B_PROFILE.elevation_m.length, 71)

      // Start elevation and round-trip return elevation agree
      assert.equal(OPTION_B_PROFILE.elevation_m[0], -2535.608)
      assert.equal(OPTION_B_PROFILE.elevation_m[OPTION_B_PROFILE.elevation_m.length - 1], -2535.608)

      // Symmetrical round trip
      const half = 35 // 0..35 is outbound (172.64 m), 35..70 is return
      assert.equal(OPTION_B_PROFILE.distance_m[half], 172.64)
      for (let i = 0; i <= half; i++) {
        assert.equal(
          OPTION_B_PROFILE.elevation_m[i],
          OPTION_B_PROFILE.elevation_m[OPTION_B_PROFILE.elevation_m.length - 1 - i],
          `Mismatch at index ${i}`,
        )
      }
    })

    it('verifies 3-color palette line styles for Option A and Option B', () => {
      assert.equal(OPTION_A_PROFILE.color, COLOR_ACCENT)
      assert.equal(OPTION_A_PROFILE.lineStyle, 'solid')

      assert.equal(OPTION_B_PROFILE.color, COLOR_SECONDARY)
      assert.equal(OPTION_B_PROFILE.lineStyle, 'dashed')
      assert.ok(OPTION_B_PROFILE.dashArray)
    })
  })

  describe('Elevation Validity and Gap Detection', () => {
    it('classifies valid elevations and invalid gap sentinels', () => {
      assert.equal(isValidElevation(-2535.6), true)
      assert.equal(isValidElevation(0), true)
      assert.equal(isValidElevation(1234.5), true)

      assert.equal(isValidElevation(null), false)
      assert.equal(isValidElevation(undefined), false)
      assert.equal(isValidElevation(Number.NaN), false)
      assert.equal(isValidElevation(Number.POSITIVE_INFINITY), false)
      assert.equal(isValidElevation(-9999), false)
      assert.equal(isValidElevation(-3.4028226550889045e38), false)
    })

    it('builds a continuous SVG path segment for gapless data', () => {
      const points = [
        { x: 10, y: 50, valid: true },
        { x: 20, y: 40, valid: true },
        { x: 30, y: 30, valid: true },
      ]
      const segments = buildSvgPathSegments(points)
      assert.equal(segments.length, 1)
      assert.equal(segments[0], 'M 10.00 50.00 L 20.00 40.00 L 30.00 30.00')
      assert.equal(buildSvgPath(points), 'M 10.00 50.00 L 20.00 40.00 L 30.00 30.00')
    })

    it('interrupts SVG line across data gaps rather than interpolating across unknown terrain', () => {
      const pointsWithGap = [
        { x: 10, y: 50, valid: true },
        { x: 20, y: 45, valid: true },
        { x: 30, y: 0, valid: false }, // data gap
        { x: 40, y: 0, valid: false }, // data gap
        { x: 50, y: 25, valid: true },
        { x: 60, y: 20, valid: true },
      ]

      const segments = buildSvgPathSegments(pointsWithGap)
      assert.equal(segments.length, 2, 'Should produce exactly 2 disconnected segments')
      assert.equal(segments[0], 'M 10.00 50.00 L 20.00 45.00')
      assert.equal(segments[1], 'M 50.00 25.00 L 60.00 20.00')

      const fullPath = buildSvgPath(pointsWithGap)
      assert.equal(fullPath, 'M 10.00 50.00 L 20.00 45.00 M 50.00 25.00 L 60.00 20.00')
      // Confirm that no segment connects (20, 45) directly to (50, 25)
      assert.ok(!fullPath.includes('L 50.00 25.00'))
    })

    it('handles all-gap series and empty series gracefully', () => {
      assert.equal(buildSvgPath([]), '')
      assert.equal(
        buildSvgPath([
          { x: 10, y: 0, valid: false },
          { x: 20, y: 0, valid: false },
        ]),
        '',
      )
    })
  })

  describe('Metric Formatting Helpers', () => {
    it('formats meters with precision and metric unit', () => {
      assert.equal(formatMeters(258.01), '258.0 m')
      assert.equal(formatMeters(258.01, 2), '258.01 m')
      assert.equal(formatMeters(345.28, 0), '345 m')
    })

    it('formats grades with degree symbol', () => {
      assert.equal(formatGradeDeg(14.82), '14.82°')
      assert.equal(formatGradeDeg(20.69), '20.69°')
      assert.equal(formatGradeDeg(14.82, 1), '14.8°')
    })

    it('formats delta elevation with sign and unit', () => {
      assert.equal(formatDeltaElev(12.43), '+12.43 m')
      assert.equal(formatDeltaElev(-3.5), '-3.50 m')
      assert.equal(formatDeltaElev(0), '0.00 m')
    })
  })

  describe('ElevationProfile Component Rendering', () => {
    it('renders SVG chart with 3-color palette design tokens', () => {
      const html = renderToStaticMarkup(React.createElement(ElevationProfile))

      // SVG element with accessible attributes
      assert.ok(html.includes('<svg'), 'Should contain an SVG element')
      assert.ok(html.includes('role="img"'), 'SVG should have role="img"')
      assert.ok(html.includes('aria-label='), 'SVG should have accessible label')

      // Design system colors present
      assert.ok(html.includes(COLOR_ACCENT), 'Should use accent #d14d28')
      assert.ok(html.includes(COLOR_SECONDARY), 'Should use secondary #EBEBEB')
      assert.ok(html.includes(COLOR_SURFACE), 'Should use surface #212121')

      // Option line styles present
      assert.ok(html.includes('stroke="#d14d28"'), 'Option A should stroke with accent')
      assert.ok(html.includes('stroke="#EBEBEB"'), 'Option B should stroke with secondary')
      assert.ok(html.includes('stroke-dasharray="6 4"'), 'Option B should have dashed stroke')
    })

    it('renders both absolute elevation and delta elevation axes', () => {
      const html = renderToStaticMarkup(
        React.createElement(ElevationProfile, { elevationMode: 'both' }),
      )

      assert.ok(
        html.includes('Absolute Elevation (m)'),
        'Should display Absolute Elevation axis title',
      )
      assert.ok(
        html.includes('Rel. to Start Δ (m)'),
        'Should display Relative to Start Delta axis title',
      )

      // Start elevation reference
      assert.equal(CANONICAL_START_ELEVATION_M, -2535.608)
    })

    it('renders readable text summary with metric units (meters, degrees, ascent)', () => {
      const html = renderToStaticMarkup(React.createElement(ElevationProfile))

      // Round-trip distances with meters
      assert.ok(html.includes('258.0 m') || html.includes('258.01 m'))
      assert.ok(html.includes('345.3 m') || html.includes('345.28 m'))

      // Ascent with meters
      assert.ok(html.includes('13.34 m'), 'Should report Option A ascent 13.34 m')
      assert.ok(html.includes('17.80 m'), 'Should report Option B ascent 17.80 m')

      // Max grade in degrees
      assert.ok(html.includes('14.82°'), 'Should report Option A max grade 14.82°')
      assert.ok(html.includes('20.69°'), 'Should report Option A 2 m grade 20.69°')
      assert.ok(html.includes('14.93°'), 'Should report Option B max grade 14.93°')
      assert.ok(html.includes('22.13°'), 'Should report Option B 2 m grade 22.13°')

      // Turnaround points labeled
      assert.ok(html.includes('A Turn: 129m'))
      assert.ok(html.includes('B Turn: 173m'))

      // Proposed connector note
      assert.ok(html.includes('proposed connector'))
      assert.ok(html.includes('5.2 m'))
    })

    it('renders with data gaps interrupted in custom series', () => {
      const seriesWithGap: RouteProfileData[] = [
        {
          id: 'A',
          label: 'Option A (Gapped Test)',
          color: COLOR_ACCENT,
          lineStyle: 'solid',
          distance_m: [0, 50, 100, 150, 200],
          elevation_m: [-2535.6, -2530.0, null, -2524.0, -2535.6], // gap at 100 m
          metrics: {
            round_trip_m: 200,
            outbound_m: 100,
            ascent_m: 10,
            max_grade_deg: { '5': 12.0 },
          },
        },
      ]

      const html = renderToStaticMarkup(
        React.createElement(ElevationProfile, { series: seriesWithGap }),
      )

      assert.ok(html.includes('Data gaps interrupt line segments'))
      // Path string should have multiple M commands due to gap interruption
      const pathMatches = html.match(/d="M [^"]* M [^"]*"/g)
      assert.ok(
        pathMatches !== null && pathMatches.length > 0,
        'Path should contain disconnected M commands',
      )
    })

    it('allows changing elevation display mode', () => {
      const deltaHtml = renderToStaticMarkup(
        React.createElement(ElevationProfile, { elevationMode: 'delta' }),
      )
      assert.ok(deltaHtml.includes('Rel. to Start Δ (m)'))
      assert.ok(!deltaHtml.includes('Absolute Elevation (m)'))

      const absHtml = renderToStaticMarkup(
        React.createElement(ElevationProfile, { elevationMode: 'absolute' }),
      )
      assert.ok(absHtml.includes('Absolute Elevation (m)'))
      assert.ok(!absHtml.includes('Rel. to Start Δ (m)'))
    })

    it('respects selectedOptionId to highlight specific route', () => {
      const htmlOptionA = renderToStaticMarkup(
        React.createElement(ElevationProfile, { selectedOptionId: 'A' }),
      )
      assert.ok(htmlOptionA.includes('A Turn: 129m'))
      // B turnaround label hidden when only A is selected
      assert.ok(!htmlOptionA.includes('B Turn: 173m'))
    })
  })
})
