export type DashboardMapCamera = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};
const memory = new Map<string, DashboardMapCamera>();
const storageKey = (country: string) => `cratedb-map-camera-${country}`;
export function readMapCamera(country: string): DashboardMapCamera | null {
  if (memory.has(country)) return memory.get(country)!;
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey(country)) || 'null');
    if (
      !value ||
      !Array.isArray(value.center) ||
      value.center.length !== 2 ||
      !value.center.every(Number.isFinite) ||
      Math.abs(value.center[0]) > 180 ||
      Math.abs(value.center[1]) > 90 ||
      !Number.isFinite(value.zoom) ||
      value.zoom < 0 ||
      value.zoom > 24 ||
      !Number.isFinite(value.bearing) ||
      !Number.isFinite(value.pitch) ||
      value.pitch < 0 ||
      value.pitch > 85
    )
      return null;
    memory.set(country, value);
    return value;
  } catch {
    return null;
  }
}
export function saveMapCamera(country: string, camera: DashboardMapCamera) {
  memory.set(country, camera);
  try {
    window.localStorage.setItem(storageKey(country), JSON.stringify(camera));
  } catch {
    /* Keep SPA navigation state in memory. */
  }
}
