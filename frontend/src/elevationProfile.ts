import React, { useCallback, useId, useMemo, useState } from 'react'

/** Data point along an elevation profile. null or non-finite elevation indicates unknown terrain / data gap. */
export interface ElevationPoint {
  distance_m: number
  elevation_m: number | null
}

/** Route summary metrics with metric units. */
export interface OptionMetrics {
  round_trip_m: number
  outbound_m: number
  ascent_m: number
  max_grade_deg: {
    '2'?: number
    '5'?: number
    '10'?: number
    [step: string]: number | undefined
  }
  proposed_m?: number
  turnaround_stop?: string
}

/** Complete profile series for one route option. */
export interface RouteProfileData {
  id: string
  label: string
  color: string
  lineStyle: 'solid' | 'dashed' | 'dotted'
  dashArray?: string
  distance_m: number[]
  elevation_m: (number | null)[]
  metrics: OptionMetrics
}

export type ElevationDisplayMode = 'both' | 'delta' | 'absolute'

export interface ElevationProfileProps {
  /** Route series to plot. Defaults to Hawksbill Gap Option A and Option B. */
  series?: RouteProfileData[]
  /** Start elevation reference for delta calculation. Defaults to -2535.608 m. */
  startElevationM?: number
  /** Selected route option ID ('A', 'B', or null). */
  selectedOptionId?: string | null
  /** Callback fired when an option is selected/clicked in the legend. */
  onSelectOption?: (optionId: string | null) => void
  /** Elevation axis mode: dual axis ('both'), relative delta ('delta'), or absolute ('absolute'). */
  elevationMode?: ElevationDisplayMode
  /** Optional title override. */
  title?: string
  /** Optional container class name. */
  className?: string
  /** SVG viewBox width. Defaults to 760. */
  svgWidth?: number
  /** SVG viewBox height. Defaults to 320. */
  svgHeight?: number
}

// Design System 3-Color Tokens (specs/design-system.md & Issue #75 requirement)
export const COLOR_ACCENT = '#d14d28' // Martian Terracotta / Rust accent
export const COLOR_SECONDARY = '#EBEBEB' // High-contrast light foreground
export const COLOR_SURFACE = '#212121' // Main surface
export const COLOR_CANVAS = '#171717' // Deep background
export const COLOR_CARD = '#1A1A1A' // Sunken card
export const COLOR_BORDER = '#333333' // Subtle border
export const COLOR_GRID = '#2A2A2A' // Grid line
export const COLOR_MUTED = '#737373' // Muted text

export const CANONICAL_START_ELEVATION_M = -2535.608

// Canonical Hawksbill Gap Profile Data (from backend/data/hawksbill_gap/route_metrics.json)
export const OPTION_A_PROFILE: RouteProfileData = {
  id: 'A',
  label: 'Option A (Wildcat Ridge direct via connector)',
  color: COLOR_ACCENT,
  lineStyle: 'solid',
  metrics: {
    round_trip_m: 258.01,
    outbound_m: 129.0,
    ascent_m: 13.34,
    max_grade_deg: {
      '2': 20.69,
      '5': 14.82,
      '10': 14.15,
    },
    proposed_m: 5.2,
    turnaround_stop: 'Wildcat Ridge (26_1222)',
  },
  distance_m: [
    0.0, 4.96, 9.92, 14.89, 19.85, 24.81, 29.77, 34.73, 39.69, 44.66, 49.62, 54.58, 59.54, 64.5,
    69.46, 74.43, 79.39, 84.35, 89.31, 94.27, 99.23, 104.2, 109.16, 114.12, 119.08, 124.04, 129.0,
    133.97, 138.93, 143.89, 148.85, 153.81, 158.77, 163.74, 168.7, 173.66, 178.62, 183.58, 188.54,
    193.51, 198.47, 203.43, 208.39, 213.35, 218.31, 223.28, 228.24, 233.2, 238.16, 243.12, 248.08,
    253.05, 258.01,
  ],
  elevation_m: [
    -2535.608, -2534.69, -2534.538, -2533.641, -2532.749, -2531.507, -2530.247, -2529.821,
    -2529.539, -2528.758, -2527.445, -2526.59, -2526.355, -2525.857, -2525.202, -2524.88, -2524.579,
    -2524.456, -2524.243, -2524.142, -2523.706, -2523.339, -2523.187, -2522.724, -2522.792,
    -2522.841, -2523.176, -2522.841, -2522.792, -2522.724, -2523.187, -2523.339, -2523.706,
    -2524.142, -2524.243, -2524.456, -2524.579, -2524.88, -2525.202, -2525.857, -2526.355, -2526.59,
    -2527.445, -2528.758, -2529.539, -2529.821, -2530.247, -2531.507, -2532.749, -2533.641,
    -2534.538, -2534.69, -2535.608,
  ],
}

export const OPTION_B_PROFILE: RouteProfileData = {
  id: 'B',
  label: 'Option B (Skinner Ridge & Wildcat Ridge loop)',
  color: COLOR_SECONDARY,
  lineStyle: 'dashed',
  dashArray: '6 4',
  metrics: {
    round_trip_m: 345.28,
    outbound_m: 172.64,
    ascent_m: 17.8,
    max_grade_deg: {
      '2': 22.13,
      '5': 14.93,
      '10': 13.95,
    },
    proposed_m: 0,
    turnaround_stop: 'Wildcat Ridge (26_1222) via Skinner Ridge',
  },
  distance_m: [
    0.0, 4.93, 9.87, 14.8, 19.73, 24.66, 29.6, 34.53, 39.46, 44.39, 49.33, 54.26, 59.19, 64.12,
    69.06, 73.99, 78.92, 83.85, 88.79, 93.72, 98.65, 103.58, 108.52, 113.45, 118.38, 123.31, 128.25,
    133.18, 138.11, 143.04, 147.98, 152.91, 157.84, 162.77, 167.71, 172.64, 177.57, 182.5, 187.44,
    192.37, 197.3, 202.23, 207.17, 212.1, 217.03, 221.96, 226.9, 231.83, 236.76, 241.69, 246.63,
    251.56, 256.49, 261.42, 266.36, 271.29, 276.22, 281.15, 286.09, 291.02, 295.95, 300.88, 305.82,
    310.75, 315.68, 320.61, 325.55, 330.48, 335.41, 340.34, 345.28,
  ],
  elevation_m: [
    -2535.608, -2534.696, -2534.549, -2533.657, -2532.77, -2531.543, -2530.287, -2529.833,
    -2529.558, -2528.839, -2527.523, -2526.591, -2526.395, -2525.881, -2525.27, -2524.886, -2524.62,
    -2524.461, -2524.269, -2524.153, -2523.761, -2523.377, -2523.294, -2523.012, -2522.673,
    -2522.186, -2522.334, -2522.422, -2521.601, -2522.348, -2521.473, -2522.054, -2522.725,
    -2522.796, -2522.841, -2523.176, -2522.841, -2522.796, -2522.725, -2522.054, -2521.473,
    -2522.348, -2521.601, -2522.422, -2522.334, -2522.186, -2522.673, -2523.012, -2523.294,
    -2523.377, -2523.761, -2524.153, -2524.269, -2524.461, -2524.62, -2524.886, -2525.27, -2525.881,
    -2526.395, -2526.591, -2527.523, -2528.839, -2529.558, -2529.833, -2530.287, -2531.543,
    -2532.77, -2533.657, -2534.549, -2534.696, -2535.608,
  ],
}

export const DEFAULT_HAWKSBILL_PROFILES: RouteProfileData[] = [OPTION_A_PROFILE, OPTION_B_PROFILE]

/** Checks whether a sample has valid, finite elevation data (not null, NaN, or NoData sentinel). */
export function isValidElevation(elev: number | null | undefined): elev is number {
  return typeof elev === 'number' && Number.isFinite(elev) && elev > -9000
}

/**
 * Builds disconnected SVG path segments across data gaps.
 * Gaps (null/NaN/NoData) interrupt lines rather than interpolating across unknown terrain.
 */
export function buildSvgPathSegments(points: { x: number; y: number; valid: boolean }[]): string[] {
  const segments: string[] = []
  let current: string[] = []

  for (const pt of points) {
    if (pt.valid) {
      if (current.length === 0) {
        current.push(`M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`)
      } else {
        current.push(`L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`)
      }
    } else {
      if (current.length > 0) {
        segments.push(current.join(' '))
        current = []
      }
    }
  }

  if (current.length > 0) {
    segments.push(current.join(' '))
  }

  return segments
}

/** Joins path segments into a single SVG path string with gap interruptions. */
export function buildSvgPath(points: { x: number; y: number; valid: boolean }[]): string {
  return buildSvgPathSegments(points).join(' ')
}

/** Formats distances with metric units (m). */
export function formatMeters(meters: number, precision = 1): string {
  return `${meters.toFixed(precision)} m`
}

/** Formats grades with metric degrees (°). */
export function formatGradeDeg(degrees: number, precision = 2): string {
  return `${degrees.toFixed(precision)}°`
}

/** Formats relative elevation delta with sign and metric units (+/- m). */
export function formatDeltaElev(deltaM: number, precision = 2): string {
  const sign = deltaM > 0 ? '+' : ''
  return `${sign}${deltaM.toFixed(precision)} m`
}

export function ElevationProfile({
  series = DEFAULT_HAWKSBILL_PROFILES,
  startElevationM = CANONICAL_START_ELEVATION_M,
  selectedOptionId = null,
  onSelectOption,
  elevationMode: initialElevationMode = 'both',
  title = 'Round-Trip Elevation Profiles — Hawksbill Gap Traverse',
  className = '',
  svgWidth = 760,
  svgHeight = 320,
}: ElevationProfileProps) {
  const [elevationMode, setElevationMode] = useState<ElevationDisplayMode>(initialElevationMode)
  const [hoverDistance, setHoverDistance] = useState<number | null>(null)
  const patternId = useId()

  // Layout margins inside the SVG viewBox
  const margin = {
    top: 32,
    right: 56,
    bottom: 46,
    left: 64,
  }

  const plotWidth = Math.max(100, svgWidth - margin.left - margin.right)
  const plotHeight = Math.max(100, svgHeight - margin.top - margin.bottom)

  // Determine domain bounds across all series
  const { maxDistance, minElevation, maxElevation, hasGaps } = useMemo(() => {
    let maxDist = 0
    let minEl = Infinity
    let maxEl = -Infinity
    let gapsFound = false

    for (const s of series) {
      for (let i = 0; i < s.distance_m.length; i++) {
        const d = s.distance_m[i]
        const e = s.elevation_m[i]
        if (d > maxDist) maxDist = d
        if (isValidElevation(e)) {
          if (e < minEl) minEl = e
          if (e > maxEl) maxEl = e
        } else {
          gapsFound = true
        }
      }
    }

    if (!Number.isFinite(minEl)) minEl = startElevationM - 5
    if (!Number.isFinite(maxEl)) maxEl = startElevationM + 20

    // Provide clean round intervals for axes
    const roundedMinEl = Math.floor((minEl - 0.5) / 2) * 2
    const roundedMaxEl = Math.ceil((maxEl + 1.0) / 2) * 2
    const roundedMaxDist = Math.ceil(maxDist / 50) * 50

    return {
      maxDistance: Math.max(50, roundedMaxDist),
      minElevation: roundedMinEl,
      maxElevation: roundedMaxEl,
      hasGaps: gapsFound,
    }
  }, [series, startElevationM])

  // Coordinate scales
  const scaleX = useCallback(
    (distanceM: number) => {
      return margin.left + (distanceM / maxDistance) * plotWidth
    },
    [margin.left, maxDistance, plotWidth],
  )

  const scaleY = useCallback(
    (elevM: number) => {
      const range = maxElevation - minElevation
      if (range <= 0) return margin.top + plotHeight / 2
      const norm = (elevM - minElevation) / range
      return margin.top + (1 - norm) * plotHeight
    },
    [margin.top, maxElevation, minElevation, plotHeight],
  )

  // Ticks for Distance (X-axis)
  const xTicks = useMemo(() => {
    const step = maxDistance <= 200 ? 25 : 50
    const count = Math.floor(maxDistance / step)
    return Array.from({ length: count + 1 }, (_, i) => i * step)
  }, [maxDistance])

  // Ticks for Elevation (Y-axis)
  const yTicks = useMemo(() => {
    const step = 4
    const count = Math.ceil((maxElevation - minElevation) / step)
    return Array.from({ length: count + 1 }, (_, i) => minElevation + i * step).filter(
      (v) => v <= maxElevation + 0.1,
    )
  }, [minElevation, maxElevation])

  // Prepared series data with projected SVG coordinates and gap metadata
  const preparedSeries = useMemo(() => {
    return series.map((s) => {
      const points = s.distance_m.map((d, i) => {
        const elev = s.elevation_m[i]
        const valid = isValidElevation(elev)
        return {
          d,
          elev,
          valid,
          x: scaleX(d),
          y: valid ? scaleY(elev) : scaleY(minElevation),
        }
      })

      const pathString = buildSvgPath(points)
      const validElevations = s.elevation_m.filter(isValidElevation)
      const minRouteElev =
        validElevations.length > 0 ? Math.min(...validElevations) : startElevationM
      const maxRouteElev =
        validElevations.length > 0 ? Math.max(...validElevations) : startElevationM
      const maxDeltaM = maxRouteElev - startElevationM

      return {
        ...s,
        points,
        pathString,
        minRouteElev,
        maxRouteElev,
        maxDeltaM,
      }
    })
  }, [series, scaleX, scaleY, minElevation, startElevationM])

  // Find nearest samples for hover tooltip
  const hoverData = useMemo(() => {
    if (hoverDistance === null) return null
    return preparedSeries.map((s) => {
      let closestIdx = 0
      let smallestDiff = Infinity
      for (let i = 0; i < s.distance_m.length; i++) {
        const diff = Math.abs(s.distance_m[i] - hoverDistance)
        if (diff < smallestDiff) {
          smallestDiff = diff
          closestIdx = i
        }
      }
      const elev = s.elevation_m[closestIdx]
      const valid = isValidElevation(elev)
      const delta = valid ? elev - startElevationM : null
      return {
        id: s.id,
        label: s.label,
        color: s.color,
        distance: s.distance_m[closestIdx],
        elevation: elev,
        delta,
        valid,
        x: scaleX(s.distance_m[closestIdx]),
        y: valid ? scaleY(elev) : null,
      }
    })
  }, [hoverDistance, preparedSeries, startElevationM, scaleX, scaleY])

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * svgWidth
    if (svgX < margin.left || svgX > margin.left + plotWidth) {
      setHoverDistance(null)
      return
    }
    const dist = ((svgX - margin.left) / plotWidth) * maxDistance
    setHoverDistance(Math.max(0, Math.min(dist, maxDistance)))
  }

  return React.createElement(
    'section',
    {
      className: `rounded-xl border border-[#333333] bg-[#212121] p-4 text-[#EBEBEB] shadow-md ${className}`,
      'aria-label': 'Elevation profile analysis',
    },
    // Header
    React.createElement(
      'header',
      {
        className:
          'flex flex-wrap items-center justify-between gap-3 border-b border-[#333333] pb-3',
      },
      React.createElement(
        'div',
        null,
        React.createElement(
          'div',
          { className: 'flex items-center gap-2' },
          React.createElement('span', {
            className: 'inline-block h-2 w-2 rounded-full bg-[#d14d28]',
            'aria-hidden': 'true',
          }),
          React.createElement(
            'h2',
            { className: 'text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]' },
            '05 — Elevation Profiles',
          ),
        ),
        React.createElement(
          'h3',
          { className: 'mt-0.5 text-sm font-semibold text-[#EBEBEB]' },
          title,
        ),
      ),
      // Mode Toggle
      React.createElement(
        'div',
        {
          className:
            'flex items-center gap-1 rounded-lg border border-[#333333] bg-[#1A1A1A] p-0.5 text-xs',
        },
        React.createElement(
          'span',
          { className: 'px-2 py-1 text-[11px] font-medium text-[#737373]' },
          'Axis:',
        ),
        (['both', 'delta', 'absolute'] as const).map((mode) => {
          const isActive = elevationMode === mode
          const labelMap = {
            both: 'Dual (Abs + Δ)',
            delta: 'Relative Δ (m)',
            absolute: 'Absolute (m)',
          }
          return React.createElement(
            'button',
            {
              key: mode,
              type: 'button',
              onClick: () => setElevationMode(mode),
              className: `rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#d14d28] text-[#EBEBEB] shadow-sm'
                  : 'text-[#A3A3A3] hover:text-[#EBEBEB]'
              }`,
            },
            labelMap[mode],
          )
        }),
      ),
    ),
    // SVG Chart Plot
    React.createElement(
      'div',
      {
        className:
          'relative mt-3 w-full overflow-hidden rounded-lg border border-[#333333] bg-[#171717]',
      },
      React.createElement(
        'svg',
        {
          viewBox: `0 0 ${svgWidth} ${svgHeight}`,
          className: 'w-full h-auto select-none font-sans',
          role: 'img',
          'aria-label': 'Round-trip elevation profile comparing Option A and Option B',
          onPointerMove: handlePointerMove,
          onPointerLeave: () => setHoverDistance(null),
        },
        React.createElement(
          'defs',
          null,
          React.createElement(
            'pattern',
            {
              id: `gap-stripes-${patternId}`,
              width: '8',
              height: '8',
              patternUnits: 'userSpaceOnUse',
              patternTransform: 'rotate(45)',
            },
            React.createElement('line', {
              x1: '0',
              y1: '0',
              x2: '0',
              y2: '8',
              stroke: '#333333',
              strokeWidth: '2',
            }),
          ),
        ),
        // Plot Background
        React.createElement('rect', {
          x: margin.left,
          y: margin.top,
          width: plotWidth,
          height: plotHeight,
          fill: '#171717',
          stroke: '#333333',
          strokeWidth: '1',
        }),
        // Y grid lines and labels
        yTicks.map((tickVal) => {
          const y = scaleY(tickVal)
          const deltaVal = tickVal - startElevationM
          return React.createElement(
            'g',
            { key: `y-${tickVal}` },
            React.createElement('line', {
              x1: margin.left,
              y1: y,
              x2: margin.left + plotWidth,
              y2: y,
              stroke: COLOR_GRID,
              strokeWidth: '1',
              strokeDasharray: '2 3',
            }),
            elevationMode !== 'delta' &&
              React.createElement(
                'text',
                {
                  x: margin.left - 8,
                  y: y + 3.5,
                  textAnchor: 'end',
                  fill: COLOR_MUTED,
                  fontSize: '10',
                  fontFamily: 'monospace',
                },
                `${tickVal.toFixed(0)} m`,
              ),
            elevationMode !== 'absolute' &&
              React.createElement(
                'text',
                {
                  x: margin.left + plotWidth + 8,
                  y: y + 3.5,
                  textAnchor: 'start',
                  fill: COLOR_MUTED,
                  fontSize: '10',
                  fontFamily: 'monospace',
                },
                `${deltaVal >= 0 ? `+${deltaVal.toFixed(0)}` : deltaVal.toFixed(0)} m`,
              ),
          )
        }),
        // X grid lines and labels
        xTicks.map((distVal) => {
          const x = scaleX(distVal)
          return React.createElement(
            'g',
            { key: `x-${distVal}` },
            React.createElement('line', {
              x1: x,
              y1: margin.top,
              x2: x,
              y2: margin.top + plotHeight,
              stroke: COLOR_GRID,
              strokeWidth: '1',
              strokeDasharray: '2 3',
            }),
            React.createElement(
              'text',
              {
                x,
                y: margin.top + plotHeight + 16,
                textAnchor: 'middle',
                fill: COLOR_MUTED,
                fontSize: '10',
                fontFamily: 'monospace',
              },
              `${distVal} m`,
            ),
          )
        }),
        // Axis titles
        React.createElement(
          'text',
          {
            x: margin.left + plotWidth / 2,
            y: margin.top + plotHeight + 36,
            textAnchor: 'middle',
            fill: COLOR_SECONDARY,
            fontSize: '11',
            fontWeight: '600',
          },
          'Round-Trip Distance (meters)',
        ),
        elevationMode !== 'delta' &&
          React.createElement(
            'text',
            {
              transform: `rotate(-90) translate(-${margin.top + plotHeight / 2}, 16)`,
              textAnchor: 'middle',
              fill: COLOR_SECONDARY,
              fontSize: '10',
              fontWeight: '600',
            },
            'Absolute Elevation (m)',
          ),
        elevationMode !== 'absolute' &&
          React.createElement(
            'text',
            {
              transform: `rotate(90) translate(${margin.top + plotHeight / 2}, -${svgWidth - 14})`,
              textAnchor: 'middle',
              fill: COLOR_SECONDARY,
              fontSize: '10',
              fontWeight: '600',
            },
            'Rel. to Start Δ (m)',
          ),
        // Turnaround markers
        preparedSeries.map((s) => {
          const outboundD = s.metrics.outbound_m
          const turnaroundX = scaleX(outboundD)
          const isSelected = selectedOptionId === null || selectedOptionId === s.id
          if (!isSelected) return null

          return React.createElement(
            'g',
            { key: `turnaround-${s.id}` },
            React.createElement('line', {
              x1: turnaroundX,
              y1: margin.top,
              x2: turnaroundX,
              y2: margin.top + plotHeight,
              stroke: s.color,
              strokeWidth: '1.2',
              strokeDasharray: '3 3',
              opacity: 0.7,
            }),
            React.createElement('rect', {
              x: turnaroundX - 32,
              y: margin.top + 6,
              width: 64,
              height: 16,
              rx: 3,
              fill: COLOR_SURFACE,
              stroke: s.color,
              strokeWidth: 1,
              opacity: 0.9,
            }),
            React.createElement(
              'text',
              {
                x: turnaroundX,
                y: margin.top + 17,
                textAnchor: 'middle',
                fill: s.color,
                fontSize: '9',
                fontWeight: 'bold',
              },
              `${s.id} Turn: ${outboundD.toFixed(0)}m`,
            ),
          )
        }),
        // Plot lines
        preparedSeries.map((s) => {
          const isSelected = selectedOptionId === null || selectedOptionId === s.id
          const opacity = isSelected ? 1 : 0.25
          const strokeWidth = isSelected ? 2.5 : 1.5

          return React.createElement(
            'g',
            { key: `series-${s.id}`, opacity, className: 'transition-opacity duration-200' },
            React.createElement('path', {
              d: s.pathString,
              fill: 'none',
              stroke: '#101010',
              strokeWidth: strokeWidth + 2,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }),
            React.createElement('path', {
              d: s.pathString,
              fill: 'none',
              stroke: s.color,
              strokeWidth,
              strokeDasharray: s.lineStyle === 'dashed' ? (s.dashArray ?? '6 4') : undefined,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }),
            // Endpoint and turnaround markers
            s.points.map((pt, i) => {
              const isTurnaround = Math.abs(pt.d - s.metrics.outbound_m) < 0.1
              const isEndpoint = i === s.points.length - 1 || i === 0
              if (!pt.valid || (!isTurnaround && !isEndpoint)) return null

              return React.createElement('circle', {
                key: `pt-${s.id}-${i}`,
                cx: pt.x,
                cy: pt.y,
                r: isTurnaround ? 4.5 : 3.5,
                fill: s.color,
                stroke: COLOR_SURFACE,
                strokeWidth: 1.5,
              })
            }),
          )
        }),
        // Hover inspection crosshair
        hoverDistance !== null &&
          React.createElement(
            'g',
            { pointerEvents: 'none' },
            React.createElement('line', {
              x1: scaleX(hoverDistance),
              y1: margin.top,
              x2: scaleX(hoverDistance),
              y2: margin.top + plotHeight,
              stroke: COLOR_SECONDARY,
              strokeWidth: '1',
              strokeDasharray: '2 2',
              opacity: 0.8,
            }),
            hoverData?.map((item) => {
              if (!item.valid || item.y === null) return null
              return React.createElement('circle', {
                key: `hover-dot-${item.id}`,
                cx: item.x,
                cy: item.y,
                r: 5,
                fill: item.color,
                stroke: '#171717',
                strokeWidth: 2,
              })
            }),
            (() => {
              const cardWidth = 160
              const cardHeight = 68
              const xPos =
                scaleX(hoverDistance) + cardWidth + 10 > svgWidth - margin.right
                  ? scaleX(hoverDistance) - cardWidth - 10
                  : scaleX(hoverDistance) + 10

              return React.createElement(
                'g',
                { transform: `translate(${xPos}, ${margin.top + 10})` },
                React.createElement('rect', {
                  width: cardWidth,
                  height: cardHeight,
                  rx: 6,
                  fill: '#212121',
                  stroke: '#333333',
                  strokeWidth: 1,
                  filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))',
                }),
                React.createElement(
                  'text',
                  { x: 8, y: 16, fill: COLOR_MUTED, fontSize: '10', fontFamily: 'monospace' },
                  `Station: ${hoverDistance.toFixed(1)} m`,
                ),
                hoverData?.map((item, idx) =>
                  React.createElement(
                    'g',
                    { key: `tt-${item.id}`, transform: `translate(8, ${32 + idx * 16})` },
                    React.createElement('circle', { cx: 4, cy: -3.5, r: 3.5, fill: item.color }),
                    React.createElement(
                      'text',
                      {
                        x: 12,
                        y: 0,
                        fill: COLOR_SECONDARY,
                        fontSize: '10',
                        fontFamily: 'monospace',
                      },
                      `${item.id}: ${item.valid ? `${item.elevation?.toFixed(1)} m` : 'NoData'} `,
                      item.delta !== null &&
                        React.createElement(
                          'tspan',
                          { fill: '#A3A3A3' },
                          `(${item.delta >= 0 ? `+${item.delta.toFixed(1)}` : item.delta.toFixed(1)})`,
                        ),
                    ),
                  ),
                ),
              )
            })(),
          ),
      ),
    ),
    // Interactive Legend
    React.createElement(
      'nav',
      {
        'aria-label': 'Route options legend',
        className:
          'mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#333333] pt-3 text-xs',
      },
      React.createElement(
        'div',
        { className: 'flex flex-wrap items-center gap-2' },
        React.createElement(
          'span',
          { className: 'text-[11px] font-medium text-[#737373]' },
          'Filter Option:',
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => onSelectOption?.(null),
            className: `cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium transition ${
              selectedOptionId === null
                ? 'border-[#d14d28] bg-[#d14d28]/20 text-[#EBEBEB]'
                : 'border-[#333333] bg-[#1A1A1A] text-[#A3A3A3] hover:border-[#4A4A4A]'
            }`,
          },
          'Show Both',
        ),
        preparedSeries.map((s) => {
          const isSelected = selectedOptionId === s.id
          return React.createElement(
            'button',
            {
              key: s.id,
              type: 'button',
              onClick: () => onSelectOption?.(isSelected ? null : s.id),
              className: `flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                isSelected
                  ? 'border-[#d14d28] bg-[#d14d28]/25 text-[#EBEBEB]'
                  : 'border-[#333333] bg-[#1A1A1A] text-[#A3A3A3] hover:border-[#4A4A4A]'
              }`,
            },
            React.createElement(
              'svg',
              { width: 24, height: 10, 'aria-hidden': 'true', className: 'shrink-0' },
              React.createElement('line', {
                x1: 1,
                y1: 5,
                x2: 23,
                y2: 5,
                stroke: s.color,
                strokeWidth: 2.5,
                strokeDasharray: s.lineStyle === 'dashed' ? (s.dashArray ?? '5 3') : undefined,
                strokeLinecap: 'round',
              }),
            ),
            React.createElement('span', null, s.label),
          )
        }),
      ),
      hasGaps &&
        React.createElement(
          'div',
          {
            className:
              'flex items-center gap-1.5 rounded border border-amber-900/50 bg-amber-950/20 px-2 py-0.5 text-[11px] text-amber-200',
          },
          React.createElement('span', {
            className: 'inline-block h-1.5 w-1.5 rounded-full bg-amber-400',
          }),
          React.createElement(
            'span',
            null,
            'Data gaps interrupt line segments (no interpolation across unknown terrain)',
          ),
        ),
    ),
    // Readable Summary Section with Metric Units
    React.createElement(
      'div',
      { className: 'mt-4 space-y-3' },
      React.createElement(
        'h4',
        { className: 'text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]' },
        'Traverse Metrics & Grade Comparison (Metric Units)',
      ),
      // Side-by-side Metric Cards
      React.createElement(
        'div',
        { className: 'grid grid-cols-1 gap-3 sm:grid-cols-2' },
        preparedSeries.map((s) => {
          const isOptionA = s.id === 'A'
          return React.createElement(
            'div',
            {
              key: `summary-${s.id}`,
              className: `rounded-lg border p-3.5 transition-colors ${
                isOptionA ? 'border-[#d14d28]/40 bg-[#1A1A1A]' : 'border-[#333333] bg-[#1A1A1A]'
              }`,
            },
            React.createElement(
              'div',
              { className: 'flex items-center justify-between border-b border-[#282828] pb-2' },
              React.createElement(
                'div',
                { className: 'flex items-center gap-2' },
                React.createElement('span', {
                  className: 'inline-block h-3 w-3 rounded-full',
                  style: { backgroundColor: s.color },
                  'aria-hidden': 'true',
                }),
                React.createElement(
                  'span',
                  { className: 'font-semibold text-sm text-[#EBEBEB]' },
                  s.label,
                ),
              ),
              React.createElement(
                'span',
                {
                  className:
                    'rounded bg-[#282828] px-1.5 py-0.5 font-mono text-[11px] text-[#A3A3A3]',
                },
                s.lineStyle === 'solid' ? 'Solid Line' : 'Dashed Line',
              ),
            ),
            React.createElement(
              'dl',
              { className: 'mt-2.5 grid grid-cols-2 gap-2 text-xs' },
              React.createElement(
                'div',
                null,
                React.createElement(
                  'dt',
                  { className: 'text-[11px] text-[#737373]' },
                  'Round-Trip Distance',
                ),
                React.createElement(
                  'dd',
                  { className: 'font-mono font-bold text-sm text-[#EBEBEB]' },
                  formatMeters(s.metrics.round_trip_m),
                ),
                React.createElement(
                  'span',
                  { className: 'text-[10px] text-[#A3A3A3]' },
                  `Outbound: ${formatMeters(s.metrics.outbound_m)}`,
                ),
              ),
              React.createElement(
                'div',
                null,
                React.createElement(
                  'dt',
                  { className: 'text-[11px] text-[#737373]' },
                  'Round-Trip Ascent',
                ),
                React.createElement(
                  'dd',
                  { className: 'font-mono font-bold text-sm text-[#d14d28]' },
                  formatMeters(s.metrics.ascent_m, 2),
                ),
                React.createElement(
                  'span',
                  { className: 'text-[10px] text-[#A3A3A3]' },
                  `Climb: ${formatDeltaElev(s.maxDeltaM, 2)} max Δ`,
                ),
              ),
              React.createElement(
                'div',
                null,
                React.createElement(
                  'dt',
                  { className: 'text-[11px] text-[#737373]' },
                  'Max Grade (5 m step)',
                ),
                React.createElement(
                  'dd',
                  { className: 'font-mono font-bold text-sm text-[#EBEBEB]' },
                  s.metrics.max_grade_deg['5'] !== undefined
                    ? formatGradeDeg(s.metrics.max_grade_deg['5'])
                    : 'N/A',
                ),
                React.createElement(
                  'span',
                  { className: 'text-[10px] text-[#A3A3A3]' },
                  `2 m window: ${
                    s.metrics.max_grade_deg['2'] !== undefined
                      ? formatGradeDeg(s.metrics.max_grade_deg['2'])
                      : 'N/A'
                  }`,
                ),
              ),
              React.createElement(
                'div',
                null,
                React.createElement(
                  'dt',
                  { className: 'text-[11px] text-[#737373]' },
                  'Elevation Span',
                ),
                React.createElement(
                  'dd',
                  { className: 'font-mono text-xs text-[#EBEBEB]' },
                  `${s.minRouteElev.toFixed(1)} to ${s.maxRouteElev.toFixed(1)} m`,
                ),
                React.createElement(
                  'span',
                  { className: 'text-[10px] text-[#A3A3A3]' },
                  `Rel: ${formatDeltaElev(0, 1)} to ${formatDeltaElev(s.maxDeltaM, 1)}`,
                ),
              ),
            ),
            s.metrics.proposed_m !== undefined &&
              s.metrics.proposed_m > 0 &&
              React.createElement(
                'div',
                { className: 'mt-2.5 rounded bg-[#252525] px-2 py-1 text-[11px] text-[#A3A3A3]' },
                'Includes ',
                React.createElement(
                  'span',
                  { className: 'font-semibold text-[#EBEBEB]' },
                  formatMeters(s.metrics.proposed_m),
                ),
                ' proposed connector each way (straight 5.2 m between sol 461 and 501).',
              ),
          )
        }),
      ),
      // Prose Callout
      React.createElement(
        'p',
        {
          className:
            'rounded-lg border border-[#333333] bg-[#171717] p-3 text-xs leading-relaxed text-[#A3A3A3]',
        },
        React.createElement(
          'strong',
          { className: 'text-[#EBEBEB]' },
          'Field Trade-Off Assessment: ',
        ),
        'Option A covers a full round trip of ',
        React.createElement('span', { className: 'font-mono text-[#EBEBEB]' }, '258.01 m'),
        ' with ',
        React.createElement('span', { className: 'font-mono text-[#EBEBEB]' }, '13.34 m'),
        ' round-trip ascent and a maximum grade of ',
        React.createElement('span', { className: 'font-mono text-[#EBEBEB]' }, '14.82°'),
        ' (5 m nominal window). Option B covers a full round trip of ',
        React.createElement('span', { className: 'font-mono text-[#EBEBEB]' }, '345.28 m'),
        ' with ',
        React.createElement('span', { className: 'font-mono text-[#EBEBEB]' }, '17.80 m'),
        ' round-trip ascent and a maximum grade of ',
        React.createElement('span', { className: 'font-mono text-[#EBEBEB]' }, '14.93°'),
        '. Choosing Option B adds ',
        React.createElement(
          'span',
          { className: 'font-semibold text-[#d14d28]' },
          '+87.27 m (+33.8%)',
        ),
        ' walking distance and ',
        React.createElement(
          'span',
          { className: 'font-semibold text-[#d14d28]' },
          '+4.46 m (+33.4%)',
        ),
        ' ascent to bring the crew within direct inspection range of the Skinner Ridge sandstone contact.',
      ),
    ),
  )
}

export default ElevationProfile
