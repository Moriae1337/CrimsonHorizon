import assert from 'node:assert/strict'
import { test } from 'node:test'
import { roverWaypoints, type RoverStop } from '../src/sites.ts'

const stop = (i: number): RoverStop => ({
  site: i,
  sol_start: i * 10,
  sol_end: i * 10 + 5,
  lon: 0,
  lat: 0,
  x: i * 100,
  y: 0,
})

test('roverWaypoints keeps the first and last stop and spreads the rest evenly', () => {
  const stops = Array.from({ length: 21 }, (_, i) => stop(i))
  const wps = roverWaypoints(stops, 4)
  assert.deepEqual(wps, [
    [0, 0],
    [400, 0],
    [800, 0],
    [1200, 0],
    [1600, 0],
    [2000, 0],
  ])
})

test('roverWaypoints uses every stop when there are few', () => {
  const stops = [stop(0), stop(1), stop(2)]
  assert.deepEqual(roverWaypoints(stops, 8), [
    [0, 0],
    [100, 0],
    [200, 0],
  ])
})

test('roverWaypoints needs at least two stops', () => {
  assert.equal(roverWaypoints([stop(0)], 8), null)
})
