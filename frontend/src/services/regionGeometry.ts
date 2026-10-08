import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
import type { Station } from '../types/dashboard';

export type RegionProperties = { id: string; name: string; country: string; custom: boolean };
export type RegionFeature = Feature<Polygon | MultiPolygon, RegionProperties>;
export type RegionCollection = FeatureCollection<Polygon | MultiPolygon, RegionProperties>;
export const emptyRegions = (): RegionCollection => ({ type: 'FeatureCollection', features: [] });

export function stationCoordinates(station: Station): [number, number] | null {
  const location = station.location;
  const match = typeof location === 'string' ? location.match(/^\s*\(([^,]+),([^,]+)\)\s*$/) : null;
  const coordinates = typeof location === 'object' ? location?.coordinates : null;
  const lng = Number(match?.[1] ?? coordinates?.[0] ?? NaN);
  const lat = Number(match?.[2] ?? coordinates?.[1] ?? NaN);
  return Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90
    ? [lng, lat]
    : null;
}

// Boundary points belong to the polygon. Holes are excluded, including their boundary.
function inRing([x, y]: Position, ring: Position[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const cross = (x - xi) * (yj - yi) - (y - yi) * (xj - xi);
    if (
      Math.abs(cross) < 1e-10 &&
      x >= Math.min(xi, xj) &&
      x <= Math.max(xi, xj) &&
      y >= Math.min(yi, yj) &&
      y <= Math.max(yi, yj)
    )
      return true;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const boundsCache = new WeakMap<object, [number, number, number, number]>();
export function geometryBounds(geometry: Polygon | MultiPolygon): [number, number, number, number] {
  const cached = boundsCache.get(geometry);
  if (cached) return cached;
  const bounds: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  for (const polygon of polygons)
    for (const ring of polygon)
      for (const [lng, lat] of ring) {
        bounds[0] = Math.min(bounds[0], lng);
        bounds[1] = Math.min(bounds[1], lat);
        bounds[2] = Math.max(bounds[2], lng);
        bounds[3] = Math.max(bounds[3], lat);
      }
  boundsCache.set(geometry, bounds);
  return bounds;
}

export function containsPoint(feature: RegionFeature, point: Position) {
  const [west, south, east, north] = geometryBounds(feature.geometry);
  if (point[0] < west || point[0] > east || point[1] < south || point[1] > north) return false;
  const polygons =
    feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  return polygons.some(
    (polygon) => inRing(point, polygon[0]) && !polygon.slice(1).some((ring) => inRing(point, ring)),
  );
}

export function collectionBounds(
  features: RegionFeature[],
): [number, number, number, number] | null {
  if (!features.length) return null;
  const boxes = features.map((feature) => geometryBounds(feature.geometry));
  return [
    Math.min(...boxes.map((b) => b[0])),
    Math.min(...boxes.map((b) => b[1])),
    Math.max(...boxes.map((b) => b[2])),
    Math.max(...boxes.map((b) => b[3])),
  ];
}

// Accept only bounded WGS84 polygon collections, never arbitrary properties or HTML.
export function validateCustomRegions(input: unknown, country: string): RegionCollection {
  const data = input as RegionCollection;
  if (
    data?.type !== 'FeatureCollection' ||
    !Array.isArray(data.features) ||
    !data.features.length ||
    data.features.length > 200
  ) {
    throw new Error('collection');
  }
  const ids = new Set<string>();
  let vertexCount = 0;
  const features = data.features.map((feature, index): RegionFeature => {
    if (
      feature?.type !== 'Feature' ||
      !['Polygon', 'MultiPolygon'].includes(feature.geometry?.type)
    )
      throw new Error('polygon');
    const geometry = feature.geometry;
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    if (!Array.isArray(polygons) || !polygons.length) throw new Error('polygon');
    for (const polygon of polygons) {
      if (!Array.isArray(polygon) || !polygon.length) throw new Error('polygon');
      for (const ring of polygon) {
        if (!Array.isArray(ring) || ring.length < 4) throw new Error('ring');
        let twiceArea = 0;
        for (let i = 0; i < ring.length; i++) {
          const point = ring[i];
          if (
            ++vertexCount > 100000 ||
            !Array.isArray(point) ||
            point.length < 2 ||
            !point.every(Number.isFinite) ||
            Math.abs(point[0]) > 180 ||
            Math.abs(point[1]) > 90
          )
            throw new Error('coordinates');
          const previous = ring[(i + ring.length - 1) % ring.length];
          if (!Array.isArray(previous)) throw new Error('coordinates');
          twiceArea += previous[0] * point[1] - point[0] * previous[1];
        }
        if (
          ring[0][0] !== ring.at(-1)?.[0] ||
          ring[0][1] !== ring.at(-1)?.[1] ||
          Math.abs(twiceArea) < 1e-12
        )
          throw new Error('ring');
      }
    }
    const name = String(feature.properties?.name || '')
      .trim()
      .slice(0, 100);
    if (!name) throw new Error('name');
    const rawId = String(feature.id ?? feature.properties?.id ?? index).slice(0, 150);
    const id = rawId.startsWith(`custom-${country}-`) ? rawId : `custom-${country}-${rawId}`;
    if (ids.has(id)) throw new Error('id');
    ids.add(id);
    return { type: 'Feature', id, geometry, properties: { id, name, country, custom: true } };
  });
  return { type: 'FeatureCollection', features };
}
