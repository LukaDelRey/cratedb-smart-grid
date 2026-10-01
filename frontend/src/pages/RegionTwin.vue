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

          <q-card flat bordered class="scada-card wide-panel">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.gridTopology') }}</div>
              <div class="section-title">Regional N-1 topology</div>
              <div class="regional-topology">
                <div v-for="station in topRegionalStations" :key="station.id">
                  <span>
                    <strong>{{ station.id }}</strong>
                    <small>{{ station.name }}</small>
                  </span>
                  <em :class="station.tone">{{ station.status }}</em>
                  <b>{{ station.load }}%</b>
                  <i><u :style="{ width:`${station.risk}%` }" /></i>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="scada-card">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.blackoutPropagation') }}</div>
              <div class="propagation-chain">
                <div v-for="step in blackoutSteps" :key="step.label">
                  <span>{{ step.index }}</span>
                  <strong>{{ step.label }}</strong>
                  <em :class="step.tone">{{ step.value }}</em>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="scada-card">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.weather') }} / GIS</div>
              <div class="weather-grid">
                <div v-for="item in weatherMetrics" :key="item.label">
                  <q-icon :name="item.icon" :class="item.tone" />
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
            </q-card-section>
          </q-card>

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
                <q-btn dense color="warning" text-color="black" icon="bolt" :label="t('dashboard.balanceLoad')" @click="runRegionalContingency" />
                <q-btn dense color="negative" icon="crisis_alert" :label="t('dashboard.simulateBlackout')" @click="scenarioOpen = true" />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </q-page>
    </q-page-container>

    <ScenarioControlDialog v-model="scenarioOpen" default-type="blackout" />
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useSensorStore } from '../stores/sensorStore'
import { clamp, round1 } from '../utils/numbers'
import Sidebar from '../components/dashboard/layout/Sidebar.vue'
import TwinHeader from './TwinHeader.vue'
import AIInsightsPanel from '../components/dashboard/right-sidebar/AIInsightsPanel.vue'
import LoadForecastCard from '../components/dashboard/right-sidebar/LoadForecastCard.vue'
import ScenarioControlDialog from '../components/scenarios/ScenarioControlDialog.vue'
import { useI18n } from '../i18n'

const route = useRoute()
const store = useSensorStore()
const { t } = useI18n()
const scenarioOpen = ref(false)
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

const topRegionalStations = computed(() =>
  store.stations
    .map(station => {
      const risk = store.getStationRisk(station)
      const load = Math.round(clamp((station.electrical?.current_a || 0) / 5.7, 12, 98))

      return {
        id:station.station_id,
        name:station.station_name || station.station_id,
        risk,
        load,
        status:risk >= 70 ? 'critical' : risk >= 40 ? 'watch' : 'stable',
        tone:risk >= 70 ? 'text-negative' : risk >= 40 ? 'text-warning' : 'text-positive'
      }
    })
    .sort((a,b) => b.risk - a.risk)
    .slice(0, 5)
)

const blackoutSteps = computed(() => {
  const risk = region.value?.blackoutRisk || store.blackout.probability || 0
  const affected = store.blackout.affectedStations || region.value?.stations || 0

  return [
    { index:'01', label:'Peak feeder overload', value:`${Math.round(clamp(risk + 8, 0, 99))}%`, tone:risk > 55 ? 'text-negative' : 'text-warning' },
    { index:'02', label:'Transformer thermal stress', value:`${round1(store.weather.temperatureC)} C`, tone:store.weather.temperatureC > 32 ? 'text-warning' : 'text-positive' },
    { index:'03', label:'Protection coordination margin', value:risk > 60 ? 'narrow' : 'armed', tone:risk > 60 ? 'text-warning' : 'text-positive' },
    { index:'04', label:'Potential affected substations', value:String(affected), tone:affected > 12 ? 'text-negative' : 'text-cyan' }
  ]
})

const weatherMetrics = computed(() => [
  { label:'Ambient', value:`${round1(store.weather.temperatureC)} C`, icon:'device_thermostat', tone:store.weather.temperatureC > 32 ? 'text-warning' : 'text-cyan' },
  { label:'Wind risk', value:`${store.weather.windRisk}%`, icon:'air', tone:store.weather.windRisk > 45 ? 'text-warning' : 'text-positive' },
  { label:'Lightning', value:`${store.weather.lightningRisk}%`, icon:'thunderstorm', tone:store.weather.lightningRisk > 45 ? 'text-negative' : 'text-positive' },
  { label:'Grid impact', value:`${store.weather.gridImpact}%`, icon:'crisis_alert', tone:store.weather.gridImpact > 55 ? 'text-negative' : 'text-warning' }
])

function runRegionalContingency(){
  const assetId = topRegionalStations.value[0]?.id || region.value?.id || regionId.value

  store.runContingency(assetId)
}
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

.regional-topology,
.propagation-chain,
.weather-grid{
  display:grid;
  gap:9px;
  margin-top:14px;
}

.regional-topology div,
.propagation-chain div,
.weather-grid div{
  display:grid;
  align-items:center;
  gap:10px;
  min-height:44px;
  padding:9px 10px;
  border:1px solid rgba(255,255,255,.07);
  border-radius:6px;
  background:rgba(255,255,255,.025);
}

.regional-topology div{
  grid-template-columns:minmax(0,1fr) 74px 48px minmax(120px,.42fr);
}

.regional-topology span,
.regional-topology strong,
.regional-topology small,
.propagation-chain strong,
.weather-grid span{
  display:block;
  min-width:0;
}

.regional-topology strong,
.propagation-chain strong,
.weather-grid strong{
  color:#f5fbff;
  font-size:13px;
}

.regional-topology small{
  color:#9fb5c6;
  font-size:11px;
}

.regional-topology em,
.propagation-chain em{
  font-size:10px;
  font-style:normal;
  font-weight:900;
  text-align:right;
  text-transform:uppercase;
}

.regional-topology b{
  color:#f5fbff;
  font-size:13px;
  text-align:right;
  font-variant-numeric:tabular-nums;
}

.regional-topology i{
  height:7px;
  overflow:hidden;
  border-radius:999px;
  background:rgba(255,255,255,.08);
}

.regional-topology u{
  display:block;
  height:100%;
  border-radius:inherit;
  background:linear-gradient(90deg,#71f23f,#40c4ff,#ffb238,#ff3347);
  box-shadow:0 0 10px rgba(64,196,255,.25);
}

.propagation-chain div{
  grid-template-columns:34px minmax(0,1fr) 78px;
}

.propagation-chain span{
  display:grid;
  place-items:center;
  min-height:26px;
  border-radius:5px;
  color:#40c4ff;
  font-size:11px;
  font-weight:900;
  background:rgba(64,196,255,.08);
}

.weather-grid{
  grid-template-columns:repeat(2,minmax(0,1fr));
}

.weather-grid div{
  justify-items:center;
  min-height:86px;
  text-align:center;
}

.weather-grid .q-icon{
  font-size:24px;
}

.weather-grid span{
  color:#9fb5c6;
  font-size:11px;
}

.weather-grid strong{
  font-size:20px;
  font-variant-numeric:tabular-nums;
}

@media (max-width: 760px){
  .regional-topology div,
  .propagation-chain div,
  .weather-grid{
    grid-template-columns:1fr;
  }

  .regional-topology em,
  .regional-topology b,
  .propagation-chain em{
    text-align:left;
  }
}
</style>
