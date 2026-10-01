<template>
  <q-card flat bordered class="scada-card">
    <q-card-section class="row items-center justify-between q-pb-sm">
      <div>
        <div class="section-kicker">{{ t('dashboard.weatherOverlay') }}</div>
        <div class="section-title">{{ t('dashboard.gridImpact') }}</div>
        <div v-if="weather.estimated" class="text-caption">{{ t('dashboard.weatherEstimate') }}</div>
      </div>

      <q-icon name="thunderstorm" color="warning" size="28px" />
    </q-card-section>

    <q-card-section class="q-pt-none">
      <div class="weather-score">
        <q-circular-progress
          show-value
          size="72px"
          :value="weather.gridImpact"
          :color="impactColor"
          track-color="blue-grey-10"
          class="text-white text-weight-bold"
        >
          {{ weather.gridImpact }}%
        </q-circular-progress>

        <div>
          <div class="text-caption text-blue-grey-3">{{ t('dashboard.ambient') }}</div>
          <div class="text-h5 text-weight-bold">{{ weather.temperatureC }} C</div>
          <div class="text-caption text-blue-grey-4">{{ t('dashboard.stormLightningAndWindRiskFusedIntoAiGridImpact') }}</div>
        </div>
      </div>

      <div class="risk-grid q-mt-md">
        <div>
          <span>{{ t('dashboard.wind') }}</span>
          <strong>{{ weather.windRisk }}%</strong>
        </div>
        <div>
          <span>{{ t('dashboard.lightning') }}</span>
          <strong>{{ weather.lightningRisk }}%</strong>
        </div>
        <div>
          <span>{{ t('dashboard.storm') }}</span>
          <strong>{{ weather.stormRisk }}%</strong>
        </div>
      </div>

      <q-list dense class="q-mt-sm">
        <q-item
          v-for="alert in weather.alerts"
          :key="alert.title"
          class="scada-list-item"
        >
          <q-item-section>
            <q-item-label>{{ translateText(alert.title) }}</q-item-label>
            <q-item-label caption class="text-blue-grey-3">
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
import { computed } from 'vue'
import type { PropType } from 'vue'
import { useI18n } from '../../i18n'
import type { WeatherImpact } from '../../types/dashboard'

const { t, translateText, translateStatus } = useI18n()

const props = defineProps({
  weather:{
    type:Object as PropType<WeatherImpact>,
    required:true
  }
})

const impactColor = computed(() => {
  if(props.weather.gridImpact >= 70) return 'negative'
  if(props.weather.gridImpact >= 40) return 'warning'
  return 'positive'
})
</script>

<style>
.weather-score{
  display:grid;
  grid-template-columns:76px 1fr;
  gap:12px;
  align-items:center;
}

.risk-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:8px;
}

.risk-grid div{
  padding:10px;
  border:1px solid rgba(255,255,255,.07);
  border-radius:8px;
  background:rgba(255,255,255,.025);
}

.risk-grid span{
  display:block;
  color:#8fa9b8;
  font-size:11px;
}

.risk-grid strong{
  display:block;
  margin-top:4px;
}
</style>
