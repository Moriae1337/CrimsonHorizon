import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PLACES, placeNumber, placesInWindow } from '../src/places.ts'
import type { RoverStop } from '../src/sites.ts'

const stop = (sol_start: number, sol_end: number, x: number): RoverStop => ({
  site: 0,
  sol_start,
  sol_end,
  lon: 0,
  lat: 0,
  x,
  y: 0,
})

describe('places', () => {
  it('every place has both languages and an https source', () => {
    for (const p of PLACES) {
      assert.ok(p.name.en && p.name.uk && p.text.en && p.text.uk, p.id)
      assert.match(p.source.url, /^https:\/\//, p.id)
    }
  })

  it('places are in mission order within each crater', () => {
    for (const crater of ['jezero', 'gusev'] as const) {
      const sols = PLACES.filter((p) => p.crater === crater).map((p) => p.sol)
      assert.deepEqual(
        sols,
        [...sols].sort((a, b) => a - b),
      )
    }
  })

  it('pins a place to the stop whose sols include it', () => {
    const placed = placesInWindow('gusev', [stop(10, 20, 1), stop(60, 70, 2), stop(150, 170, 3)])
    const bonneville = placed.find((p) => p.id === 'g-bonneville')
    assert.equal(bonneville?.x, 2)
    assert.equal(placed.find((p) => p.id === 'g-west-spur')?.x, 3)
  })

  it('leaves out places with no stop on their sol', () => {
    const placed = placesInWindow('gusev', [stop(575, 590, 2)])
    assert.deepEqual(
      placed.map((p) => p.id),
      ['g-husband'],
    )
  })

  it('lets only the landing use a nearby first stop', () => {
    const placed = placesInWindow('gusev', [stop(13, 20, 1)])
    assert.deepEqual(
      placed.map((p) => p.id),
      ['g-landing'],
    )
    assert.deepEqual(placesInWindow('gusev', []), [])
  })

  it('numbers places the same in every window', () => {
    const placed = placesInWindow('gusev', [stop(150, 170, 3)])
    const westSpur = PLACES.find((p) => p.id === 'g-west-spur')!
    assert.equal(placed[0].n, placeNumber(westSpur))
    assert.equal(placed[0].n, 3)
  })
})
