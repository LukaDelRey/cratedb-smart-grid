<template>
  <Teleport
    to="body"
    :disabled="!expanded"
  >
    <q-card
      bordered
      :class="{ 'map-expanded': expanded }"
      class="scada-map-card fit overflow-hidden relative-position"
      flat
      style="min-height: 0"
    >
      <div
        class="fit"
        ref="mapContainer"
      />

      <div class="map-country-status absolute">
        <q-chip
          dark
          dense
          icon="public"
          color="blue-grey-10"
          clickable
          @click="$router.push('/settings?tab=regions')"
        >
          {{ countryName }}
        </q-chip>
        <q-chip
          v-if="regionsLoading"
          dark
          dense
        >
          {{ t('regions.loading') }}
        </q-chip>
        <q-chip
          v-else-if="regionsError"
          dark
          dense
          color="red-10"
          clickable
          @click="loadRegionBoundaries"
        >
          {{ t('regions.loadError') }}
        </q-chip>
        <q-chip
          v-else-if="!store.loading && !store.stations.length"
          dark
          dense
        >
          {{ t('regions.noCountryStations') }}
        </q-chip>
      </div>

      <LayerPanel
        v-if="props.showControls"
        v-model="layers"
        v-model:marker-filters="effectiveMarkerFilters"
        :blackout="store.blackout"
        :marker-counts="markerCounts"
        :summary="store.summary"
        :total-load="store.totalLoadMW"
      />

      <SubstationGroupingControl
        v-if="
          workspacePreferences.showSubstationGrouping && (tableFilterActive || layers.substations)
        "
        v-model="stationDisplay.clustering"
      />
      <MapExpandControl
        v-if="mapLoaded && (workspacePreferences.showMapExpand || expanded)"
        :map="map"
        v-model="expanded"
      />

      <RegionLayer
        v-if="mapLoaded && layers.regions"
        :map="map"
      />

      <RiskLayer
        v-if="mapLoaded && !tableFilterActive && layers.risk"
        :map="map"
        :stations="store.stations"
      />

      <HeatmapLayer
        v-if="mapLoaded && !tableFilterActive && layers.heatmap"
        :map="map"
        :stations="store.stations"
      />

      <WeatherLayer
        v-if="mapLoaded && !tableFilterActive && layers.weather"
        :map="map"
        :regions="store.regions"
        :weather="store.weather"
      />

      <ContingencyLayer
        v-if="mapLoaded && !tableFilterActive && layers.contingency"
        :map="map"
        :stations="store.stations"
        :top-risk="store.topRiskSubstations"
      />

      <PowerLineLayer
        v-if="mapLoaded && !tableFilterActive && layers.lines"
        :lines="store.powerLines"
        :map="map"
        :stations="store.stations"
      />

      <CustomerLayer
        v-if="mapLoaded && !tableFilterActive && layers.customers"
        :customers="store.customers"
        :map="map"
      />

      <TransformerLayer
        v-if="mapLoaded && !tableFilterActive && layers.transformers"
        :map="map"
        :transformers="store.transformers"
        :visible-statuses="visibleStatuses"
      />

      <SubstationLayer
        :key="`SubstationLayer-${stationDisplay.clustering}`"
        :clustering="stationDisplay.clustering"
        v-if="mapLoaded && (tableFilterActive || layers.substations)"
        :focus-station="props.focusStation"
        :map="map"
        :stations="displayedStations"
        :visible-statuses="visibleStatuses"
      />

      <q-card
        v-if="!tableFilterActive && layers.contingency"
        bordered
        class="contingency-panel absolute text-white"
        flat
        style="width: 310px"
      >
        <q-card-section>
          <div class="section-kicker text-weight-bold text-uppercase">
            {{ t('dashboard.n1Contingency') }}
          </div>

          <div class="section-title text-subtitle1 text-weight-bold">{{ contingencyAsset }}</div>

          <div
            class="contingency-grid q-mt-sm scada-gap-8"
            style="grid-template-columns: repeat(3, minmax(0, 1fr))"
          >
            <div class="q-pa-sm">
              <span
                class="block"
                style="font-size: 10px"
              >
                {{ t('dashboard.customers') }}
              </span>

              <strong class="block q-mt-xs">{{ contingencyCustomers }}</strong>
            </div>

            <div class="q-pa-sm">
              <span
                class="block"
                style="font-size: 10px"
              >
                {{ t('dashboard.overloads') }}
              </span>

              <strong class="block q-mt-xs">{{ contingencyOverloads }}</strong>
            </div>

            <div class="q-pa-sm">
              <span
                class="block"
                style="font-size: 10px"
              >
                {{ t('dashboard.risk') }}
              </span>

              <strong class="block q-mt-xs">{{ contingencyRisk }}</strong>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-card>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, onUnmounted, ref, watch } from 'vue';
import mapboxgl from 'mapbox-gl';
import SubstationGroupingControl from './controls/SubstationGroupingControl.vue';
import MapExpandControl from './controls/MapExpandControl.vue';
import { workspacePreferences } from '../../../stores/workspacePreferences';
import { readMapCamera, saveMapCamera } from '../../../services/dashboardMapCamera';
import { useSensorStore } from '../../../stores/sensorStore';
import LayerPanel from './controls/LayerPanel.vue';
import RegionLayer from './layers/RegionLayer.vue';
import PowerLineLayer from './layers/PowerLineLayer.vue';
import SubstationLayer from './layers/SubstationLayer.vue';
import TransformerLayer from './layers/TransformerLayer.vue';
import CustomerLayer from './layers/CustomerLayer.vue';
import RiskLayer from './layers/RiskLayer.vue';
import HeatmapLayer from './layers/HeatmapLayer.vue';
import WeatherLayer from './layers/WeatherLayer.vue';
import ContingencyLayer from './layers/ContingencyLayer.vue';
import { useDashboardMapPreferences } from '../../../composables/useDashboardMapPreferences';
import { useI18n } from '../../../i18n';
import {
  selectedCountry,
  selectedScopeName,
  countryRegions,
  regionsLoading,
  regionsError,
  loadRegionBoundaries,
} from '../../../stores/regionPreferences';
import { collectionBounds } from '../../../services/regionGeometry';
import type {
  DashboardMapLayers,
  FocusStationRequest,
  MarkerFilters,
} from '../../../types/dashboard';

const DEFAULT_LAYERS: DashboardMapLayers = {
  regions: false,
  substations: true,
  transformers: false,
  lines: true,
  customers: false,
  risk: false,
  heatmap: false,
  weather: false,
  contingency: false,
};

const DEFAULT_MARKER_FILTERS: MarkerFilters = {
  normal: true,
  warning: true,
  critical: true,
  offline: true,
};

const props = withDefaults(
  defineProps<{
    showControls?: boolean;
    focusStation?: FocusStationRequest | null;
    stationFilterIds?: string[] | null;
  }>(),
  { showControls: true },
);

const store = useSensorStore();

const { t, language } = useI18n();
const countryName = computed(() => selectedScopeName(language.value));

const mapContainer = ref(null);

const map = ref(null);

const mapLoaded = ref(false);

const expanded = ref(false);
let previousPageScroll = { left: 0, top: 0 };
watch(expanded, async (value) => {
  if (value) previousPageScroll = { left: window.scrollX, top: window.scrollY };
  else {
    await nextTick();
    window.scrollTo({ ...previousPageScroll, behavior: 'instant' });
  }
});
let cameraCountry: string | null = null;
function exitExpanded(event: KeyboardEvent) {
  if (event.key === 'Escape') expanded.value = false;
}
function saveCamera() {
  if (!map.value || !mapLoaded.value || cameraCountry !== selectedCountry.value) return;
  const center = map.value.getCenter();
  saveMapCamera(cameraCountry, {
    center: [center.lng, center.lat],
    zoom: map.value.getZoom(),
    bearing: map.value.getBearing(),
    pitch: map.value.getPitch(),
  });
}

let mapResizeObserver: ResizeObserver | null = null;

const tableFilterActive = computed(() => props.stationFilterIds != null);

const displayedStations = computed(() => {
  if (!tableFilterActive.value) return store.stations;

  const ids = new Set(props.stationFilterIds);

  return store.stations.filter((station) => ids.has(station.station_id));
});

const { layers, markerFilters, stationDisplay } = useDashboardMapPreferences(
  DEFAULT_LAYERS,
  DEFAULT_MARKER_FILTERS,
);

watch(
  () => workspacePreferences.showSubstationGrouping,
  (visible) => {
    if (!visible) stationDisplay.value.clustering = false;
  },
  { immediate: true },
);

const effectiveMarkerFilters = computed({
  get: () => ({
    ...markerFilters.value,
    normal: tableFilterActive.value ? false : markerFilters.value.normal,
  }),
  set: (filters: MarkerFilters) => {
    markerFilters.value = {
      ...filters,
      normal: tableFilterActive.value ? markerFilters.value.normal : filters.normal,
    };
  },
});

const visibleStatuses = computed(() =>
  Object.entries(effectiveMarkerFilters.value)
    .filter(([, visible]) => visible)
    .map(([status]) => status),
);

const markerCounts = computed(() => {
  const counts = { normal: 0, warning: 0, critical: 0, offline: 0 };

  if (!mapLoaded.value) return counts;

  const add = (status: string) => {
    if (
      Object.prototype.hasOwnProperty.call(counts, status) &&
      visibleStatuses.value.includes(status)
    ) {
      counts[status as keyof typeof counts] += 1;
    }
  };

  if (tableFilterActive.value || layers.value.substations) {
    displayedStations.value.forEach((station) => add(store.getStationStatus(station)));
  }

  if (!tableFilterActive.value && layers.value.transformers) {
    store.transformers.forEach((transformer) => add(transformer.status));
  }

  return counts;
});

const primaryContingencyAsset = computed(
  () => store.topRiskSubstations[0]?.id || store.stations[0]?.station_id,
);

const contingencyAsset = computed(
  () => store.contingency?.assetId || primaryContingencyAsset.value || t('dashboard.selectAsset'),
);

const contingencyCustomers = computed(() => store.contingency?.affectedCustomers || 0);

const contingencyOverloads = computed(() => store.contingency?.overloadedAssets || 0);

const contingencyRisk = computed(() => store.contingency?.risk || t('dashboard.pending'));

onMounted(() => {
  void loadRegionBoundaries();
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

  const savedCamera = readMapCamera(selectedCountry.value);
  cameraCountry = savedCamera ? selectedCountry.value : null;
  map.value = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [16.4339, 46.3844],
    zoom: 9.8,
    pitch: 20,
    bearing: 0,
    ...savedCamera,
    antialias: true,
    attributionControl: false,
    collectResourceTiming: false,
    transformRequest: (url) => {
      if (url.includes('events.mapbox.com')) {
        return {
          url: 'data:application/json,{}',
        };
      }

      return {
        url,
      };
    },
  });
  map.value.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
  map.value.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
  window.addEventListener('keydown', exitExpanded);
  map.value.on('moveend', saveCamera);
  mapResizeObserver = new ResizeObserver(() => map.value?.resize());
  mapResizeObserver.observe(mapContainer.value);
  map.value.on('load', () => {
    if (props.focusStation?.id) cameraCountry = selectedCountry.value;
    mapLoaded.value = true;
  });
});

watch(
  () => layers.value.contingency,
  (enabled) => {
    if (enabled && primaryContingencyAsset.value) {
      store.runContingency(primaryContingencyAsset.value);
    }
  },
);

watch(
  () => props.focusStation,
  (request) => {
    if (!request?.id) {
      return;
    }

    layers.value = {
      ...layers.value,
      substations: true,
    };
    markerFilters.value = {
      normal: true,
      warning: true,
      critical: true,
      offline: true,
    };
  },
);

watch([mapLoaded, countryRegions], () => {
  if (!mapLoaded.value || props.focusStation?.id || cameraCountry === selectedCountry.value) return;
  const savedCamera = readMapCamera(selectedCountry.value);
  if (savedCamera) {
    cameraCountry = selectedCountry.value;
    map.value.jumpTo(savedCamera);
    return;
  }
  const bounds = collectionBounds(countryRegions.value);
  if (bounds) {
    cameraCountry = selectedCountry.value;
    map.value.fitBounds(bounds, {
      padding: { top: 70, bottom: 60, left: props.showControls ? 260 : 40, right: 60 },
      duration: 700,
      maxZoom: 10,
    });
  }
});

onBeforeUnmount(saveCamera);
onUnmounted(() => {
  window.removeEventListener('keydown', exitExpanded);
  mapResizeObserver?.disconnect();

  if (map.value) {
    map.value.remove();
  }
});
</script>

<style scoped>
.scada-map-card.map-expanded {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100dvh !important;
  z-index: 10000;
  border-radius: 0;
  border: 0;
}
.map-country-status {
  bottom: 28px;
  left: 14px;
  z-index: 11;
  max-width: calc(100% - 60px);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
</style>
