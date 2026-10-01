import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { humanizeAssetKey, routeForAsset, stationIdForAsset } from '../src/utils/assets.ts'
import { formatClockTime } from '../src/utils/dateTime.ts'
import {
  createSparkSeries,
  metricLinePoints,
  metricPointTimestamp,
  metricPointValue
} from '../src/utils/metricSeries.ts'
import { average, clamp, round, round1, round2 } from '../src/utils/numbers.ts'
import { getHealth, getRisk } from '../src/services/stationAnalytics.ts'

function normalStation(overrides = {}) {
  return {
    station_id: 'TS-0001',
    station_name: 'Station 1',
    electrical: {
      voltage_kv: 10.1,
      current_a: 300,
      active_power_kw: 1800,
      frequency_hz: 50,
      harmonics_thd: 2.2,
      ...(overrides.electrical || {})
    },
    thermal: {
      oil_temp_c: 62,
      winding_temp_c: 73,
      ambient_temp_c: 22,
      ...(overrides.thermal || {})
    },
    oil_gas: {},
    alarms: {
      ...(overrides.alarms || {})
    }
  }
}

describe('number utilities', () => {
  test('clamp coerces numeric input and enforces both bounds', () => {
    assert.equal(clamp('42'), 42)
    assert.equal(clamp(-1), 0)
    assert.equal(clamp(101), 100)
    assert.equal(clamp('invalid'), 0)
    assert.equal(clamp(5, 10, 20), 10)
  })

  test('average ignores non-finite values and uses the fallback when empty', () => {
    assert.equal(average([10, 20, Number.NaN, Number.POSITIVE_INFINITY]), 15)
    assert.equal(average([], 7), 7)
  })

  test('rounding helpers use the requested precision', () => {
    assert.equal(round(12.345, 2), 12.35)
    assert.equal(round1(12.35), 12.4)
    assert.equal(round2('4.236'), 4.24)
    assert.equal(round('invalid', 2), 0)
  })
})

describe('asset utilities', () => {
  test('humanizes backend asset keys', () => {
    assert.equal(humanizeAssetKey('transformer_trip'), 'Transformer Trip')
  })

  test('maps transformer and station IDs to their station', () => {
    assert.equal(stationIdForAsset('TS-0042'), 'TS-0042')
    assert.equal(stationIdForAsset('TR-0042'), 'TS-0042')
    assert.equal(stationIdForAsset('REGION-NORTH'), null)
    assert.equal(stationIdForAsset(null), null)
  })

  test('builds only supported application routes', () => {
    assert.equal(routeForAsset('TR-0042'), '/transformers/TR-0042')
    assert.equal(routeForAsset('TS-0042'), '/substations/TS-0042')
    assert.equal(routeForAsset('REGION-NORTH'), '/regions/REGION-NORTH')
    assert.equal(routeForAsset('SYSTEM'), null)
    assert.equal(routeForAsset('UNKNOWN-1'), null)
  })
})

describe('metric series utilities', () => {
  test('creates deterministic, bounded sparkline seed data', () => {
    const first = createSparkSeries(2)
    const second = createSparkSeries(2)

    assert.deepEqual(first, second)
    assert.equal(first.length, 12)
    assert.ok(first.every(value => value >= 12 && value <= 92))
  })

  test('normalizes values and timestamps', () => {
    assert.equal(metricPointValue(18), 18)
    assert.equal(metricPointValue({ value: 23, timestamp: 1000 }), 23)
    assert.equal(metricPointValue({ value: Number.NaN, timestamp: 1000 }), 0)
    assert.equal(metricPointTimestamp({ value: 1, timestamp: 1000 }), 1000)
    assert.equal(metricPointTimestamp({ value: 1, timestamp: '2026-09-30T10:00:00Z' }), Date.parse('2026-09-30T10:00:00Z'))
    assert.equal(metricPointTimestamp({ value: 1, timestamp: 'invalid' }), null)
  })

  test('returns an empty line for empty history and centers a single point', () => {
    assert.equal(metricLinePoints([], 100, 30), '')
    assert.equal(metricLinePoints([25], 100, 30), '50.0,27.0')
  })

  test('uses timestamps for horizontal position and preserves endpoints', () => {
    const points = metricLinePoints([
      { value: 10, timestamp: 1000 },
      { value: 20, timestamp: 1500 },
      { value: 30, timestamp: 2000 }
    ], 100, 30, 10_000).split(' ')

    assert.equal(points[0], '0.0,27.0')
    assert.match(points[1], /^50\.0,/) 
    assert.equal(points.at(-1), '100.0,3.0')
  })

  test('reduces dense histories to a width-based visual budget', () => {
    const values = Array.from({ length: 1000 }, (_, index) => ({
      value: Math.sin(index / 9) * 10 + 50,
      timestamp: index * 1000
    }))
    const points = metricLinePoints(values, 120, 30).split(' ')

    assert.equal(points.length, 60)
    assert.match(points[0], /^0\.0,/) 
    assert.match(points.at(-1), /^120\.0,/) 
  })
})

describe('station analytics', () => {
  test('faults lower health and increase risk', () => {
    const normal = normalStation()
    const faulted = normalStation({
      electrical: { voltage_kv: 8, current_a: 800, active_power_kw: 4400, harmonics_thd: 12 },
      thermal: { oil_temp_c: 112 },
      alarms: { overload: true, overheating: true, voltage_drop: true }
    })

    assert.ok(getHealth(faulted) < getHealth(normal))
    assert.ok(getRisk(faulted) > getRisk(normal))
    assert.equal(getHealth(faulted), 0)
    assert.equal(getRisk(faulted), 100)
  })

  test('scores stay inside the public 0-100 range', () => {
    const extreme = normalStation({
      electrical: { current_a: 100_000, active_power_kw: 100_000, harmonics_thd: 100 },
      thermal: { oil_temp_c: 1000 },
      alarms: { offline: true }
    })

    assert.equal(getHealth(extreme), 0)
    assert.equal(getRisk(extreme), 100)
  })

  test('a normal station matches the backend risk score', () => {
    assert.equal(getRisk(normalStation()), 7)
  })

  test('critical alarm penalties match the backend analytics rules', () => {
    const station = normalStation({ alarms: { transformer_trip: true } })

    assert.equal(getHealth(station), 44)
    assert.equal(getRisk(station), 47)
  })
})

describe('date formatting', () => {
  test('returns a stable placeholder for invalid timestamps', () => {
    assert.equal(formatClockTime('not-a-date', true, 'en-GB'), '--:--:--')
    assert.equal(formatClockTime('not-a-date', false, 'en-GB'), '--:--')
  })

  test('supports output with and without seconds', () => {
    const timestamp = '2026-09-30T10:20:30Z'
    assert.match(formatClockTime(timestamp, true, 'en-GB'), /^\d{2}:\d{2}:\d{2}$/)
    assert.match(formatClockTime(timestamp, false, 'en-GB'), /^\d{2}:\d{2}$/)
  })
})
