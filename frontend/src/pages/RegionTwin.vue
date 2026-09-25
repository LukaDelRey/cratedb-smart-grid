<template>
  <q-layout view="lHh Lpr lFf">
    <Sidebar />

    <q-page-container>
      <q-page class="page-shell">
        <TwinHeader
          title="Region Digital Twin"
          :asset-id="region?.id || regionId"
          :health="region?.healthScore"
          :risk="region?.blackoutRisk"
          icon="public"
        />

        <div class="twin-grid">
          <q-card flat bordered class="scada-card hero-panel">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.regionalPowerFlow') }}</div>
              <div class="section-title">{{ region?.name }}</div>
              <div class="region-flow">
                <div v-for="line in 8" :key="line" />
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="scada-card">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.assets') }}</div>
              <div class="text-h2 text-weight-bold">{{ region?.stations || 0 }}</div>
              <div class="text-blue-grey-3">{{ t('dashboard.substationsInRegion') }}</div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="scada-card">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.weatherCorrelation') }}</div>
              <div class="text-h2 text-weight-bold text-warning">
                {{ store.weather.gridImpact }}%
              </div>
              <div class="text-blue-grey-3">{{ t('dashboard.aiWeatherToGridImpact') }}</div>
            </q-card-section>
          </q-card>

          <AIInsightsPanel class="wide-panel" :insights="store.insights" />
          <LoadForecastCard class="wide-panel" :points="store.forecast" />

          <q-card flat bordered class="scada-card">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.regionalRiskMix') }}</div>
              <div class="maintenance-list">
                <div>
                  <span>{{ t('dashboard.blackout') }}</span>
                  <strong>{{ region?.blackoutRisk || 0 }}%</strong>
                </div>
                <div>
                  <span>{{ t('dashboard.weather') }}</span>
                  <strong>{{ store.weather.gridImpact }}%</strong>
                </div>
                <div>
                  <span>{{ t('dashboard.alarms') }}</span>
                  <strong>{{ region?.activeAlarms || 0 }}</strong>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="scada-card">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.regionalQuickActions') }}</div>
              <div class="action-stack">
                <q-btn dense color="cyan" text-color="black" icon="map" :label="t('dashboard.showOnGis')" to="/" />
                <q-btn dense color="warning" text-color="black" icon="bolt" :label="t('dashboard.balanceLoad')" />
                <q-btn dense color="negative" icon="crisis_alert" :label="t('dashboard.simulateBlackout')" />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSensorStore } from '../stores/sensorStore'
import Sidebar from '../components/dashboard/layout/Sidebar.vue'
import TwinHeader from './TwinHeader.vue'
import AIInsightsPanel from '../components/dashboard/right-sidebar/AIInsightsPanel.vue'
import LoadForecastCard from '../components/dashboard/right-sidebar/LoadForecastCard.vue'
import { useI18n } from '../i18n'

const route = useRoute()
const store = useSensorStore()
const { t } = useI18n()
const regionId = computed(() => {
  const id = route.params.id

  return Array.isArray(id) ? id[0] : id
})

onMounted(() => {
  if(!store.stations.length){
    store.start()
  }
})

const region = computed(() =>
  store.getRegionById(regionId.value)
)
</script>

<style>
.region-flow{
  height:240px;
  position:relative;
  margin-top:18px;
  overflow:hidden;
  border:1px solid rgba(255,255,255,.07);
  border-radius:8px;
  background:rgba(255,255,255,.025);
}

.region-flow div{
  position:absolute;
  left:8%;
  right:8%;
  height:2px;
  background:linear-gradient(90deg, transparent,#40c4ff, transparent);
  animation:flowPulse 2.4s infinite;
}

.region-flow div:nth-child(1){ top:18%; transform:rotate(8deg); }

.region-flow div:nth-child(2){ top:28%; transform:rotate(-4deg); }

.region-flow div:nth-child(3){ top:39%; transform:rotate(12deg); }

.region-flow div:nth-child(4){ top:50%; transform:rotate(-10deg); }

.region-flow div:nth-child(5){ top:61%; transform:rotate(4deg); }

.region-flow div:nth-child(6){ top:72%; transform:rotate(-7deg); }

.region-flow div:nth-child(7){ top:82%; transform:rotate(10deg); }

.region-flow div:nth-child(8){ top:90%; transform:rotate(-3deg); }
</style>
