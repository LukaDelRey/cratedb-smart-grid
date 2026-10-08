import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  containsPoint,
  validateCustomRegions,
  stationCoordinates,
} from '../src/services/regionGeometry.ts';

const ring = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];
const feature = {
  type: 'Feature',
  properties: { name: 'North' },
  geometry: { type: 'Polygon', coordinates: [ring] },
};
const collection = (f = feature) => ({ type: 'FeatureCollection', features: [structuredClone(f)] });

test('contains points and boundaries but excludes holes', () => {
  const polygon = structuredClone(feature);
  polygon.geometry.coordinates.push([
    [3, 3],
    [7, 3],
    [7, 7],
    [3, 7],
    [3, 3],
  ]);
  assert.equal(containsPoint(polygon, [1, 1]), true);
  assert.equal(containsPoint(polygon, [0, 5]), true);
  assert.equal(containsPoint(polygon, [5, 5]), false);
  assert.equal(containsPoint(polygon, [3, 5]), false);
  assert.equal(containsPoint(polygon, [11, 5]), false);
});
test('handles disconnected MultiPolygon regions', () => {
  const multi = structuredClone(feature);
  multi.geometry = {
    type: 'MultiPolygon',
    coordinates: [
      [ring],
      [
        [
          [20, 20],
          [22, 20],
          [22, 22],
          [20, 22],
          [20, 20],
        ],
      ],
    ],
  };
  assert.equal(containsPoint(multi, [21, 21]), true);
  assert.equal(containsPoint(multi, [15, 15]), false);
});
test('imports, exports and reloads custom regions without changing IDs', () => {
  const imported = validateCustomRegions(collection(), 'HR');
  const restored = validateCustomRegions(JSON.parse(JSON.stringify(imported)), 'HR');
  assert.equal(imported.features[0].properties.country, 'HR');
  assert.equal(imported.features[0].properties.custom, true);
  assert.equal(restored.features[0].id, imported.features[0].id);
});
test('rejects malformed geometry, unnamed regions, duplicates and unsupported geometry', () => {
  for (const mutate of [
    (data) => {
      data.features[0].geometry.coordinates[0].pop();
    },
    (data) => {
      data.features[0].properties.name = '';
    },
    (data) => {
      data.features[0].geometry.coordinates[0][1] = [999, 12];
    },
    (data) => {
      data.features[0].geometry.type = 'Point';
    },
    (data) => {
      data.features.push({ ...structuredClone(data.features[0]), id: 'a' });
      data.features[0].id = 'a';
    },
  ]) {
    const data = collection();
    mutate(data);
    assert.throws(() => validateCustomRegions(data, 'HR'));
  }
});
test('does not fabricate coordinates for missing or invalid station locations', () => {
  assert.equal(stationCoordinates({ station_id: 'missing' }), null);
  assert.equal(stationCoordinates({ station_id: 'invalid', location: '(190,50)' }), null);
  assert.deepEqual(
    stationCoordinates({ station_id: 'valid', location: '(16.4339,46.3844)' }),
    [16.4339, 46.3844],
  );
});
test('bundled boundaries cover all EU countries and assign real Croatian locations', () => {
  const data = JSON.parse(
    readFileSync(new URL('../public/regions/eu-adm1.geojson', import.meta.url)),
  );
  assert.equal(new Set(data.features.map((f) => f.properties.country)).size, 27);
  const croatia = data.features.filter((f) => f.properties.country === 'HR');
  assert.equal(croatia.length, 21);
  assert.equal(
    croatia.find((f) => containsPoint(f, [15.9819, 45.815]))?.properties.name,
    'Grad Zagreb',
  );
  assert.equal(
    croatia.some((f) => containsPoint(f, [14.5058, 46.0569])),
    false,
  );
});

test('cross-border sample includes both counties and survives export/reimport', () => {
  const sample = JSON.parse(
    readFileSync(new URL('../public/regions/test-medimurje-zala.geojson', import.meta.url), 'utf8'),
  );
  const data = validateCustomRegions(sample, 'custom:test-cross-border');
  assert.equal(data.features.length, 1);
  const shape = data.features[0];
  assert.equal(containsPoint(shape, [16.4339, 46.3844]), true);
  assert.equal(containsPoint(shape, [16.8439, 46.8417]), true);
  assert.equal(containsPoint(shape, [15.9819, 45.815]), false);
  assert.equal(containsPoint(shape, [16.3738, 48.2082]), false);
  assert.deepEqual(
    validateCustomRegions(JSON.parse(JSON.stringify(data)), 'custom:test-cross-border'),
    data,
  );
});
