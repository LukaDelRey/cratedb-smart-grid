<template>
  <div class="map-layer-panel-container absolute-full">
    <q-card
      bordered
      class="map-layer-panel absolute text-white q-pa-sm overflow-auto"
      flat
      style="max-height: calc(100% - 108px); pointer-events: auto"
    >
      <q-card-section class="q-pa-sm">
        <div
          class="map-panel-heading text-weight-bold text-uppercase text-caption"
          style="line-height: 1.5"
        >
          {{ t('dashboard.mapLayers') }}
        </div>
      </q-card-section>

      <q-separator />

      <q-list
        class="q-px-xs q-py-sm"
        dense
      >
        <q-item
          v-for="layer in layerItems"
          class="map-layer-item rounded-borders q-px-xs"
          clickable
          tag="label"
          :key="layer.key"
        >
          <q-item-section
            avatar
            class="map-check-section q-pr-sm"
            style="min-width: 30px"
          >
            <q-checkbox
              :model-value="modelValue[layer.key]"
              color="cyan"
              dense
              size="sm"
              @update:model-value="setLayer(layer.key, $event)"
            />
          </q-item-section>

          <q-item-section>
            <q-item-label class="text-caption text-blue-grey-1">
              {{ layer.label }}
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-icon
              color="blue-grey-4"
              size="16px"
              :name="layer.icon"
            />
          </q-item-section>
        </q-item>
      </q-list>

      <q-separator
        class="q-my-xs"
        dark
      />

      <q-card-section class="q-pa-sm">
        <div
          class="map-panel-heading text-blue-grey-3 text-uppercase q-mb-xs text-caption"
          style="line-height: 1.5"
        >
          {{ t('dashboard.legend') }}
        </div>

        <div
          class="legend-filter-list scada-gap-4"
          style="display: grid"
        >
          <button
            v-for="item in legendItems"
            class="items-center q-pa-xs text-left full-width no-border"
            style="min-height: 24px; font-size: 11px"
            type="button"
            :class="['legend-filter-row', { inactive: !markerFilters[item.key] }]"
            :key="item.key"
            @click="toggleMarker(item.key)"
          >
            <span :class="['legend-dot', item.key]" />

            <span>{{ item.label }}</span>

            <q-icon
              size="14px"
              :name="markerFilters[item.key] ? 'visibility' : 'visibility_off'"
            />
          </button>

          <div
            class="legend-flow-row items-center q-pa-xs text-left full-width no-border"
            style="min-height: 24px; font-size: 11px"
          >
            <span
              class="legend-flow-line"
              style="
                width: 14px;
                height: 2px;
                border-radius: 99px;
                background: #42c8ff;
                box-shadow: 0 0 7px rgba(66, 200, 255, 0.8);
              "
            />

            <span>{{ t('dashboard.powerFlow') }}</span>
          </div>
        </div>
      </q-card-section>

      <q-separator
        class="q-my-xs"
        dark
      />

      <q-card-section class="q-pa-sm marker-summary">
        <div
          class="marker-summary-heading row no-wrap items-center justify-between text-uppercase q-mb-sm q-gutter-x-sm q-ml-none text-caption"
          style="color: #b0c6d4; line-height: 1.5"
        >
          <span>{{ t('dashboard.mapMarkerCounts') }}</span>

          <span
            class="marker-live row no-wrap items-center"
            style="font-size: 9px; color: #6cddb3; gap: 5px"
          >
            <span style="width: 5px; height: 5px" />
            {{ t('dashboard.markerLive') }}
          </span>
        </div>

        <div
          class="marker-count-grid"
          style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px"
        >
          <div
            v-for="item in legendItems"
            class="marker-count-tile items-center q-pa-sm"
            style="
              display: grid;
              grid-template-columns: 14px 1fr;
              gap: 6px 8px;
              border: 1px solid rgba(148, 190, 214, 0.12);
              border-radius: 8px;
              background: linear-gradient(
                135deg,
                rgba(148, 190, 214, 0.07),
                rgba(148, 190, 214, 0.02)
              );
            "
            :key="item.key"
          >
            <span :class="['legend-dot', item.key]" />

            <strong
              class="text-weight-bold text-h6"
              style="line-height: 1.1"
            >
              {{ markerCounts[item.key].toLocaleString() }}
            </strong>

            <span
              class="marker-count-label"
              style="grid-column: 1 / -1; font-size: 10px; color: #96adbd"
            >
              {{ item.label }}
            </span>
          </div>
        </div>

        <div class="marker-count-total row no-wrap justify-between items-center q-mt-sm">
          <span>{{ t('dashboard.totalMapMarkers') }}</span>

          <strong class="text-caption">{{ markerTotal.toLocaleString() }}</strong>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from '../../../../i18n';

const { t } = useI18n();

const props = defineProps({
  markerCounts: {
    type: Object as PropType<Record<string, number>>,
    required: true,
  },
  modelValue: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
  markerFilters: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
  summary: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
  blackout: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
  totalLoad: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(['update:modelValue', 'update:markerFilters']);

const layerItems = computed(() => [
  {
    key: 'substations',
    label: t('dashboard.substations'),
    icon: 'hub',
  },
  {
    key: 'transformers',
    label: t('dashboard.transformers'),
    icon: 'memory',
  },
  {
    key: 'lines',
    label: t('dashboard.powerLines'),
    icon: 'timeline',
  },
  {
    key: 'regions',
    label: t('dashboard.regions'),
    icon: 'public',
  },
  {
    key: 'customers',
    label: t('dashboard.customers'),
    icon: 'groups',
  },
  {
    key: 'risk',
    label: t('dashboard.aiRiskLayer'),
    icon: 'psychology',
  },
  {
    key: 'heatmap',
    label: t('dashboard.loadHeatmap'),
    icon: 'blur_on',
  },
  {
    key: 'weather',
    label: t('dashboard.weatherImpact'),
    icon: 'thunderstorm',
  },
  {
    key: 'contingency',
    label: t('dashboard.n1Mode'),
    icon: 'account_tree',
  },
]);

const legendItems = computed(() => [
  { key: 'normal', label: t('dashboard.normal') },
  { key: 'warning', label: t('dashboard.warningLabel') },
  { key: 'critical', label: t('dashboard.critical') },
  { key: 'offline', label: t('dashboard.offlineLabel') },
]);

const markerTotal = computed(() =>
  Object.values(props.markerCounts).reduce((total, count) => total + count, 0),
);

function setLayer(key, value) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  });
}

function toggleMarker(key) {
  emit('update:markerFilters', {
    ...props.markerFilters,
    [key]: !props.markerFilters[key],
  });
}
</script>

<style scoped>
.map-layer-panel-container {
  pointer-events: none;
}
</style>
