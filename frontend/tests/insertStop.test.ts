import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { insertStop } from '../src/sites.ts'

describe('insertStop', () => {
  it('appends while there is no end point', () => {
    assert.deepEqual(insertStop([[0, 0]], false, [5, 5]), [
      [0, 0],
      [5, 5],
    ])
  })

  it('puts the stop between the waypoints it lengthens the chain least', () => {
    const chain: [number, number][] = [
      [0, 0],
      [100, 0],
      [200, 0],
    ]
    // Near the first leg: goes between A and the existing stop, not before B.
    assert.deepEqual(insertStop(chain, true, [40, 10]), [
      [0, 0],
      [40, 10],
      [100, 0],
      [200, 0],
    ])
    // Near the second leg.
    assert.deepEqual(insertStop(chain, true, [160, -5]), [
      [0, 0],
      [100, 0],
      [160, -5],
      [200, 0],
    ])
  })

  it('never moves the start or the end', () => {
    const chain: [number, number][] = [
      [0, 0],
      [100, 0],
    ]
    const out = insertStop(chain, true, [-50, 0])
    assert.deepEqual(out[0], [0, 0])
    assert.deepEqual(out[out.length - 1], [100, 0])
  })
})
