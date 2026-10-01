<template>
  <q-layout view="lHh Lpr lFf">
    <Sidebar />

    <q-page-container>
      <q-page class="page-shell forecasting-page">
        <Topbar
          @open-topology="topologyOpen = true"
          @open-notifications="router.push('/alarms')"
        />

        <header class="forecasting-header">
          <div>
            <div class="section-kicker">{{ t('dashboard.predictiveGridInsights') }}</div>
            <h1>{{ t('dashboard.aiForecasting') }}</h1>
          </div>
          <q-badge color="positive" class="forecast-live-badge">
            <q-icon name="sensors" size="14px" class="q-mr-xs" />
            {{ t('dashboard.live') }}
          </q-badge>
        </header>

        <section class="forecast-kpi-grid">
          <q-card v-for="metric in metrics" :key="metric.label" flat bordered class="scada-card forecast-kpi-card">
            <q-card-section>
              <span>{{ metric.label }}</span>
              <strong :class="metric.class">{{ metric.value }}<small>{{ metric.unit }}</small></strong>
              <q-icon :name="metric.icon" :color="metric.color" />
            </q-card-section>
          </q-card>
        </section>

        <div class="forecast-workspace">
          <div class="forecast-main-column">
            <LoadForecastCard class="workspace-forecast-chart" :points="store.forecast" />

            <q-card flat bordered class="scada-card forecast-table-card">
              <q-card-section>
                <div class="section-kicker-light">{{ t('dashboard.loadForecast') }}</div>
              </q-card-section>
              <div class="forecast-table-wrap">
                <table class="forecast-table">
                  <thead>
                    <tr>
                      <th>{{ t('dashboard.expectedWindow') }}</th>
                      <th>{{ t('dashboard.load') }}</th>
                      <th>{{ t('dashboard.risk') }}</th>
                      <th>{{ t('dashboard.confidence') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in rows" :key="row.id">
                      <td>{{ row.period }}</td>
                      <td>{{ row.loadMW.toFixed(1) }} MW</td>
                      <td>
                        <div class="risk-meter-cell">
                          <q-linear-progress rounded :value="row.risk / 100" :color="riskColor(row.risk)" track-color="blue-grey-10" />
                          <span>{{ row.risk }}%</span>
                        </div>
                      </td>
                      <td>{{ row.confidence == null ? t('dashboard.heuristicEstimate') : `${row.confidence}%` }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </q-card>
          </div>

          <aside class="forecast-side-column">
            <BlackoutPredictionCard :prediction="store.blackout" :top-risk="store.topRiskSubstations" />
            <AIInsightsPanel :insights="store.insights" />
            <TopRiskSubstationsCard :stations="store.topRiskSubstations" />
          </aside>
        </div>

        <SystemTopologyDialog
          v-model="topologyOpen"
          :topology="store.topology"
          :connection="store.connection"
          :last-error="store.error"
        />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import Sidebar from '../components/dashboard/layout/Sidebar.vue'
import Topbar from '../components/dashboard/layout/Topbar.vue'
import SystemTopologyDialog from '../components/dashboard/system/SystemTopologyDialog.vue'
import AIInsightsPanel from '../components/dashboard/right-sidebar/AIInsightsPanel.vue'
import BlackoutPredictionCard from '../components/dashboard/right-sidebar/BlackoutPredictionCard.vue'
import LoadForecastCard from '../components/dashboard/right-sidebar/LoadForecastCard.vue'
import TopRiskSubstationsCard from '../components/dashboard/right-sidebar/TopRiskSubstationsCard.vue'
import { useForecastWorkspace } from '../composables/useForecastWorkspace'
import { useI18n } from '../i18n'

const router = useRouter()
const { t } = useI18n()
const topologyOpen = ref(false)
const {
  averageConfidence,
  confidenceAvailable,
  averageRisk,
  highRiskWindows,
  peakLoad,
  riskColor,
  rows,
  store
} = useForecastWorkspace()

const metrics = computed(() => [
  { label:t('dashboard.peak'), value:peakLoad.value, unit:' MW', icon:'electric_bolt', color:'cyan', class:'text-cyan' },
  { label:t('dashboard.avgRisk'), value:averageRisk.value, unit:'%', icon:'crisis_alert', color:averageRisk.value >= 50 ? 'negative' : 'warning', class:averageRisk.value >= 50 ? 'text-negative' : 'text-warning' },
  { label:t('dashboard.avgConfidence'), value:confidenceAvailable.value ? averageConfidence.value : t('dashboard.heuristicEstimate'), unit:confidenceAvailable.value ? '%' : '', icon:'verified', color:'positive', class:'text-positive' },
  { label:t('dashboard.highOutageExposure'), value:highRiskWindows.value, unit:'', icon:'schedule', color:'deep-orange', class:'text-deep-orange' }
])

onMounted(() => {
  if(!store.stations.length){
    void store.start()
  }else{
    void store.refreshAll()
  }
})
</script>

<style scoped>
.forecasting-page{
  display:grid;
  grid-template-rows:auto auto auto minmax(0,1fr);
  gap:12px;
  overflow:hidden;
}

.forecasting-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
}

.forecasting-header h1{
  margin:2px 0 0;
  font-size:25px;
  line-height:1.1;
}

.forecast-live-badge{ min-height:24px; padding:4px 9px; }

.forecast-kpi-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:10px;
}

.forecast-kpi-card .q-card__section{
  position:relative;
  min-height:76px;
}

.forecast-kpi-card span{ display:block; color:#8fa9b8; font-size:10px; text-transform:uppercase; }
.forecast-kpi-card strong{ display:block; margin-top:8px; font-size:24px; line-height:1; }
.forecast-kpi-card strong small{ margin-left:3px; font-size:12px; }
.forecast-kpi-card .q-icon{ position:absolute; top:14px; right:14px; font-size:22px; }

.forecast-workspace{
  min-height:0;
  display:grid;
  grid-template-columns:minmax(0,1fr) 350px;
  gap:10px;
}

.forecast-main-column{
  min-height:0;
  display:grid;
  grid-template-rows:286px minmax(0,1fr);
  gap:10px;
}

.workspace-forecast-chart{ width:100%; }
.forecast-table-card{ min-height:0; display:grid; grid-template-rows:auto minmax(0,1fr); }
.forecast-table-wrap{ min-height:0; overflow:auto; }

.forecast-table{
  width:100%;
  border-collapse:collapse;
  color:#dbe9f0;
  font-size:12px;
}

.forecast-table th,
.forecast-table td{
  padding:9px 12px;
  border-bottom:1px solid rgba(255,255,255,.065);
  text-align:left;
}

.forecast-table th{
  position:sticky;
  top:0;
  color:#8fa9b8;
  background:#07111f;
  font-size:10px;
  text-transform:uppercase;
}

.risk-meter-cell{ min-width:160px; display:grid; grid-template-columns:minmax(80px,1fr) 38px; align-items:center; gap:10px; }
.forecast-side-column{ min-height:0; display:grid; align-content:start; gap:10px; overflow:auto; scrollbar-width:none; }
.forecast-side-column::-webkit-scrollbar{ display:none; }

@media (max-width:1200px){
  .forecasting-page{ overflow:auto; }
  .forecast-workspace{ grid-template-columns:1fr; }
  .forecast-side-column{ grid-template-columns:repeat(2,minmax(0,1fr)); overflow:visible; }
}

@media (max-width:820px){
  .forecast-kpi-grid,.forecast-side-column{ grid-template-columns:1fr; }
}
</style>
