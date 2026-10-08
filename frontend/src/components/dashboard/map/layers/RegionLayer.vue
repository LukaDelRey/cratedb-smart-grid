<template><div /></template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, watch } from 'vue';
import mapboxgl from 'mapbox-gl';
import { useRouter } from 'vue-router';
import type { Map as MapboxMap, MapLayerMouseEvent } from 'mapbox-gl';
import { useI18n } from '../../../../i18n';
import { useSensorStore } from '../../../../stores/sensorStore';
import {
  displayRegions,
  selectedCountry,
  selectedScopeName,
  loadRegionBoundaries,
} from '../../../../stores/regionPreferences';

const props = defineProps<{ map: MapboxMap }>();
const store = useSensorStore();
const router = useRouter();
const { t, language } = useI18n();
const statistics = computed(() => store.regionStatistics);
const sourceId = 'regions-source';
const fillId = 'regions-fill';
const borderId = 'regions-border';
const labelsId = 'regions-labels';
let popup: mapboxgl.Popup | null = null;
let popupId: string | null = null;
let hoveredId: string | null = null;
const appliedStates = new Map<string, string>();

function countryName(code: string) {
  return code === selectedCountry.value ? selectedScopeName(language.value) : code;
}
function popupContent(id: string) {
  const feature = displayRegions.value.features.find((item) => item.properties.id === id);
  const container = document.createElement('div');
  container.className = 'scada-popup scada-map-popup region-map-popup';
  if (!feature) return container;
  const heading = document.createElement('h3');
  heading.textContent = feature.properties.name;
  const head = document.createElement('div');
  head.className = 'popup-head';
  const close = document.createElement('button');
  close.className = 'popup-close';
  close.type = 'button';
  close.setAttribute('aria-label', t('regions.close'));
  close.textContent = '×';
  close.addEventListener('click', () => popup?.remove());
  head.append(heading, close);
  container.append(head);
  const subtitle = document.createElement('p');
  subtitle.textContent =
    countryName(feature.properties.country) +
    (feature.properties.custom ? ' · ' + t('regions.custom') : '');
  subtitle.className = 'region-country-label';
  container.append(subtitle);
  const stats = statistics.value.find((item) => item.id === id);
  if (!stats) {
    const message = document.createElement('p');
    message.textContent = t('regions.otherCountry');
    container.append(message);
    return container;
  }
  const grid = document.createElement('div');
  grid.className = 'popup-grid two-col';
  for (const [label, value, tone] of [
    [t('dashboard.normal'), stats.normal, 'normal'],
    [t('dashboard.warningLabel'), stats.warning, 'warning'],
    [t('dashboard.critical'), stats.critical, 'critical'],
    [t('dashboard.offlineLabel'), stats.offline, 'offline'],
  ]) {
    const row = document.createElement('div');
    const labelElement = document.createElement('span');
    labelElement.textContent = String(label);
    const valueElement = document.createElement('b');
    valueElement.className = String(tone);
    valueElement.textContent = String(value);
    row.append(labelElement, valueElement);
    grid.append(row);
  }
  container.append(grid);
  const details = document.createElement('div');
  details.className = 'popup-grid region-popup-rows';
  for (const [label, value] of [
    [
      t('regions.load'),
      (stats.loadKW / 1000).toLocaleString(language.value, { maximumFractionDigits: 2 }) + ' MW',
    ],
    [t('regions.activeConditions'), `${stats.alarms + stats.warnings}`],
  ]) {
    const row = document.createElement('div');
    const title = document.createElement('span');
    title.textContent = label;
    const number = document.createElement('b');
    number.textContent = value;
    row.append(title, number);
    details.append(row);
  }
  container.append(details);
  const link = document.createElement('a');
  const path = '/regions/' + encodeURIComponent(id);
  link.className = 'popup-link';
  link.href = router.resolve(path).href;
  link.textContent = t('dashboard.openRegionTwin') + ' →';
  link.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void router.push(path);
  });
  container.append(link);
  return container;
}
function updateStatistics() {
  if (!props.map.getSource(sourceId)) return;
  for (const stats of statistics.value) {
    const affected = stats.warning + stats.critical;
    const level =
      affected >= 5 && affected >= stats.stations.length / 2
        ? 'critical'
        : affected > 0
          ? 'warning'
          : stats.stations.length
            ? 'normal'
            : 'empty';
    const signature = stats.stations.length + ':' + level;
    if (appliedStates.get(stats.id) !== signature) {
      props.map.setFeatureState(
        { source: sourceId, id: stats.id },
        { count: stats.stations.length, level },
      );
      appliedStates.set(stats.id, signature);
    }
  }
  if (popup && popupId) popup.setDOMContent(popupContent(popupId));
}
function updateRegions() {
  appliedStates.clear();
  popup?.remove();
  popup = null;
  popupId = null;
  props.map.getSource<mapboxgl.GeoJSONSource>(sourceId)?.setData(displayRegions.value);
  props.map.setFilter('regions-selected-border', ['==', ['get', 'country'], selectedCountry.value]);
  props.map.setFilter(labelsId, ['==', ['get', 'country'], selectedCountry.value]);
  // Feature state is applied again after Mapbox finishes replacing source data.
  updateStatistics();
}
function sourceLoaded(event: mapboxgl.MapSourceDataEvent) {
  if (event.sourceId === sourceId && event.isSourceLoaded && event.sourceDataType !== 'visibility')
    updateStatistics();
}
function openPopup(event: MapLayerMouseEvent) {
  // Asset clicks take priority over the polygon underneath them.
  const assetLayers = [
    'substations-ring',
    'substations-dots',
    'substations-source-clusters',
    'transformers-ring',
  ].filter((id) => props.map.getLayer(id));
  if (
    assetLayers.length &&
    props.map.queryRenderedFeatures(event.point, { layers: assetLayers }).length
  )
    return;
  const feature = event.features?.[0];
  if (!feature || feature.properties?.country !== selectedCountry.value) return;
  popup?.remove();
  popupId = String(feature.properties?.id);
  popup = new mapboxgl.Popup({ maxWidth: '320px', offset: 18, closeButton: false })
    .setLngLat(event.lngLat)
    .setDOMContent(popupContent(popupId))
    .addTo(props.map);
}
function hover(event: MapLayerMouseEvent) {
  if (hoveredId) props.map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
  hoveredId = String(event.features?.[0]?.properties?.id || '');
  if (hoveredId) props.map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: true });
  props.map.getCanvas().style.cursor = 'pointer';
}
function leave() {
  if (hoveredId && props.map.getSource(sourceId))
    props.map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
  hoveredId = null;
  props.map.getCanvas().style.cursor = '';
}
onMounted(() => {
  void loadRegionBoundaries();
  props.map.addSource(sourceId, {
    type: 'geojson',
    data: displayRegions.value,
    attribution:
      '<a href="https://www.geoboundaries.org/">geoBoundaries gbOpen</a> | <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>',
  });
  const before = props.map.getStyle().layers?.find((layer) => layer.type === 'symbol')?.id;
  props.map.addLayer(
    {
      id: fillId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': [
          'case',
          ['!=', ['get', 'country'], selectedCountry.value],
          '#62788c',
          [
            'match',
            ['feature-state', 'level'],
            'critical',
            '#ff3347',
            'warning',
            '#ffad2f',
            'normal',
            '#71f23f',
            '#40c4ff',
          ],
        ],
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          0.24,
          ['==', ['get', 'country'], selectedCountry.value],
          0.12,
          0.035,
        ],
      },
    },
    before,
  );
  props.map.addLayer(
    {
      id: borderId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#8da6ba',
        'line-width': 0.8,
        'line-opacity': 0.35,
      },
    },
    before,
  );
  props.map.addLayer(
    {
      id: 'regions-selected-border',
      type: 'line',
      source: sourceId,
      filter: ['==', ['get', 'country'], selectedCountry.value],
      paint: {
        'line-color': '#40c4ff',
        'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2.5, 1.3],
        'line-opacity': 0.8,
      },
    },
    before,
  );
  props.map.addLayer(
    {
      id: labelsId,
      type: 'symbol',
      source: sourceId,
      minzoom: 6,
      filter: ['==', ['get', 'country'], selectedCountry.value],
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 11,
        'text-max-width': 12,
      },
      paint: { 'text-color': '#bcd3e3', 'text-halo-color': '#050b14', 'text-halo-width': 1.5 },
    },
    before,
  );
  props.map.on('click', fillId, openPopup);
  props.map.on('mousemove', fillId, hover);
  props.map.on('mouseleave', fillId, leave);
  props.map.on('sourcedata', sourceLoaded);
  updateStatistics();
});
watch(displayRegions, updateRegions);
watch(selectedCountry, () => {
  if (!props.map.getLayer(fillId)) return;
  props.map.setPaintProperty(fillId, 'fill-color', [
    'case',
    ['!=', ['get', 'country'], selectedCountry.value],
    '#62788c',
    [
      'match',
      ['feature-state', 'level'],
      'critical',
      '#ff3347',
      'warning',
      '#ffad2f',
      'normal',
      '#71f23f',
      '#40c4ff',
    ],
  ]);
  props.map.setPaintProperty(fillId, 'fill-opacity', [
    'case',
    ['boolean', ['feature-state', 'hover'], false],
    0.24,
    ['==', ['get', 'country'], selectedCountry.value],
    0.12,
    0.035,
  ]);
});
watch(statistics, updateStatistics);
watch(language, () => {
  if (popup && popupId) popup.setDOMContent(popupContent(popupId));
});
onBeforeUnmount(() => {
  popup?.remove();
  leave();
  props.map.off('click', fillId, openPopup);
  props.map.off('mousemove', fillId, hover);
  props.map.off('mouseleave', fillId, leave);
  props.map.off('sourcedata', sourceLoaded);
  for (const id of [labelsId, 'regions-selected-border', borderId, fillId])
    if (props.map.getLayer(id)) props.map.removeLayer(id);
  if (props.map.getSource(sourceId)) props.map.removeSource(sourceId);
});
</script>

<style>
.scada-map-popup.region-map-popup .region-country-label {
  color: #c1dce9;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.03em;
  margin: 0 0 12px;
}
.scada-map-popup.region-map-popup b.offline {
  color: #a8b6c4;
}
.region-map-popup {
  min-width: 260px;
}
.scada-map-popup.region-map-popup .popup-head {
  align-items: flex-start;
}
.scada-map-popup.region-map-popup h3 {
  line-height: 1.4;
  margin-right: 12px;
}
.scada-map-popup.region-map-popup .region-popup-rows {
  display: grid;
  grid-template-columns: 1fr;
  gap: 5px;
  margin: 8px 0 12px;
}
.scada-map-popup.region-map-popup .region-popup-rows div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.055);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.025);
}
</style>
