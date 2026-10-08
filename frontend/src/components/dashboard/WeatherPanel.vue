<template>
  <q-card
    bordered
    class="scada-card"
    flat
  >
    <q-card-section class="row items-center justify-between q-pb-sm">
      <div>
        <div class="section-kicker text-weight-bold text-uppercase">
          {{ t('dashboard.weatherOverlay') }}
        </div>

        <div class="section-title text-subtitle1 text-weight-bold">
          {{ t('dashboard.gridImpact') }}
        </div>

        <div
          v-if="weather.estimated"
          class="text-caption"
        >
          {{ t('dashboard.weatherEstimate') }}
        </div>
      </div>

      <q-icon
        color="warning"
        name="thunderstorm"
        size="28px"
      />
    </q-card-section>

    <q-card-section class="q-pt-none">
      <div
        class="weather-score scada-gap-12 items-center"
        style="display: grid; grid-template-columns: 76px 1fr"
      >
        <q-circular-progress
          class="text-white text-weight-bold"
          show-value
          size="72px"
          track-color="blue-grey-10"
          :color="impactColor"
          :value="weather.gridImpact"
        >
          {{ weather.gridImpact }}%
        </q-circular-progress>

        <div>
          <div class="text-caption text-blue-grey-3">{{ t('dashboard.ambient') }}</div>

          <div class="text-h5 text-weight-bold">{{ weather.temperatureC }} C</div>

          <div class="text-caption text-blue-grey-4">
            {{ t('dashboard.stormLightningAndWindRiskFusedIntoAiGridImpact') }}
          </div>
        </div>
      </div>

      <div
        class="risk-grid q-mt-md scada-gap-8"
        style="grid-template-columns: repeat(3, 1fr)"
      >
        <div class="q-pa-sm">
          <span
            class="block"
            style="font-size: 11px"
          >
            {{ t('dashboard.wind') }}
          </span>

          <strong class="block q-mt-xs">{{ weather.windRisk }}%</strong>
        </div>

        <div class="q-pa-sm">
          <span
            class="block"
            style="font-size: 11px"
          >
            {{ t('dashboard.lightning') }}
          </span>

          <strong class="block q-mt-xs">{{ weather.lightningRisk }}%</strong>
        </div>

        <div class="q-pa-sm">
          <span
            class="block"
            style="font-size: 11px"
          >
            {{ t('dashboard.storm') }}
          </span>

          <strong class="block q-mt-xs">{{ weather.stormRisk }}%</strong>
        </div>
      </div>

      <q-list
        class="q-mt-sm"
        dense
      >
        <q-item
          v-for="alert in weather.alerts"
          class="scada-list-item q-mb-sm"
          :key="alert.title"
        >
          <q-item-section>
            <q-item-label>{{ translateText(alert.title) }}</q-item-label>

            <q-item-label
              caption
              class="text-blue-grey-3"
            >
              {{ alert.asset }}
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-badge :color="alert.severity === 'CRITICAL' ? 'negative' : 'warning'">
              {{ translateStatus(alert.severity) }}
            </q-badge>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from '../../i18n';
import type { WeatherImpact } from '../../types/dashboard';

const { t, translateText, translateStatus } = useI18n();

const props = defineProps({
  weather: {
    type: Object as PropType<WeatherImpact>,
    required: true,
  },
});

const impactColor = computed(() => {
  if (props.weather.gridImpact >= 70) return 'negative';

  if (props.weather.gridImpact >= 40) return 'warning';

  return 'positive';
});
</script>
