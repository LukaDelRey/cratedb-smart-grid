<template>
  <q-card
    bordered
    class="scada-card insights-panel overflow-hidden no-wrap column"
    flat
    style="height: 436px"
  >
    <q-card-section
      class="row items-center justify-between q-pb-sm q-py-sm q-px-md col-auto"
      style="min-height: 44px"
    >
      <div>
        <div class="section-kicker-light text-caption text-weight-bold text-uppercase">
          {{ t('dashboard.predictiveGridInsights') }}
        </div>
      </div>

      <q-btn
        class="insights-action q-py-xs q-px-sm"
        color="cyan"
        dense
        flat
        style="min-height: 24px; font-size: 10px"
        :disable="!hasHiddenInsights"
        :label="expanded ? t('dashboard.showLess') : t('dashboard.viewAll')"
        @click.stop="expanded = !expanded"
      />
    </q-card-section>

    <SidebarEmptyState
      v-if="!insights.length"
      :loading="store.loading"
      :icon="store.stations.length ? 'check_circle_outline' : 'sensors_off'"
      :color="store.stations.length ? 'positive' : 'blue-grey-4'"
      :message="
        t(
          store.loading
            ? 'dashboard.forecastLoading'
            : store.stations.length
              ? 'dashboard.noThresholdInsights'
              : 'regions.noCountryStations',
        )
      "
    />
    <q-list
      v-else
      class="panel-scroll-list q-pt-sm q-pb-none q-px-sm overflow-auto content-start"
      style="min-height: 0; gap: 8px"
    >
      <q-item
        v-for="item in displayInsights"
        class="scada-list-item q-py-md q-px-sm q-ma-none items-center"
        style="min-height: 0"
        :key="item.id"
      >
        <q-item-section
          avatar
          class="insight-icon-section justify-center items-center"
        >
          <div
            style="width: 32px; height: 32px"
            :class="['insight-icon', insightTone(item.type)]"
          >
            <q-icon
              size="19px"
              :name="severityIcon(item.type)"
            />
          </div>
        </q-item-section>

        <q-item-section
          class="insight-main"
          style="min-width: 0"
        >
          <q-item-label class="text-weight-bold text-caption">
            {{ translateText(item.title) }}
          </q-item-label>

          <q-item-label
            caption
            class="text-blue-grey-3"
          >
            {{ item.assetId }} - {{ translateText(item.impact) }}
          </q-item-label>

          <q-item-label
            caption
            class="text-blue-grey-4"
          >
            {{ translateText(item.recommendation) }}
          </q-item-label>
        </q-item-section>

        <q-item-section side>
          <q-btn
            color="cyan"
            dense
            flat
            icon="push_pin"
            round
            size="13px"
            :aria-label="t('dashboard.showStationOnMap')"
            :disable="!item.assetId"
            @click.stop="emit('focus-station', item.assetId)"
          >
            <q-tooltip>{{ t('dashboard.showStationOnMap') }}</q-tooltip>
          </q-btn>
        </q-item-section>
      </q-item>
    </q-list>
  </q-card>
</template>

<script setup lang="ts">
// Keep component selector isolation for the shared stylesheet.
defineOptions({ __scopeId: 'data-v-ui-5d448f9e' });

import SidebarEmptyState from './SidebarEmptyState.vue';
import { useSensorStore } from '../../../stores/sensorStore';
import { computed, ref } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from '../../../i18n';

const { t, translateText } = useI18n();

const emit = defineEmits<{
  'focus-station': [stationId: string];
}>();

const props = defineProps({
  insights: {
    type: Array as PropType<any[]>,
    default: () => [],
  },
});

const store = useSensorStore();
const expanded = ref(false);

const collapsedLimit = 3;

const hasHiddenInsights = computed(() => props.insights.length > collapsedLimit);

const displayInsights = computed(() =>
  expanded.value ? props.insights : props.insights.slice(0, collapsedLimit),
);

function insightTone(type: string) {
  if (type === 'cooling') return 'thermal';

  if (type === 'maintenance') return 'maintenance';

  if (['voltage', 'frequency', 'harmonics', 'insulation', 'oil', 'discharge'].includes(type))
    return type;

  return 'electrical';
}

function severityIcon(type: string) {
  const icons: Record<string, string> = {
    overload: 'bolt',
    cooling: 'device_thermostat',
    maintenance: 'build',
    voltage: 'electric_meter',
    frequency: 'speed',
    harmonics: 'waves',
    insulation: 'shield',
    oil: 'water_drop',
    discharge: 'flash_on',
  };

  return icons[type] || 'bolt';
}
</script>
