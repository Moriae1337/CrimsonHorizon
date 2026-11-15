import { useEffect, useMemo, useState } from 'react'
import { columbiaHillsWaypoints } from './columbiaHills.ts'
import {
  SITE_IDS,
  aeqdInverse,
  decodeTerrain,
  fetchRoutePlan,
  fetchTerrainPackage,
  clipTraverse,
  fetchTraverse,
  insertStop,
  roverWaypoints,
  type RoverTraverse,
  type PlannedRoute,
  type RouteId,
  type RoutePlan,
  type SiteId,
  type TerrainGrid,
  type TerrainPackage,
} from './sites.ts'

const API_URL = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')

export type PickTarget = 'start' | 'end' | 'stop' | null
export const MAX_STOPS = 8

interface Draft {
  waypoints: [number, number][]
  hasEnd: boolean
  pickTarget: PickTarget
}

interface PlanResult {
  key: string
  plan: RoutePlan | null
  error: string | null
}

const EMPTY_DRAFT: Draft = { waypoints: [], hasEnd: false, pickTarget: 'start' }

function planKey(siteId: SiteId, draft: Draft, maxGrade: number): string | null {
  if (!draft.hasEnd || draft.waypoints.length < 2) return null
  return `${siteId}|${maxGrade}|${draft.waypoints.map((p) => p.join(',')).join(';')}`
}

/**
 * Route-planner state shared by the 2D map and the 3D site view, so both always
 * show the same site, waypoints and planned routes. Each site keeps its own draft.
 */
export function useRoutePlanner(active: boolean) {
  const [siteId, setSiteId] = useState<SiteId>('jezero-crater')
  const [drafts, setDrafts] = useState<Record<SiteId, Draft>>(
    () => Object.fromEntries(SITE_IDS.map((id) => [id, EMPTY_DRAFT])) as Record<SiteId, Draft>,
  )
  const [packages, setPackages] = useState<Partial<Record<SiteId, TerrainPackage>>>({})
  const [loadErrors, setLoadErrors] = useState<Partial<Record<SiteId, string>>>({})
  const [traverses, setTraverses] = useState<Partial<Record<SiteId, RoverTraverse>>>({})
  const [maxGrade, setMaxGrade] = useState(25)
  const [result, setResult] = useState<PlanResult | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState<RouteId>('lower_risk')

  const draft = drafts[siteId]
  const pkg = packages[siteId] ?? null
  const grid = useMemo<TerrainGrid | null>(() => (pkg ? decodeTerrain(pkg) : null), [pkg])
  const exampleWaypoints = useMemo(
    () => (pkg && grid ? columbiaHillsWaypoints(pkg, grid) : null),
    [pkg, grid],
  )

  // Terrain package (cached per site).
  useEffect(() => {
    if (!API_URL || !active || packages[siteId]) return
    const controller = new AbortController()
    fetchTerrainPackage(API_URL, siteId, controller.signal)
      .then((p) => setPackages((all) => ({ ...all, [siteId]: p })))
      .catch((e: unknown) => {
        if (controller.signal.aborted) return
        setLoadErrors((all) => ({ ...all, [siteId]: e instanceof Error ? e.message : String(e) }))
      })
    return () => controller.abort()
  }, [siteId, packages, active])

  // Rover traverse inside the site window (cached per site; optional context).
  useEffect(() => {
    if (!API_URL || !active || traverses[siteId]) return
    const controller = new AbortController()
    fetchTraverse(API_URL, siteId, controller.signal)
      .then((t) => setTraverses((all) => ({ ...all, [siteId]: t })))
      .catch(() => {
        // The planner works without it; the panel simply shows no rover section.
      })
    return () => controller.abort()
  }, [siteId, traverses, active])
  const rawTraverse = traverses[siteId] ?? null
  const traverse = useMemo(
    () => (rawTraverse && pkg ? clipTraverse(rawTraverse, pkg.bounds_m) : null),
    [rawTraverse, pkg],
  )

  // Plan whenever both ends exist and inputs change (debounced).
  const key = planKey(siteId, draft, maxGrade)
  useEffect(() => {
    if (!API_URL || !key) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetchRoutePlan(API_URL, siteId, draft.waypoints, maxGrade, controller.signal)
        .then((plan) => setResult({ key, plan, error: null }))
        .catch((e: unknown) => {
          if (controller.signal.aborted) return
          setResult({ key, plan: null, error: e instanceof Error ? e.message : String(e) })
        })
    }, 250)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [key, siteId, draft.waypoints, maxGrade])

  const current = key && result?.key === key ? result : null
  const plan = current?.plan ?? null
  const routes: PlannedRoute[] = plan?.routes ?? []
  // "rover" exists only when A and B lie on the rover's traverse; fall back otherwise.
  const selected: RouteId = routes.some((r) => r.id === selectedRouteId)
    ? selectedRouteId
    : 'lower_risk'

  const updateDraft = (fn: (d: Draft) => Draft) =>
    setDrafts((all) => ({ ...all, [siteId]: fn(all[siteId]) }))

  const inBounds = (x: number, y: number) => {
    if (!pkg) return false
    const b = pkg.bounds_m
    return x >= b.left && x <= b.right && y >= b.bottom && y <= b.top
  }

  /** Places the point the user is picking; returns false if (x, y) is off the grid. */
  const pick = (x: number, y: number): boolean => {
    if (!draft.pickTarget || !inBounds(x, y)) return false
    updateDraft((d) => {
      const w = d.waypoints
      if (d.pickTarget === 'start') {
        return {
          waypoints: w.length === 0 ? [[x, y]] : [[x, y], ...w.slice(1)],
          hasEnd: d.hasEnd,
          pickTarget: d.hasEnd ? null : 'end',
        }
      }
      if (d.pickTarget === 'end') {
        return {
          waypoints: d.hasEnd ? [...w.slice(0, -1), [x, y]] : [...w, [x, y]],
          hasEnd: true,
          pickTarget: null,
        }
      }
      if (w.length - (d.hasEnd ? 2 : 1) >= MAX_STOPS) return { ...d, pickTarget: null }
      return { waypoints: insertStop(w, d.hasEnd, [x, y]), hasEnd: d.hasEnd, pickTarget: null }
    })
    return true
  }

  /** Moves an existing waypoint (drag on the map); returns false if (x, y) is off the grid. */
  const moveWaypoint = (index: number, x: number, y: number): boolean => {
    if (!inBounds(x, y) || index < 0 || index >= draft.waypoints.length) return false
    updateDraft((d) => ({
      ...d,
      waypoints: d.waypoints.map((p, i) => (i === index ? [x, y] : p)),
    }))
    return true
  }

  const toLonLat = (p: readonly [number, number]): [number, number] =>
    pkg
      ? aeqdInverse(p[0], p[1], pkg.center_lon_lat[0], pkg.center_lon_lat[1], pkg.radius_m)
      : [0, 0]

  const exportGeoJson = () => {
    if (!plan) return
    const fc = {
      type: 'FeatureCollection',
      features: plan.routes.map((r) => ({
        type: 'Feature',
        properties: {
          site: siteId,
          route: r.id,
          max_grade_deg_limit: plan.max_grade_deg,
          ...r.metrics,
        },
        geometry: { type: 'LineString', coordinates: r.path_lon_lat },
      })),
    }
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${siteId}-routes.geojson`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return {
    apiUrl: API_URL,
    siteId,
    setSiteId,
    pkg,
    grid,
    loadError: loadErrors[siteId] ?? null,
    waypoints: draft.waypoints,
    hasEnd: draft.hasEnd,
    pickTarget: draft.pickTarget,
    setPickTarget: (t: PickTarget) => updateDraft((d) => ({ ...d, pickTarget: t })),
    pick,
    moveWaypoint,
    removeStop: (index: number) =>
      updateDraft((d) => ({ ...d, waypoints: d.waypoints.filter((_, i) => i !== index) })),
    clear: () => updateDraft(() => EMPTY_DRAFT),
    loadExample: exampleWaypoints
      ? () =>
          updateDraft((current) =>
            current.waypoints.length > 0
              ? current
              : { waypoints: exampleWaypoints, hasEnd: true, pickTarget: null },
          )
      : null,
    traverse,
    /** A and B at the rover's first and last stop here, up to 8 of its stops between. */
    followRover: () => {
      const wps = traverse ? roverWaypoints(traverse.stops, MAX_STOPS) : null
      if (!wps) return
      updateDraft(() => ({ waypoints: wps, hasEnd: true, pickTarget: null }))
      // Show the rover's own path first; the two planned routes stay for comparison.
      setSelectedRouteId('rover')
    },
    /** Adds a point (e.g. a rover stop) as a stop where it fits best; A/B first if missing. */
    addStopAt: (x: number, y: number) =>
      updateDraft((d) => {
        if (d.waypoints.length === 0)
          return { waypoints: [[x, y]], hasEnd: false, pickTarget: 'end' }
        if (!d.hasEnd)
          return { waypoints: [...d.waypoints, [x, y]], hasEnd: true, pickTarget: null }
        if (d.waypoints.length - 2 >= MAX_STOPS) return d
        return { ...d, waypoints: insertStop(d.waypoints, true, [x, y]) }
      }),
    maxGrade,
    setMaxGrade,
    planning: key !== null && current === null,
    planError: current?.error ?? null,
    plan,
    routes,
    planKey: key,
    selectedRouteId: selected,
    setSelectedRouteId,
    toLonLat,
    exportGeoJson,
  }
}

export type RoutePlanner = ReturnType<typeof useRoutePlanner>
