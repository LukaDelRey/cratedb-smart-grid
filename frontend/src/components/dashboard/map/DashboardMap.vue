<template>
  <q-card
    bordered
    class="scada-map-card fit overflow-hidden relative-position"
    flat
    style="min-height: 0"
  >
    <div
      class="fit"
      ref="mapContainer"
    />

    <LayerPanel
      v-if="props.showControls"
      v-model="layers"
      v-model:marker-filters="effectiveMarkerFilters"
      :blackout="store.blackout"
      :marker-counts="markerCounts"
      :summary="store.summary"
      :total-load="store.totalLoadMW"
    />

    <RegionLayer
      v-if="mapLoaded && !tableFilterActive && layers.regions"
      :map="map"
      :regions="store.regions"
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
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import mapboxgl from 'mapbox-gl';
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

const { t } = useI18n();

const mapContainer = ref(null);

const map = ref(null);

const mapLoaded = ref(false);

let mapResizeObserver: ResizeObserver | null = null;

const tableFilterActive = computed(() => props.stationFilterIds != null);

const displayedStations = computed(() => {
  if (!tableFilterActive.value) return store.stations;

  const ids = new Set(props.stationFilterIds);

  return store.stations.filter((station) => ids.has(station.station_id));
});

const { layers, markerFilters } = useDashboardMapPreferences(
  DEFAULT_LAYERS,
  DEFAULT_MARKER_FILTERS,
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
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

  map.value = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [16.4339, 46.3844],
    zoom: 9.8,
    pitch: 20,
    bearing: 0,
    antialias: true,
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
  map.value.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
  mapResizeObserver = new ResizeObserver(() => map.value?.resize());
  mapResizeObserver.observe(mapContainer.value);
  map.value.on('load', () => {
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

onUnmounted(() => {
  mapResizeObserver?.disconnect();

  if (map.value) {
    map.value.remove();
  }
});
</script>
