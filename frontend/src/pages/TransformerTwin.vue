<template>
  <q-layout view="lHh Lpr lFf">
    <Sidebar />

    <q-page-container>
      <q-page class="page-shell">
        <TwinHeader
          title="Transformer Digital Twin"
          :asset-id="transformer?.id || route.params.id"
          :health="transformer?.healthScore"
          :risk="transformer?.failureProbability"
          icon="memory"
        />

        <div class="twin-grid">
          <q-card flat bordered class="scada-card hero-panel">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.liveScada') }}</div>
              <div class="section-title">{{ transformer?.name }}</div>
              <div class="asset-diagram transformer-diagram">
                <div class="coil" />
                <div class="core" />
                <div class="coil" />
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="scada-card">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.health') }}</div>
              <div class="text-h2 text-weight-bold text-positive">
                {{ transformer?.healthScore }}%
              </div>
              <div class="text-blue-grey-3 q-mt-sm">
                {{ t('dashboard.rul') }} {{ transformer?.rulYears }} {{ t('dashboard.years') }} - {{ translateStatus(transformer?.status) }}
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="scada-card">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.failurePrediction') }}</div>
              <div class="text-h2 text-weight-bold text-negative">
                {{ transformer?.failureProbability }}%
              </div>
              <div class="text-blue-grey-3 q-mt-sm">
                {{ t('dashboard.oil') }} {{ transformer?.oilTemp }} C - {{ t('dashboard.winding') }} {{ transformer?.windingTemp }} C
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="scada-card wide-panel">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.dgaAnalytics') }}</div>
              <div class="gas-grid">
                <div v-for="gas in gases" :key="gas.label">
                  <span>{{ gas.label }}</span>
                  <strong>{{ gas.value }} ppm</strong>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="scada-card wide-panel">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.loadHistory') }}</div>
              <div class="trend-lines q-mt-md">
                <div
                  v-for="point in trend"
                  :key="point.label"
                  class="forecast-line"
                >
                  <span class="forecast-line-label">{{ point.label }}</span>
                  <q-linear-progress
                    rounded
                    size="8px"
                    color="cyan"
                    track-color="blue-grey-10"
                    :value="point.value / 100"
                  />
                  <strong>{{ point.value }}%</strong>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="scada-card">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.oilAnalytics') }}</div>
              <div class="maintenance-list">
                <div>
                  <span>{{ t('dashboard.oilQuality') }}</span>
                  <strong>{{ oilQuality }}%</strong>
                </div>
                <div>
                  <span>{{ t('dashboard.moisture') }}</span>
                  <strong>{{ moisture }} ppm</strong>
                </div>
                <div>
                  <span>{{ t('dashboard.thermalFault') }}</span>
                  <strong>{{ thermalFault }}%</strong>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="scada-card">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.operatorActions') }}</div>
              <div class="action-stack">
                <q-btn dense color="cyan" text-color="black" icon="timeline" :label="t('dashboard.openTrends')" />
                <q-btn dense color="warning" text-color="black" icon="build" :label="t('dashboard.createWorkOrder')" />
                <q-btn dense color="negative" icon="crisis_alert" :label="t('dashboard.runFailureSimulation')" />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSensorStore } from '../stores/sensorStore'
import Sidebar from '../components/dashboard/layout/Sidebar.vue'
import TwinHeader from './TwinHeader.vue'
import { useI18n } from '../i18n'

const route = useRoute()
const store = useSensorStore()
const { t, translateStatus } = useI18n()

onMounted(() => {
  if(!store.stations.length){
    store.start()
  }
})

const transformer = computed(() =>
  store.getTransformerById(route.params.id)
)

const trend = computed(() =>
  store.buildTrend(transformer.value?.healthScore || 70)
)

const gases = computed(() => [
  { label:'H2', value:Math.round((transformer.value?.failureProbability || 20) * 1.8) },
  { label:'CH4', value:Math.round((transformer.value?.oilTemp || 40) * 1.2) },
  { label:'C2H2', value:Math.round((transformer.value?.failureProbability || 10) * 0.28) },
  { label:'C2H4', value:Math.round((transformer.value?.loadPct || 30) * 0.64) },
  { label:'CO', value:Math.round((transformer.value?.oilTemp || 40) * 2.1) },
  { label:'CO2', value:Math.round((transformer.value?.loadPct || 40) * 5.8) }
])

const oilQuality = computed(() =>
  Math.max(0, Math.round((transformer.value?.healthScore || 70) - 8))
)

const moisture = computed(() =>
  Math.round((transformer.value?.oilTemp || 40) * 1.6)
)

const thermalFault = computed(() =>
  Math.round((transformer.value?.failureProbability || 15) * 0.82)
)
</script>

<style>
.trend-lines{
  display:grid;
}

.forecast-line{
  display:grid;
  grid-template-columns:38px minmax(0,1fr) 62px;
  align-items:center;
  gap:8px;
  color:#8fa9b8;
  font-size:10px;
}

.forecast-line-label{
  color:#8fa9b8;
}

.forecast-line strong{
  color:#f5fbff;
  font-size:10px;
  text-align:right;
}

.asset-diagram{
  min-height:220px;
  margin-top:18px;
  display:flex;
  align-items:center;
  justify-content:center;
  border:1px solid rgba(255,255,255,.07);
  border-radius:8px;
  background:
    linear-gradient(90deg, rgba(64,196,255,.07) 1px, transparent 1px),
    linear-gradient(0deg, rgba(64,196,255,.07) 1px, transparent 1px);
  background-size:28px 28px;
}

.transformer-diagram{
  gap:18px;
}

.coil{
  width:54px;
  height:154px;
  border:8px solid #40c4ff;
  border-radius:28px;
  box-shadow:0 0 26px rgba(64,196,255,.3);
}

.core{
  width:86px;
  height:190px;
  border-radius:8px;
  background:linear-gradient(180deg,#263645,#101923);
  border:1px solid rgba(255,255,255,.12);
}

.gas-grid{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:10px;
}

.gas-grid div{
  padding:12px;
  border:1px solid rgba(255,255,255,.07);
  border-radius:8px;
  background:rgba(255,255,255,.025);
}

.gas-grid span{
  display:block;
  color:#8fa9b8;
  font-size:11px;
}

.gas-grid strong{
  display:block;
  margin-top:4px;
}

@media (max-width: 760px){
.gas-grid{
    grid-template-columns:1fr;
  }
}
</style>
