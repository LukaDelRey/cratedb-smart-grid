import test from 'node:test';
import assert from 'node:assert/strict';
import { readMapCamera, saveMapCamera } from '../src/services/dashboardMapCamera.ts';
const storage = new Map();
globalThis.window = { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } };
test('persists the complete camera separately for each country', () => {
  const camera = { center: [16.4, 46.3], zoom: 11.8, bearing: 25, pitch: 40 };
  saveMapCamera('HR', camera);
  assert.deepEqual(readMapCamera('HR'), camera);
  assert.deepEqual(JSON.parse(storage.get('cratedb-map-camera-HR')), camera);
  assert.equal(readMapCamera('AT'), null);
});
test('rejects corrupt and invalid stored cameras', () => {
  for (const [country, value] of [['DE', '{broken'], ['FR', JSON.stringify({ center: [900, 45], zoom: 10, pitch: 0, bearing: 0 })], ['IT', JSON.stringify({ center: [12, 42], zoom: -5, pitch: 0, bearing: 0 })]]) {
    storage.set(`cratedb-map-camera-${country}`, value);
    assert.equal(readMapCamera(country), null);
  }
});
test('keeps navigation state when browser storage is blocked', () => {
  window.localStorage.setItem = () => { throw new Error('blocked'); };
  const camera = { center: [14, 47], zoom: 8, bearing: 0, pitch: 0 };
  saveMapCamera('SI', camera);
  assert.deepEqual(readMapCamera('SI'), camera);
});
