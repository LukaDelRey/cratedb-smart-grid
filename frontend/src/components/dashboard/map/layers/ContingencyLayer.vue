<template>
  <div />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue';
import type { PropType } from 'vue';
import mapboxgl from 'mapbox-gl';
import { useSensorStore } from '../../../../stores/sensorStore';
import { useI18n } from '../../../../i18n';

const props = defineProps({
  map: { type: Object as PropType<any>, required: true },
  stations: { type: Array as PropType<any[]>, default: () => [] },
  topRisk: { type: Array as PropType<any[]>, default: () => [] },
});

const store = useSensorStore();

const { t } = useI18n();

const sourceId = 'contingency-source';

const haloLayerId = 'contingency-halo';

const labelLayerId = 'contingency-labels';

function buildGeoJson() {
  const highRiskIds = new Set(props.topRisk.slice(0, 8).map((item) => item.id));

  return {
    type: 'FeatureCollection',
    features: props.stations
      .filter((station) => highRiskIds.has(station.station_id))
      .map((station) => {
        const location = store.parseLocation(station);

        const risk = store.getStationRisk(station);

        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [location.lng, location.lat] },
          properties: {
            id: station.station_id,
            name: station.station_name,
            risk,
            affectedCustomers: Math.round(1200 + risk * 58),
            overloadedAssets: Math.max(1, Math.round(risk / 18)),
          },
        };
      }),
  };
}

function popupHtml(p) {
  return `
    <div class="scada-popup scada-map-popup">
      <div class="popup-head">
        <div>
          <h3>N-1 ${p.id} <small class="status-pill critical">${t('dashboard.contingency')}</small></h3>
          <p>${p.name}</p>
        </div>
        <button class="popup-close" type="button">x</button>
      </div>
      <div class="popup-grid two-col">
        <div><span>${t('dashboard.risk')}</span><b class="critical">${p.risk}%</b></div>
        <div><span>${t('dashboard.affectedCustomers')}</span><b>${p.affectedCustomers}</b></div>
        <div><span>${t('dashboard.overloadedAssets')}</span><b>${p.overloadedAssets}</b></div>
      </div>
      <div class="popup-ai-block compact">
        <span>${t('dashboard.contingencyAnalysis')}</span>
        <strong>${t('dashboard.runDigitalTwinSwitchingScenario')}</strong>
        <small>${t('dashboard.basedOnCurrentTopRiskAssets')}</small>
      </div>
      <a class="popup-link" href="/substations/${p.id}">${t('dashboard.openTwin')}</a>
    </div>
  `;
}

function openPopup(event) {
  const feature = event.features?.[0];

  if (!feature) return;

  const popup = new mapboxgl.Popup({ closeButton: false, maxWidth: '320px', offset: 14 })
    .setLngLat(feature.geometry.coordinates)
    .setHTML(popupHtml(feature.properties))
    .addTo(props.map);

  popup
    .getElement()
    ?.querySelector('.popup-close')
    ?.addEventListener('click', () => popup.remove());
}

function addLayer() {
  if (props.map.getSource(sourceId)) return;

  props.map.addSource(sourceId, { type: 'geojson', data: buildGeoJson() });

  props.map.addLayer({
    id: haloLayerId,
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'risk'], 0, 14, 100, 42],
      'circle-color': '#ff3347',
      'circle-opacity': 0.16,
      'circle-blur': 0.72,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#ffca28',
      'circle-stroke-opacity': 0.55,
    },
  });

  props.map.addLayer({
    id: labelLayerId,
    type: 'symbol',
    source: sourceId,
    layout: {
      'text-field': ['concat', 'N-1 ', ['get', 'risk'], '%'],
      'text-size': 11,
      'text-offset': [0, -1.8],
      'text-anchor': 'bottom',
    },
    paint: {
      'text-color': '#ffca28',
      'text-halo-color': '#050b14',
      'text-halo-width': 1.6,
    },
  });

  props.map.on('click', haloLayerId, openPopup);
}

function updateLayer() {
  const source = props.map.getSource(sourceId);

  if (source) source.setData(buildGeoJson());
}

onMounted(addLayer);

watch(() => [props.stations, props.topRisk], updateLayer, { deep: true });

onBeforeUnmount(() => {
  if (props.map.getLayer(haloLayerId)) props.map.off('click', haloLayerId, openPopup);

  if (props.map.getLayer(labelLayerId)) props.map.removeLayer(labelLayerId);

  if (props.map.getLayer(haloLayerId)) props.map.removeLayer(haloLayerId);

  if (props.map.getSource(sourceId)) props.map.removeSource(sourceId);
});
</script>
