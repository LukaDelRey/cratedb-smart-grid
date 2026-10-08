<template>
  <div
    class="grid-health-stack scada-gap-10"
    style="display: grid"
  >
    <q-card
      bordered
      class="health-card grid-health-card text-white"
      flat
    >
      <q-card-section class="grid-health-section q-pa-md">
        <div class="section-kicker-light text-caption text-weight-bold text-uppercase">
          {{ t('dashboard.gridHealth') }}
          <q-icon
            name="info_outline"
            size="12px"
          >
            <q-tooltip>{{ t('dashboard.gridHealthScoreInfo') }}</q-tooltip>
          </q-icon>
        </div>

        <div
          class="grid-health-gauge q-pt-md q-pb-sm q-px-none column no-wrap items-center justify-center"
        >
          <q-circular-progress
            class="text-white text-weight-bold grid-health-progress"
            show-value
            size="112px"
            track-color="blue-grey-10"
            :color="healthColor"
            :thickness="0.12"
            :value="healthScore"
          >
            <div class="grid-health-score column no-wrap items-center justify-center">
              <strong
                class="text-weight-bold text-h4"
                style="line-height: 1"
              >
                {{ healthScore }}
              </strong>

              <span
                class="q-mt-sm text-weight-bold"
                style="font-size: 11px"
                :class="`text-${healthColor}`"
              >
                {{ healthLabel }}
              </span>
            </div>
          </q-circular-progress>
        </div>

        <div
          class="grid-health-stats"
          style="display: grid"
        >
          <div
            v-for="item in statusRows"
            class="grid-health-stat row no-wrap items-center justify-between q-gutter-x-sm q-ml-none"
            style="min-height: 30px; border-top: 1px solid rgba(255, 255, 255, 0.075)"
            :key="item.label"
          >
            <span>{{ item.label }}</span>

            <div :class="`text-${item.color}`">{{ item.value }}</div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card
      bordered
      class="health-card system-health-card text-white"
      flat
    >
      <q-card-section
        class="system-health-section items-center q-pa-md"
        style="min-height: 70px; grid-template-columns: 30px 1fr"
      >
        <q-icon
          color="cyan"
          name="monitor_heart"
          size="28px"
        />

        <div>
          <div class="section-kicker-light text-caption text-weight-bold text-uppercase">
            {{ t('dashboard.systemHealth') }}
          </div>

          <strong
            class="block q-mt-xs"
            style="font-size: 11px; line-height: 1.25"
            :class="`text-${systemColor}`"
          >
            {{ systemLabel }}
          </strong>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
// Keep component selector isolation for the shared stylesheet.
defineOptions({ __scopeId: 'data-v-ui-7a2b9fb1' });

import { computed } from 'vue';
import { gridHealthStatus } from '../../utils/gridHealth';
import type { PropType } from 'vue';
import { useSensorStore } from '../../stores/sensorStore';
import { useI18n } from '../../i18n';

const { t } = useI18n();

const store = useSensorStore();

const props = defineProps({
  summary: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
  stations: {
    type: Array as PropType<any[]>,
    default: () => [],
  },
  connection: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
});

const healthScore = computed(() =>
  Math.max(0, Math.min(100, Math.round(Number(store.currentGridHealth) || 0))),
);

const totalStations = computed(() => Number(props.summary.stations) || props.stations.length);

const offlineCount = computed(
  () => props.stations.filter((station) => station.alarms?.offline).length,
);

const alarmedCount = computed(
  () => props.stations.filter((station) => store.getStationStatus(station) !== 'normal').length,
);

const onlineCount = computed(() => Math.max(0, totalStations.value - offlineCount.value));

const healthColor = computed(() => {
  const status = gridHealthStatus(healthScore.value);

  return status === 'normal' ? 'positive' : status === 'warning' ? 'warning' : 'negative';
});

const healthLabel = computed(() => {
  if (healthColor.value === 'negative') return t('dashboard.critical');

  if (healthColor.value === 'warning') return t('dashboard.watch');

  return t('dashboard.normal');
});

const statusRows = computed(() => [
  {
    label: t('dashboard.totalSubstations'),
    value: formatNumber(totalStations.value),
    color: 'white',
  },
  {
    label: t('dashboard.onlineLabel'),
    value: formatNumber(onlineCount.value),
    color: 'positive',
  },
  {
    label: t('dashboard.offlineLabel'),
    value: formatNumber(offlineCount.value),
    color: 'deep-orange',
  },
  {
    label: t('dashboard.alarmedStations'),
    value: formatNumber(alarmedCount.value),
    color: 'warning',
  },
]);

const systemColor = computed(() => {
  if (!props.connection.websocketConnected && !props.connection.crateConnected) return 'negative';

  if (props.connection.quality === 'degraded') return 'warning';

  return 'positive';
});

const systemLabel = computed(() => {
  if (systemColor.value === 'negative') return t('dashboard.telemetryOffline');

  if (systemColor.value === 'warning') return t('dashboard.degradedOperations');

  return t('dashboard.allSystemsOperational');
});

function formatNumber(value) {
  return Math.round(Number(value) || 0).toLocaleString();
}
</script>
