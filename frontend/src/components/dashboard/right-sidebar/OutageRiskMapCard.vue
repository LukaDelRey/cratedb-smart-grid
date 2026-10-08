<template>
  <q-card
    bordered
    class="scada-card outage-risk-card column no-wrap"
    flat
    style="height: 280px"
  >
    <q-card-section
      class="outage-risk-header items-center justify-between q-py-sm q-px-md q-pa-md row no-wrap"
      style="min-height: 52px"
    >
      <div>
        <div class="section-kicker-light text-caption text-weight-bold text-uppercase">
          {{ t('dashboard.outageRiskMap') }}
        </div>
      </div>

      <q-badge
        v-if="mapStations.length"
        class="outage-risk-badge"
        outline
        style="font-size: 10px"
        :color="badgeColor"
      >
        {{ riskState }}
      </q-badge>
    </q-card-section>

    <SidebarEmptyState
      v-if="!mapStations.length"
      :loading="store.loading"
      :message="t(store.loading ? 'dashboard.forecastLoading' : 'regions.noCountryStations')"
    />
    <q-card-section
      v-else
      class="outage-risk-body q-pt-none q-pb-md q-px-md q-pa-md"
    >
      <div
        class="outage-risk-summary scada-gap-6"
        style="grid-template-columns: repeat(3, minmax(0, 1fr))"
      >
        <div class="q-pa-sm">
          <span
            class="block overflow-hidden text-no-wrap text-uppercase"
            style="font-size: 9px; line-height: 1.1"
          >
            {{ t('dashboard.source') }}
          </span>

          <strong
            class="block overflow-hidden text-no-wrap q-mt-xs"
            style="font-size: 11px; line-height: 1.1"
          >
            {{ primaryStation?.id || '--' }}
          </strong>
        </div>

        <div class="q-pa-sm">
          <span
            class="block overflow-hidden text-no-wrap text-uppercase"
            style="font-size: 9px; line-height: 1.1"
          >
            {{ t('dashboard.cascade') }}
          </span>

          <strong
            class="block overflow-hidden text-no-wrap q-mt-xs"
            style="font-size: 11px; line-height: 1.1"
          >
            {{ cascadeRisk }}%
          </strong>
        </div>

        <div class="q-pa-sm">
          <span
            class="block overflow-hidden text-no-wrap text-uppercase"
            style="font-size: 9px; line-height: 1.1"
          >
            {{ t('dashboard.watch') }}
          </span>

          <strong
            class="block overflow-hidden text-no-wrap q-mt-xs"
            style="font-size: 11px; line-height: 1.1"
          >
            {{ exposedCount }}
          </strong>
        </div>
      </div>

      <div class="outage-risk-map">
        <span
          v-for="zone in heatZones"
          class="absolute no-pointer-events"
          style="width: var(--risk-size); height: var(--risk-size)"
          :class="['risk-heat-zone', zone.level]"
          :key="zone.id"
          :style="zone.style"
        />

        <span
          v-for="line in lines"
          :class="['outage-line', line.level]"
          :key="line.id"
          :style="line.style"
        />

        <span
          v-for="node in nodes"
          :class="['outage-node', node.level]"
          :key="node.id"
          :style="node.style"
        >
          <i style="width: 6px; height: 6px" />
        </span>

        <span
          v-for="station in mapStations"
          class="absolute text-weight-bold"
          style="font-size: 9px; line-height: 1"
          :class="['map-label', station.level]"
          :key="`label-${station.id}`"
          :style="station.labelStyle"
        >
          {{ station.id }}
        </span>

        <div
          class="risk-scale"
          style="z-index: 2"
        >
          <span>{{ t('dashboard.high') }}</span>

          <i
            class="full-height"
            style="width: 8px"
          />

          <span>{{ t('dashboard.low') }}</span>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
// Keep component selector isolation for the shared stylesheet.
defineOptions({ __scopeId: 'data-v-ui-e2ed7772' });

import SidebarEmptyState from './SidebarEmptyState.vue';
import { useSensorStore } from '../../../stores/sensorStore';
import { computed } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from '../../../i18n';

const { t } = useI18n();
const store = useSensorStore();

const props = defineProps({
  stations: {
    type: Array as PropType<any[]>,
    default: () => [],
  },
});

const positions = [
  { left: 18, top: 52, labelX: 8, labelY: 37 },
  { left: 34, top: 32, labelX: 27, labelY: 17 },
  { left: 50, top: 57, labelX: 43, labelY: 64 },
  { left: 66, top: 36, labelX: 59, labelY: 21 },
  { left: 82, top: 58, labelX: 75, labelY: 65 },
  { left: 46, top: 78, labelX: 39, labelY: 84 },
];

const mapStations = computed(() =>
  props.stations
    .filter((station) => Number.isFinite(station.risk))
    .slice(0, 6)
    .map((station, index) => ({
      ...station,
      position: positions[index % positions.length],
      labelStyle: {
        left: `${positions[index % positions.length].labelX}%`,
        top: `${positions[index % positions.length].labelY}%`,
      },
      level: riskLevel(station.risk),
    })),
);

const primaryStation = computed(() => mapStations.value[0] || null);

const exposedCount = computed(
  () => mapStations.value.filter((station) => station.risk >= 40).length,
);

const cascadeRisk = computed(() => {
  const risky = mapStations.value.slice(0, 3);

  if (!risky.length) return 0;

  return Math.round(risky.reduce((sum, station) => sum + station.risk, 0) / risky.length);
});

const riskState = computed(() => {
  if (cascadeRisk.value >= 70) return t('dashboard.critical');

  if (cascadeRisk.value >= 40) return t('dashboard.watch');

  return t('dashboard.normal');
});

const badgeColor = computed(() => {
  if (cascadeRisk.value >= 70) return 'negative';

  if (cascadeRisk.value >= 40) return 'warning';

  return 'positive';
});

const nodes = computed(() =>
  mapStations.value.map((station) => ({
    id: station.id,
    level: station.level,
    style: {
      left: `${station.position.left}%`,
      top: `${station.position.top}%`,
    },
  })),
);

const lines = computed(() =>
  mapStations.value.slice(0, -1).map((station, index) => {
    const next = mapStations.value[index + 1];

    const dx = next.position.left - station.position.left;

    const dy = next.position.top - station.position.top;

    const width = Math.sqrt(dx * dx + dy * dy);

    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    return {
      id: `${station.id}-${next.id}`,
      level: riskLevel(Math.max(station.risk, next.risk)),
      style: {
        left: `${station.position.left}%`,
        top: `${station.position.top}%`,
        width: `${width}%`,
        transform: `rotate(${angle}deg)`,
      },
    };
  }),
);

const heatZones = computed(() =>
  mapStations.value
    .filter((station) => station.risk >= 40)
    .slice(0, 4)
    .map((station) => ({
      id: `zone-${station.id}`,
      level: station.level,
      style: {
        left: `${station.position.left}%`,
        top: `${station.position.top}%`,
        '--risk-size': `${Math.max(54, Math.min(96, station.risk + 20))}px`,
      },
    })),
);

function riskLevel(risk) {
  if (risk >= 70) return 'critical';

  if (risk >= 40) return 'warning';

  return 'normal';
}
</script>
