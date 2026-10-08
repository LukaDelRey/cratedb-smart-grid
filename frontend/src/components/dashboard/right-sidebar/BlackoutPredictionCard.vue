<template>
  <q-card
    bordered
    class="scada-card column no-wrap"
    flat
    style="height: 165px"
  >
    <q-card-section class="row items-center justify-between q-pb-none">
      <div>
        <div class="section-kicker-light text-caption text-weight-bold text-uppercase">
          {{ t('dashboard.blackoutPrediction') }}
        </div>
      </div>

      <div
        v-if="store.stations.length"
        class="text-subtitle1 text-weight-bold"
        :class="riskColor"
      >
        {{ riskLabel }}
      </div>
    </q-card-section>

    <SidebarEmptyState
      v-if="!store.stations.length"
      :loading="store.loading"
      :message="t(store.loading ? 'dashboard.forecastLoading' : 'regions.noCountryStations')"
    />
    <q-card-section
      v-else
      class="no-padding q-pb-md q-px-lg row items-center"
    >
      <div class="col-5 q-pl-lg q-pb-md">
        <div class="row items-center">
          <q-circular-progress
            class="text-white text-weight-bold"
            show-value
            size="90px"
            track-color="blue-grey-10"
            :color="riskColor"
            :thickness="0.15"
            :value="prediction.probability"
          >
            {{ prediction.probability }}%
          </q-circular-progress>
        </div>
      </div>

      <div class="col-7 q-pr-lg q-pb-md">
        <div class="row items-center q-py-xs">
          <div class="col-8">
            <div class="text-caption text-blue-grey-3">{{ t('dashboard.cascadeProbability') }}</div>
          </div>

          <div class="col-4">
            <div class="row justify-end items-center text-caption text-weight-medium">
              {{ prediction.probability }}%
            </div>
          </div>
        </div>

        <div class="row items-center q-py-xs">
          <div class="col-8">
            <div class="text-caption text-blue-grey-3">{{ t('dashboard.affectedAssets') }}</div>
          </div>

          <div class="col-4">
            <div class="row justify-end items-center text-caption text-weight-medium">
              {{ prediction.affectedStations }}
            </div>
          </div>
        </div>

        <div class="row items-center q-py-xs">
          <div class="col-8">
            <div class="text-caption text-blue-grey-3">{{ t('dashboard.expectedWindow') }}</div>
          </div>

          <div class="col-4">
            <div class="row justify-end items-center text-caption text-weight-medium">
              {{ prediction.estimatedMinutes }} min
            </div>
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import SidebarEmptyState from './SidebarEmptyState.vue';
import { useSensorStore } from '../../../stores/sensorStore';
import { computed } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from '../../../i18n';

const { t } = useI18n();
const store = useSensorStore();

const props = defineProps({
  prediction: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
  topRisk: {
    type: Array as PropType<any[]>,
    default: () => [],
  },
});

const riskLabel = computed(() => {
  if (props.prediction.probability >= 70) return t('dashboard.criticalUpper');

  if (props.prediction.probability >= 35) return t('dashboard.warning');

  return t('dashboard.lowRisk');
});

const riskColor = computed(() => {
  if (props.prediction.probability >= 70) return 'red';

  if (props.prediction.probability >= 35) return 'orange';

  return 'green';
});
</script>
