<template>
  <div />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue';
import type { PropType } from 'vue';

const props = defineProps({
  map: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
  regions: {
    type: Array as PropType<any[]>,
    default: () => [],
  },
  weather: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
});

const sourceId = 'weather-impact-source';

const layerId = 'weather-impact-layer';

const coordinates = {
  'REGION-NORTH': [16.434, 46.418],
  'REGION-SOUTH': [16.434, 46.352],
};

function buildGeoJson() {
  return {
    type: 'FeatureCollection',
    features: props.regions.map((region) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: coordinates[region.id] || coordinates['REGION-NORTH'],
      },
      properties: {
        name: region.name,
        impact: props.weather.gridImpact,
        wind: props.weather.windRisk,
        lightning: props.weather.lightningRisk,
        storm: props.weather.stormRisk,
      },
    })),
  };
}

function addLayer() {
  if (props.map.getSource(sourceId)) {
    return;
  }

  props.map.addSource(sourceId, {
    type: 'geojson',
    data: buildGeoJson(),
  });

  props.map.addLayer({
    id: layerId,
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'impact'], 0, 20, 100, 58],
      'circle-color': '#ffab40',
      'circle-opacity': ['interpolate', ['linear'], ['get', 'impact'], 0, 0.04, 100, 0.16],
      'circle-blur': 0.82,
    },
  });
}

function updateLayer() {
  const source = props.map.getSource(sourceId);

  if (source) {
    source.setData(buildGeoJson());
  }
}

onMounted(addLayer);

watch(() => [props.regions, props.weather], updateLayer, { deep: true });

onBeforeUnmount(() => {
  if (props.map.getLayer(layerId)) props.map.removeLayer(layerId);

  if (props.map.getSource(sourceId)) props.map.removeSource(sourceId);
});
</script>
