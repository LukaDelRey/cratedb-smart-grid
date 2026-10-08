<template>
  <q-card
    bordered
    class="scada-card top-risk-card no-wrap column"
    flat
    style="height: 316px"
    :class="{ 'q-pr-sm': !expanded }"
  >
    <q-card-section
      class="top-risk-header items-center justify-between q-py-sm q-px-md row no-wrap"
      style="min-height: 52px"
    >
      <div>
        <div class="section-kicker-light text-caption text-weight-bold text-uppercase">
          {{ t('dashboard.topRiskSubstations') }}
        </div>
      </div>

      <q-btn
        class="top-risk-action q-py-xs q-px-sm"
        color="cyan"
        dense
        flat
        style="min-height: 24px; font-size: 10px"
        :disable="!hasHiddenStations || !store.currentAlarmCount"
        :label="actionLabel"
        @click.stop="expanded = !expanded"
      />
    </q-card-section>

    <q-card-section
      class="top-risk-body q-pt-none q-pb-sm q-px-md overflow-hidden q-py-sm"
      style="min-height: 0"
      :class="{ 'top-risk-body--expanded': expanded }"
    >
      <SidebarEmptyState
        v-if="!store.currentAlarmCount"
        :loading="store.loading"
        :icon="store.stations.length ? 'check_circle_outline' : 'sensors_off'"
        :color="store.stations.length ? 'positive' : 'blue-grey-4'"
        :message="
          t(
            store.loading
              ? 'dashboard.forecastLoading'
              : store.stations.length
                ? 'dashboard.noRegionAlarms'
                : 'regions.noCountryStations',
          )
        "
        style="min-height: 180px"
      />
      <div
        v-for="station in store.currentAlarmCount ? displayStations : []"
        class="top-risk-row cursor-pointer items-center scada-gap-8 q-py-xs q-px-none no-outline"
        role="button"
        style="
          min-height: 28px;
          display: grid;
          grid-template-columns: 22px minmax(92px, 1fr) minmax(68px, 0.8fr) 34px;
          transition:
            background 0.16s ease,
            border-color 0.16s ease;
        "
        tabindex="0"
        :key="station.id"
        @click="selectStation(station.id)"
        @keydown.enter.prevent="selectStation(station.id)"
        @keydown.space.prevent="selectStation(station.id)"
      >
        <div
          style="width: 18px; height: 18px"
          :class="['risk-rank', station.level]"
        >
          <q-icon
            size="13px"
            :name="station.icon"
          />
        </div>

        <div class="risk-asset q-pl-sm">
          <strong
            class="block overflow-hidden text-no-wrap text-caption"
            style="min-width: 0; line-height: 1.12"
          >
            {{ station.id }}
          </strong>

          <span
            class="block overflow-hidden text-no-wrap q-mt-xs"
            style="min-width: 0; font-size: 10px; line-height: 1.1"
          >
            {{ station.name }}
          </span>
        </div>

        <div
          class="risk-progress overflow-hidden"
          style="height: 5px"
        >
          <span
            class="block full-height border-radius-inherit"
            :style="{ width: `${station.risk}%` }"
          />
        </div>

        <b class="text-weight-medium text-right text-caption">{{ station.risk }}%</b>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
// Keep component selector isolation for the shared stylesheet.
defineOptions({ __scopeId: 'data-v-ui-ec93d302' });

import SidebarEmptyState from './SidebarEmptyState.vue';
import { computed, ref } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from '../../../i18n';
import { useSensorStore } from '../../../stores/sensorStore';

const emit = defineEmits(['select-station']);

const { t } = useI18n();

const props = defineProps({
  stations: {
    type: Array as PropType<any[]>,
    default: () => [],
  },
});

const store = useSensorStore();

const expanded = ref(false);

const enrichedStations = computed(() =>
  props.stations.map((station) => {
    const level = station.risk >= 70 ? 'critical' : station.risk >= 40 ? 'warning' : 'normal';

    return {
      ...station,
      level,
      icon: level === 'critical' ? 'priority_high' : level === 'warning' ? 'bolt' : 'check',
    };
  }),
);

const collapsedLimit = 6;

const hasHiddenStations = computed(() => enrichedStations.value.length > collapsedLimit);

const displayStations = computed(() =>
  expanded.value ? enrichedStations.value : enrichedStations.value.slice(0, collapsedLimit),
);

const actionLabel = computed(() =>
  expanded.value ? t('dashboard.showLess') : t('dashboard.viewAll'),
);

function selectStation(stationId) {
  emit('select-station', stationId);
}
</script>
