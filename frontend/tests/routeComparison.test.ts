import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { buildRouteComparison } from '../src/routeComparison.ts'
import { parseScenario } from '../src/scenario.ts'
import { makeScenarioPayload } from './scenarioFixture.ts'

const publishedBundle = new URL('../../backend/data/hawksbill_gap/scenario.json', import.meta.url)

test('compares published Hawksbill Gap routes using the backend values', () => {
  const {
    options: [a, b],
    distanceDifference,
  } = buildRouteComparison(parseScenario(JSON.parse(readFileSync(publishedBundle, 'utf8'))))
  assert.deepEqual([a.id, b.id], ['A', 'B'])
  assert.deepEqual([a.roundTrip, b.roundTrip, distanceDifference], ['258 m', '345 m', '87 m'])
  assert.deepEqual([a.ascent, b.ascent], ['13.34 m', '17.80 m'])
  assert.deepEqual(a.maxGrades, ['14.82°', '20.69°', '14.15°'])
  assert.deepEqual(b.maxGrades, ['14.93°', '22.13°', '13.95°'])
  assert.deepEqual([a.coverage, b.coverage], ['100%', '100%'])
  assert.deepEqual(
    [a.turnaround, b.turnaround],
    ['129 m along route · 18.4586° N, 77.4059° E', '173 m along route · 18.4586° N, 77.4059° E'],
  )
  assert.deepEqual(
    [a.farthestFromStart, b.farthestFromStart],
    ['79.84 m · 18.4588° N, 77.4061° E', '86.49 m · 18.4589° N, 77.4062° E'],
  )
  assert.deepEqual(a.observations, [
    'Skinner Ridge stand-off view · contact may be obscured',
    'Wildcat Ridge outcrop inspection',
  ])
  assert.deepEqual(b.observations, [
    'Skinner Ridge close inspection of the block contact',
    'Wildcat Ridge outcrop inspection',
  ])
  assert.equal(a.openZones?.length, 5)
  assert.equal(b.openZones?.length, 4)
  assert.equal(a.openZones?.[0].label, 'Proposed connector')
  assert.equal(a.openZones?.[0].span, '107.96–113.15 m')
  assert.ok(b.openZones?.every((zone) => zone.label !== 'Proposed connector'))
})

test('distinguishes missing terrain and caution data from numeric zero and a completed review', () => {
  const payload = makeScenarioPayload()
  const [a, b] = payload.route_options as Array<Record<string, unknown>>
  Object.assign(b, {
    ascent_m: 0,
    max_grade_deg: { '5': 0, '2': null },
    dtm_covered_pct: 0,
    caution_review: { open_zone_ids: [] },
  })
  a.stop_ids = []
  payload.routes = { type: 'FeatureCollection', features: [] }
  const {
    options: [old, reviewed],
  } = buildRouteComparison(parseScenario(payload))
  assert.equal(old.ascent, 'Unknown')
  assert.equal(old.farthestFromStart, 'Unknown')
  assert.deepEqual(old.maxGrades, ['Unknown', 'Unknown', 'Unknown'])
  assert.equal(old.coverage, 'Unknown')
  assert.equal(old.openZones, null)
  assert.deepEqual(old.observations, [])
  assert.equal(reviewed.ascent, '0.00 m')
  assert.deepEqual(reviewed.maxGrades, ['0.00°', 'Unknown', 'Unknown'])
  assert.equal(reviewed.coverage, '0%')
  assert.deepEqual(reviewed.openZones, [])
})

test('retains caution zone geometry, source IDs, and review status for GeoJSON export', () => {
  const payload = JSON.parse(readFileSync(publishedBundle, 'utf8'))
  const published = payload.unknowns[0]
  const [zone] = parseScenario(payload).caution_zones
  assert.equal(zone.type, 'Feature')
  assert.equal(zone.id, published.id)
  assert.deepEqual(zone.geometry, published.geometry)
  assert.deepEqual(zone.properties.source_ids, published.source_ids)
  assert.deepEqual(zone.properties.uncertainty, published.uncertainty)
  assert.equal(zone.properties.review_status, published.review_status)
  assert.equal(zone.properties.length_m, published.length_m)
})

test('lists only the published open zones and keeps a future zone visible by ID', () => {
  const payload = JSON.parse(readFileSync(publishedBundle, 'utf8'))
  payload.route_options[0].caution_review.open_zone_ids = ['steep-segment-a-5m', 'future-a']
  payload.unknowns.push({ id: 'future-a', option: 'A', kind: 'future-kind' })
  const {
    options: [a],
  } = buildRouteComparison(parseScenario(payload))
  assert.deepEqual(
    a.openZones?.map((zone) => zone.label),
    ['Steepest segment · 5 m window', 'future-a · details unavailable'],
  )
})
