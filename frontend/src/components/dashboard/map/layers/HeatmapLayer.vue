<template>
  <div />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue';
import type { PropType } from 'vue';

import { useSensorStore } from '../../../../stores/sensorStore';

const props = defineProps({
  map: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
  stations: {
    type: Array as PropType<any[]>,
    default: () => [],
  },
});

const store = useSensorStore();

const sourceId = 'heatmap-source';

const layerId = 'heatmap-layer';

function buildGeoJson() {
  return {
    type: 'FeatureCollection',
    features: props.stations.map((station) => {
      const location = store.parseLocation(station);

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [location.lng, location.lat],
        },
        properties: {
          load: station.electrical?.active_power_kw || 0,
        },
      };
    }),
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
    type: 'heatmap',
    source: sourceId,
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'load'], 0, 0, 5000, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 7, 0.65, 12, 1.35],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 7, 14, 12, 34],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.22, 12, 0.48],
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

watch(() => props.stations, updateLayer, { deep: true });

onBeforeUnmount(() => {
  if (props.map.getLayer(layerId)) {
    props.map.removeLayer(layerId);
  }

  if (props.map.getSource(sourceId)) {
    props.map.removeSource(sourceId);
  }
});
</script>
