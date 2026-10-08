<template>
  <div />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue';
import type { PropType } from 'vue';
import { useRouter } from 'vue-router';
import mapboxgl from 'mapbox-gl';
import { addMarkerClusters } from '../markerClusters';
import { useI18n } from '../../../../i18n';

const props = defineProps({
  clustering: { type: Boolean, default: false },
  map: { type: Object as PropType<any>, required: true },
  transformers: { type: Array as PropType<any[]>, default: () => [] },
  visibleStatuses: {
    type: Array as PropType<any[]>,
    default: () => ['normal', 'warning', 'critical', 'offline'],
  },
});

const { t } = useI18n();

const router = useRouter();

const sourceId = 'transformers-source';

const glowLayerId = 'transformers-glow';

const ringLayerId = 'transformers-ring';

const coreLayerId = 'transformers-core';

const iconLayerId = 'transformers-icon';

let removeClusters = () => {};

let activePopup = null;

let activePopupId = null;

const statusColor = [
  'match',
  ['get', 'status'],
  'critical',
  '#ff3347',
  'warning',
  '#ffad2f',
  'offline',
  '#a8b6c4',
  '#71f23f',
];

function buildGeoJson() {
  return {
    type: 'FeatureCollection',
    features: props.transformers.filter((t) => props.visibleStatuses.includes(t.status)).map((t) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [t.lng, t.lat] as [number, number] },
      properties: {
        id: t.id,
        substation: t.substation,
        load: t.loadPct,
        oilTemp: t.oilTemp,
        windingTemp: t.windingTemp,
        health: t.healthScore,
        risk: t.failureProbability,
        rul: t.rulYears,
        status: t.status,
        alarmSummary: t.alarmSummary || '',
        statusLabel: String(t.status || 'normal').toUpperCase(),
      },
    })),
  };
}

function statusFilter() {
  return ['all', ['!', ['has', 'point_count']], ['in', ['get', 'status'], ['literal', props.visibleStatuses]]];
}

function applyStatusFilter() {
  [glowLayerId, ringLayerId, coreLayerId, iconLayerId].forEach((id) => {
    if (props.map.getLayer(id)) props.map.setFilter(id, statusFilter());
  });
}

function radius(small, large) {
  return ['interpolate', ['linear'], ['zoom'], 6, small, 10, small + 1, 14, large];
}

function popupHtml(p) {
  const riskClass = p.risk >= 70 ? 'critical' : p.risk >= 38 ? 'warning' : 'normal';

  return `
    <div class="scada-popup scada-map-popup">
      <div class="popup-head">
        <div>
          <h3>${p.id} <small class="status-pill ${p.status}">${t(p.statusLabel)}</small></h3>
          <p>${p.substation}</p>
        </div>
        <button class="popup-close" type="button">x</button>
      </div>
      <div class="popup-grid two-col">
        <div><span>${t('dashboard.load')}</span><b><i class="popup-bar"><em style="width:${p.load}%"></em></i>${p.load}%</b></div>
        <div><span>${t('dashboard.oilTemp')}</span><b>${p.oilTemp} C</b></div>
        <div><span>${t('dashboard.windingTemp')}</span><b>${p.windingTemp} C</b></div>
        <div><span>${t('dashboard.health')}</span><b class="${riskClass}">${p.health}%</b></div>
        <div><span>${t('dashboard.rul')}</span><b>${p.rul} ${t('dashboard.years')}</b></div>
        <div><span>${t('dashboard.failureRisk')}</span><b class="${riskClass}">${p.risk}%</b></div>
      </div>
      <div class="popup-ai-block compact">
        <span>${t('dashboard.digitalTwin')}</span>
        <strong>${p.status === 'normal' ? t('dashboard.transformerOperatingNormally') : p.alarmSummary ? t('dashboard.activeAlarmConditions') : t('dashboard.thermalTrendRequiresMonitoring')}</strong>
        <small>${p.alarmSummary || t('dashboard.noImmediateActionRequired')}</small>
      </div>
      <a class="popup-link" data-transformer-link href="/transformers/${p.id}">${t('dashboard.openTransformerTwin')}</a>
    </div>
  `;
}

function openPopup(event) {
  const id = event.features?.[0]?.properties?.id;

  const feature = buildGeoJson().features.find((feature) => feature.properties.id === id);

  if (!feature) return;

  activePopup?.remove();

  const popup = new mapboxgl.Popup({ closeButton: false, maxWidth: '320px', offset: 14 })
    .setLngLat(feature.geometry.coordinates)
    .setHTML(popupHtml(feature.properties))
    .addTo(props.map);

  activePopup = popup;
  activePopupId = id;
  popup.on('close', () => {
    if (activePopup === popup) {
      activePopup = null;
      activePopupId = null;
    }
  });

  bindPopupActions(popup, id);
}

function bindPopupActions(popup, id) {
  popup
    .getElement()
    ?.querySelector('.popup-close')
    ?.addEventListener('click', () => popup.remove());
  popup
    .getElement()
    ?.querySelector('[data-transformer-link]')
    ?.addEventListener('click', (clickEvent) => {
      clickEvent.preventDefault();
      router.push(`/transformers/${id}`);
      popup.remove();
    });
}

function setPointer() {
  props.map.getCanvas().style.cursor = 'pointer';
}

function clearPointer() {
  props.map.getCanvas().style.cursor = '';
}

function addLayer() {
  if (props.map.getSource(sourceId)) return;

  props.map.addSource(sourceId, {
    type: 'geojson', data: buildGeoJson(),
    cluster: props.clustering, clusterMaxZoom: 11, clusterRadius: 50,
  });

  props.map.addLayer({
    id: glowLayerId,
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-radius': radius(5, 11),
      'circle-color': statusColor,
      'circle-opacity': 0.18,
      'circle-blur': 0.75,
    },
  });

  props.map.addLayer({
    id: ringLayerId,
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-radius': radius(3, 7),
      'circle-color': '#050910',
      'circle-opacity': 0.78,
      'circle-stroke-width': 1.6,
      'circle-stroke-color': statusColor,
      'circle-stroke-opacity': 0.92,
    },
  });

  props.map.addLayer({
    id: coreLayerId,
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-radius': radius(1.8, 4.4),
      'circle-color': statusColor,
      'circle-opacity': 0.95,
      'circle-blur': 0.08,
    },
  });

  props.map.addLayer({
    id: iconLayerId,
    type: 'symbol',
    source: sourceId,
    minzoom: 8,
    layout: {
      'text-field': 'T',
      'text-size': ['interpolate', ['linear'], ['zoom'], 8, 6, 14, 9],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': '#02060b',
      'text-halo-color': statusColor,
      'text-halo-width': 0.4,
    },
  });

  if (props.clustering) removeClusters = addMarkerClusters(props.map, sourceId);

  applyStatusFilter();
  props.map.on('click', ringLayerId, openPopup);
  props.map.on('mouseenter', ringLayerId, setPointer);
  props.map.on('mouseleave', ringLayerId, clearPointer);
}

function updateLayer() {
  const source = props.map.getSource(sourceId);

  const data = buildGeoJson();

  if (source) source.setData(data);

  if (activePopup) {
    const feature = data.features.find((feature) => feature.properties.id === activePopupId);

    if (!feature) {
      activePopup.remove();

      return;
    }

    activePopup.setLngLat(feature.geometry.coordinates).setHTML(popupHtml(feature.properties));
    bindPopupActions(activePopup, activePopupId);
  }
}

onMounted(addLayer);

watch(() => props.transformers, updateLayer, { deep: true });

watch(() => props.visibleStatuses, () => {
  updateLayer();
  applyStatusFilter();
}, { deep: true });

onBeforeUnmount(() => {
  activePopup?.remove();
  removeClusters();

  if (props.map.getLayer(ringLayerId)) {
    props.map.off('click', ringLayerId, openPopup);
    props.map.off('mouseenter', ringLayerId, setPointer);
    props.map.off('mouseleave', ringLayerId, clearPointer);
  }

  if (props.map.getLayer(iconLayerId)) props.map.removeLayer(iconLayerId);

  if (props.map.getLayer(coreLayerId)) props.map.removeLayer(coreLayerId);

  if (props.map.getLayer(ringLayerId)) props.map.removeLayer(ringLayerId);

  if (props.map.getLayer(glowLayerId)) props.map.removeLayer(glowLayerId);

  if (props.map.getSource(sourceId)) props.map.removeSource(sourceId);
});
</script>
