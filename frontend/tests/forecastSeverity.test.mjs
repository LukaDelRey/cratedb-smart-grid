import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forecastColor, forecastColorStops, FORECAST_COLORS as colors } from '../src/utils/forecastSeverity.ts';

test('forecast colors switch exactly at saved warning and critical thresholds', () => {
  for (const [warning, critical] of [[80, 95], [50, 75]]) {
    assert.equal(forecastColor(warning - 0.01, warning, critical), colors.normal);
    assert.equal(forecastColor(warning, warning, critical), colors.warning);
    assert.equal(forecastColor(critical - 0.01, warning, critical), colors.warning);
    assert.equal(forecastColor(critical, warning, critical), colors.critical);
    assert.equal(forecastColor(120, warning, critical), colors.critical);
  }
});

test('gradient boundaries align with the percentage chart, including edge thresholds', () => {
  for (const [warning, critical] of [[80, 95], [0, 100]]) {
    const stops = forecastColorStops(warning, critical);
    assert.equal(stops[1].offset * 132, 118 - critical * 1.04);
    assert.equal(stops[3].offset * 132, 118 - warning * 1.04);
    assert.equal(stops[1].offset, stops[2].offset);
    assert.equal(stops[3].offset, stops[4].offset);
    assert.ok(stops.every((stop, i) => stop.offset >= 0 && stop.offset <= 1 && (!i || stop.offset >= stops[i - 1].offset)));
  }
});
