import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import Feature from 'ol/Feature.js'
import LineString from 'ol/geom/LineString.js'
import { directionArrows } from '../src/scenarioLayers.ts'
import { columbiaHillsWaypoints } from '../src/columbiaHills.ts'
import {
  aeqdForward,
  aeqdInverse,
  decodeTerrain,
  formatDelta,
  formatMinutes,
  parseRoutePlan,
  parseTerrainPackage,
  pointAlong,
  routesQuery,
  sampleElevation,
  textureUrl,
  type TerrainPackage,
} from '../src/sites.ts'

function pkg(values: number[], rows: number, cols: number): TerrainPackage {
  const bytes = new Uint8Array(values.length * 2)
  values.forEach((v, i) => {
    bytes[2 * i] = v & 0xff
    bytes[2 * i + 1] = v >> 8
  })
  return parseTerrainPackage(
    {
      version: 1,
      site_id: 'columbia-hills',
      name: 'Test',
      region: 'Gusev crater',
      center_lon_lat: [175.5235, -14.605],
      radius_m: 3396190,
      bounds_m: { left: 0, right: cols, bottom: 0, top: rows },
      cell_size_m: 1,
      shape: [rows, cols],
      elevation: {
        encoding: 'uint16-le-base64',
        offset_m: -100,
        scale_m: 0.5,
        nodata: 65535,
        data: Buffer.from(bytes).toString('base64'),
        min_m: 0,
        max_m: 0,
        valid_fraction: 1,
      },
      texture: { path: 'texture.jpg', cell_size_m: 1, shape: [rows, cols] },
      sources: [],
      notes: [],
    },
    'columbia-hills',
  )
}

describe('terrain decoding', () => {
  it('decodes uint16 steps and NoData', () => {
    const grid = decodeTerrain(pkg([0, 2, 65535, 4], 2, 2))
    assert.equal(grid.z[0], -100)
    assert.equal(grid.z[1], -99)
    assert.ok(Number.isNaN(grid.z[2]))
    assert.equal(grid.min, -100)
    assert.equal(grid.max, -98)
  })

  it('samples bilinearly between cell centres', () => {
    const grid = decodeTerrain(pkg([0, 4, 0, 4], 2, 2)) // -100 | -98 per row
    assert.equal(sampleElevation(grid, 0.5, 1.5), -100)
    assert.equal(sampleElevation(grid, 1.0, 1.5), -99)
    assert.ok(Number.isNaN(sampleElevation(grid, 5, 5)))
  })

  it('rejects the wrong site or encoding', () => {
    assert.throws(() => parseTerrainPackage({ version: 1, site_id: 'x' }, 'columbia-hills'))
  })
})

describe('AEQD projection', () => {
  it('round-trips near the site centre', () => {
    const [x, y] = aeqdForward(175.53, -14.6, 175.5235, -14.605, 3396190)
    const [lon, lat] = aeqdInverse(x, y, 175.5235, -14.605, 3396190)
    assert.ok(Math.abs(lon - 175.53) < 1e-9)
    assert.ok(Math.abs(lat + 14.6) < 1e-9)
    assert.ok(x > 0 && y > 0)
  })
})

describe('route helpers', () => {
  it('projects the Spirit example onto valid Columbia Hills terrain', () => {
    const path = new URL('../../backend/data/sites/columbia_hills/terrain.json', import.meta.url)
    const site = parseTerrainPackage(JSON.parse(readFileSync(path, 'utf8')), 'columbia-hills')
    const waypoints = columbiaHillsWaypoints(site, decodeTerrain(site))
    assert.ok(waypoints)
    const [[x1, y1], [x2, y2]] = waypoints
    const distance = Math.hypot(x2 - x1, y2 - y1)
    assert.ok(distance > 750 && distance < 770)
  })

  it('does not offer the Spirit example on incompatible terrain', () => {
    const site = pkg([0, 0, 0, 0], 2, 2)
    assert.equal(columbiaHillsWaypoints(site, decodeTerrain(site)), null)
  })

  it('walks a polyline by fraction of length', () => {
    const path: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
    ]
    assert.deepEqual(pointAlong(path, 0.25), { x: 5, y: 0, heading: 0 })
    const mid = pointAlong(path, 0.75)
    assert.equal(mid.x, 10)
    assert.equal(mid.y, 5)
    assert.ok(Math.abs(mid.heading - Math.PI / 2) < 1e-12)
    assert.deepEqual(pointAlong(path, 2), { x: 10, y: 10, heading: Math.PI / 2 })
  })

  it('builds the planner query with stops between the ends', () => {
    const q = routesQuery(
      [
        [1, 2],
        [3, 4],
        [5, 6],
      ],
      20,
    )
    assert.equal(q.get('start'), '1.00,2.00')
    assert.equal(q.get('end'), '5.00,6.00')
    assert.equal(q.get('stops'), '3.00,4.00')
    assert.equal(q.get('max_grade_deg'), '20')
    assert.throws(() => routesQuery([[0, 0]], 20))
  })

  it('formats deltas and durations', () => {
    assert.equal(formatDelta(10, 12.5, 'm'), '+2.5 m')
    assert.equal(formatDelta(20.7, 9.6, '°'), '−11.1°')
    assert.equal(formatDelta(1, 1, 'm'), '—')
    assert.equal(formatMinutes(34.4), '34 min')
    assert.equal(formatMinutes(125), '2 h 05 min')
  })

  it('validates route plans', () => {
    assert.throws(() => parseRoutePlan({ routes: [{ id: 'other' }] }))
    const plan = parseRoutePlan({
      routes: [{ id: 'shortest', metrics: {}, path_xy: [], profile: [] }],
    })
    assert.equal(plan.routes[0].id, 'shortest')
  })
})

describe('texture url', () => {
  it('is versioned by the package build time', () => {
    assert.equal(
      textureUrl('http://api', { site_id: 'columbia-hills', created_at: '2026-11-14T15:10:21Z' }),
      'http://api/sites/columbia-hills/texture.jpg?v=2026-11-14T15%3A10%3A21Z',
    )
    assert.equal(
      textureUrl('http://api', { site_id: 'hawksbill-gap' }),
      'http://api/sites/hawksbill-gap/texture.jpg',
    )
  })
})

describe('direction arrows', () => {
  it('places chevrons at a fixed screen spacing along the line', () => {
    const feature = new Feature(
      new LineString([
        [0, 0],
        [700, 0],
      ]),
    )
    assert.equal(directionArrows(feature, 1, 100).length, 10)
    assert.equal(directionArrows(feature, 10, 100).length, 1)
    assert.deepEqual(directionArrows(new Feature(), 1, 100), [])
  })
})
