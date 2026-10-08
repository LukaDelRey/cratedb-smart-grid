<template>
  <div
    ref="container"
    class="region-boundary-preview"
  />
</template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import mapboxgl from 'mapbox-gl';
import type { RegionCollection } from '../../services/regionGeometry';
import type { Station } from '../../types/dashboard';
import { stationCoordinates } from '../../services/regionGeometry';
import { collectionBounds } from '../../services/regionGeometry';
const props = defineProps<{ data: RegionCollection; stations?: Station[] }>();
const container = ref<HTMLDivElement>();
let map: mapboxgl.Map | null = null;
let observer: ResizeObserver | null = null;
function stationData(): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: (props.stations || []).flatMap((station) => {
      const point = stationCoordinates(station);
      return point
        ? [
            {
              type: 'Feature' as const,
              geometry: { type: 'Point' as const, coordinates: point },
              properties: { status: station.status || 'normal' },
            },
          ]
        : [];
    }),
  };
}
function updateStations() {
  (map?.getSource('preview-stations') as mapboxgl.GeoJSONSource | undefined)?.setData(
    stationData(),
  );
}
function update() {
  if (!map?.getSource('preview')) return;
  (map.getSource('preview') as mapboxgl.GeoJSONSource).setData(props.data);
  const bounds = collectionBounds(props.data.features);
  if (bounds) map.fitBounds(bounds, { padding: 30, maxZoom: 10, duration: 0 });
}
onMounted(() => {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
  map = new mapboxgl.Map({
    container: container.value!,
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [16, 45],
    zoom: 5,
  });
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
  map.on('load', () => {
    map!.addSource('preview', {
      type: 'geojson',
      data: props.data,
      attribution: '<a href="https://www.geoboundaries.org/">geoBoundaries gbOpen</a>',
    });
    map!.addLayer({
      id: 'preview-fill',
      type: 'fill',
      source: 'preview',
      paint: { 'fill-color': '#40c4ff', 'fill-opacity': 0.18 },
    });
    map!.addLayer({
      id: 'preview-line',
      type: 'line',
      source: 'preview',
      paint: { 'line-color': '#40c4ff', 'line-width': 1.5 },
    });
    map!.addSource('preview-stations', { type: 'geojson', data: stationData() });
    map!.addLayer({
      id: 'preview-stations-pins',
      type: 'circle',
      source: 'preview-stations',
      paint: {
        'circle-radius': 5,
        'circle-color': '#08121f',
        'circle-stroke-width': 2,
        'circle-stroke-color': [
          'match',
          ['get', 'status'],
          'critical',
          '#fb7185',
          'warning',
          '#fbbf24',
          'offline',
          '#94a3b8',
          '#86efac',
        ],
      },
    });
    update();
  });
  observer = new ResizeObserver(() => map?.resize());
  observer.observe(container.value!);
});
watch(() => props.data, update);
watch(() => props.stations, updateStations, { deep: true });
onBeforeUnmount(() => {
  observer?.disconnect();
  map?.remove();
});
</script>
<style scoped>
.region-boundary-preview {
  width: 100%;
  height: 280px;
  border: 1px solid #29495a;
  border-radius: 10px;
  overflow: hidden;
}
</style>
