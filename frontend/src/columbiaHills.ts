import { aeqdForward, sampleElevation, type TerrainGrid, type TerrainPackage } from './sites.ts'

// Spirit’s corrected positions at Husband Hill and the Home Plate approach.
// See specs/sites-api.md for the source rows and projection.
const SPIRIT_ENDPOINTS = [
  [175.5237985, -14.5869097],
  [175.5255885, -14.5996021],
] as const

export function columbiaHillsWaypoints(
  site: TerrainPackage,
  grid: TerrainGrid,
): [number, number][] | null {
  if (site.site_id !== 'columbia-hills') return null
  const points = SPIRIT_ENDPOINTS.map(([lon, lat]) =>
    aeqdForward(lon, lat, ...site.center_lon_lat, site.radius_m),
  )
  return points.every(([x, y]) => Number.isFinite(sampleElevation(grid, x, y))) ? points : null
}
