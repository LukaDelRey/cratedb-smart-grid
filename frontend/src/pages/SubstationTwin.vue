<template>
  <q-layout view="lHh Lpr lFf" class="sst-layout">
    <Sidebar />

    <q-page-container>
      <q-page class="sst-page">
        <header class="sst-topbar">
          <div class="breadcrumbs">
            <span>Grid Digital Twin</span>
            <q-icon name="chevron_right" size="18px" />
            <span>{{ stationId }}</span>
            <q-icon name="chevron_right" size="18px" />
            <strong>{{ activeTabLabel }}</strong>
          </div>

          <div class="topbar-actions">
            <span class="online-pill"><i /> Online</span>
            <span class="clock">{{ lastUpdate }}</span>
            <q-btn flat round dense icon="notifications" color="blue-grey-3">
              <q-badge v-if="activeAlarmCount" color="negative" floating>{{ activeAlarmCount }}</q-badge>
            </q-btn>
            <q-btn flat round dense icon="account_tree" color="blue-grey-3" @click="runStationContingency" />
            <span class="admin">dispatcher</span>
          </div>
        </header>

        <main class="sst-scroll">
          <section class="sst-content" :class="`tab-${activeTab}`">
            <div class="title-row">
              <div>
                <h1>{{ pageTitle }}</h1>
                <div class="asset-meta">
                  {{ stationName }} - 110/20 kV - {{ installedCapacity }} MVA - {{ feeders.length }} feeders
                  <span class="online-badge">{{ operatingMode }}</span>
                </div>
              </div>

              <div class="time-controls">
                <button type="button">{{ activeTab === 'analytics' ? 'Last 7 days' : 'Last 5 minutes' }}</button>
                <button type="button" class="active">Live Data</button>
                <button type="button" aria-label="Refresh" @click="store.refreshAll">
                  <q-icon name="refresh" size="17px" />
                </button>
              </div>
            </div>

            <div class="tab-row">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                type="button"
                :class="{ active:activeTab === tab.key }"
                @click="activeTab = tab.key"
              >
                {{ tab.label }}
              </button>
            </div>

            <template v-if="activeTab === 'overview'">
              <section class="overview-kpi-grid">
                <KpiCard
                  v-for="metric in overviewKpis"
                  :key="metric.label"
                  :metric="metric"
                />
              </section>

              <section class="overview-main-grid">
                <div class="sst-card measurements-card">
                  <h2>Realtime Measurements</h2>
                  <div class="measurement-list">
                    <div v-for="item in measurementRows" :key="item.label">
                      <q-icon :name="item.icon" :class="item.tone" size="18px" />
                      <span>{{ item.label }}</span>
                      <SparkLine class="measurement-spark" :seed="item.spark" :tone="item.tone" />
                      <strong>{{ item.value }}</strong>
                      <em>{{ item.unit }}</em>
                    </div>
                  </div>
                </div>

                <div class="sst-card topology-card">
                  <div class="card-header">
                    <h2>Substation One-Line Twin</h2>
                    <span class="state-chip" :class="riskTone">{{ gridState }}</span>
                  </div>
                  <SubstationDiagram
                    :feeders="feeders"
                    :risk="risk"
                    :load="loadPct"
                    :voltage="voltage"
                  />
                  <div class="diagram-footer">
                    <span>Health <strong class="green">{{ health }} /100</strong></span>
                    <span>Load <strong>{{ loadPct }}%</strong></span>
                    <span>Last Update <strong>{{ lastUpdate }}</strong></span>
                  </div>
                </div>

                <aside class="right-stack">
                  <div class="sst-card risk-card">
                    <h2>Outage Prediction</h2>
                    <div class="risk-gauge" :style="{ '--risk':`${risk}%` }">
                      <strong>{{ risk }}</strong>
                      <span>%</span>
                      <em>{{ riskBand }}</em>
                    </div>
                    <p>{{ riskMessage }}</p>
                    <q-btn
                      unelevated
                      icon="account_tree"
                      label="Run N-1"
                      class="primary-action"
                      @click="runStationContingency"
                    />
                  </div>

                  <div class="sst-card active-alarms-card">
                    <div class="card-header">
                      <h2>Active Alarms</h2>
                      <span class="alarm-count">{{ activeAlarmCount }}</span>
                    </div>
                    <div class="compact-alarm-list">
                      <div v-for="alarm in alarmRows" :key="alarm.label">
                        <q-icon :name="alarm.icon" :class="alarm.severity" />
                        <span>{{ alarm.label }}</span>
                        <small>{{ alarm.time }}</small>
                      </div>
                    </div>
                  </div>
                </aside>
              </section>

              <section class="overview-chart-grid">
                <TrendPanel
                  title="Load & Voltage"
                  :seed="loadPct + 8"
                  legend-a="Load (%)"
                  legend-b="Voltage Stability"
                  :footer="[
                    ['Load', `${loadPct}%`],
                    ['Voltage', `${voltage} kV`],
                    ['Current', `${current} A`],
                    ['PF', powerFactor]
                  ]"
                />
                <TrendPanel
                  title="Thermal & Power Quality"
                  :seed="busbarTemp + 12"
                  legend-a="Busbar Temp"
                  legend-b="THD"
                  :footer="[
                    ['Busbar', `${busbarTemp} C`],
                    ['Ambient', `${ambientTemp} C`],
                    ['THD', `${harmonics} %`],
                    ['Frequency', `${frequency} Hz`]
                  ]"
                />
                <TrendPanel
                  title="AI Forecast (24h)"
                  :seed="loadPct + 18"
                  legend-a="Measured"
                  legend-b="Forecast"
                  :side-stats="[
                    ['Peak', `${forecastPeak}%`],
                    ['Confidence', `${forecastConfidence}%`]
                  ]"
                />
              </section>

              <section class="overview-bottom-grid">
                <FeederTable :rows="feeders" />
                <ProtectionPanel :rows="protectionRows" />
                <ContingencyPanel :contingency="store.contingency" :fallback="fallbackContingency" />
              </section>
            </template>

            <template v-else-if="activeTab === 'digital'">
              <section class="digital-grid">
                <aside class="left-column">
                  <LiveStatePanel :items="liveState" />
                  <BreakerPanel :rows="breakerRows" />
                </aside>

                <div class="sst-card center-diagram-card">
                  <div class="card-header">
                    <h2>Live Substation Model</h2>
                    <div class="legend">
                      <span><i class="actual" />Energized</span>
                      <span><i class="forecast" />Transfer path</span>
                    </div>
                  </div>
                  <SubstationDiagram
                    large
                    :feeders="feeders"
                    :risk="risk"
                    :load="loadPct"
                    :voltage="voltage"
                  />
                </div>

                <aside class="right-column">
                  <ThermalMapPanel :busbar-temp="busbarTemp" :ambient-temp="ambientTemp" :risk="risk" />
                  <SwitchingPanel :steps="switchingSteps" />
                  <EnvironmentPanel :items="environment" />
                </aside>
              </section>

              <section class="digital-bottom-grid">
                <MetricCard title="Digital Twin Core" :metrics="twinCoreMetrics" />
                <MetricCard title="Simulation & Prediction" :metrics="simulationMetrics" />
              </section>
            </template>

            <template v-else-if="activeTab === 'topology'">
              <section class="topology-view-grid">
                <div class="sst-card topology-large-card">
                  <div class="card-header">
                    <h2>Busbar, Transformer & Feeder Topology</h2>
                    <span class="state-chip cyan">Generated from SCADA model</span>
                  </div>
                  <SubstationDiagram
                    large
                    dense
                    :feeders="feeders"
                    :risk="risk"
                    :load="loadPct"
                    :voltage="voltage"
                  />
                </div>

                <aside class="topology-side">
                  <MetricCard title="Topology State" :metrics="topologyMetrics" compact />
                  <CustomerPanel :rows="customerClusters" />
                </aside>
              </section>

              <section class="feeder-card-grid">
                <div v-for="feeder in feeders" :key="feeder.id" class="sst-card feeder-card">
                  <div class="feeder-head">
                    <q-icon name="electrical_services" :class="feeder.tone" />
                    <div>
                      <strong>{{ feeder.name }}</strong>
                      <span>{{ feeder.id }} - {{ feeder.customers }} customers</span>
                    </div>
                    <em :class="feeder.tone">{{ feeder.status }}</em>
                  </div>
                  <div class="feeder-load">
                    <span><i :style="{ width:`${feeder.load}%` }" /></span>
                    <strong>{{ feeder.load }}%</strong>
                  </div>
                </div>
              </section>
            </template>

            <template v-else-if="activeTab === 'analytics'">
              <section class="analytics-kpi-grid">
                <KpiCard
                  v-for="metric in analyticsKpis"
                  :key="metric.label"
                  :metric="metric"
                />
              </section>

              <section class="analytics-chart-grid">
                <TrendPanel title="Substation Load Forecast" :seed="forecastPeak" legend-a="Actual" legend-b="Forecast" />
                <TrendPanel title="Voltage Deviation" :seed="voltageStability" legend-a="RMS Voltage" legend-b="Limit" />
                <TrendPanel title="Alarm Probability" :seed="risk + 22" legend-a="Observed" legend-b="AI Score" />
              </section>

              <section class="analytics-bottom-grid">
                <AnomalyTable :rows="anomalyRows" />
                <InsightsPanel :items="insightRows" />
              </section>
            </template>

            <template v-else-if="activeTab === 'maintenance'">
              <section class="maintenance-grid">
                <MaintenanceForecast :maintenance="maintenance" :health="health" :risk="risk" />
                <AssetHealthPanel :rows="assetHealthRows" />
                <WorkOrderPanel :rows="workOrderRows" />
              </section>

              <section class="inspection-grid">
                <InspectionPanel :rows="inspectionRows" />
                <TrendPanel
                  title="Degradation Projection"
                  :seed="Math.max(30, 100 - health + 35)"
                  legend-a="Observed stress"
                  legend-b="Projected stress"
                  :side-stats="[
                    ['RUL', `${remainingLife} years`],
                    ['Priority', maintenance.priority]
                  ]"
                />
              </section>
            </template>

            <template v-else>
              <section class="events-grid">
                <EventTimeline :rows="eventRows" />
                <ProtectionPanel :rows="protectionRows" />
                <InsightsPanel :items="eventInsightRows" />
              </section>
            </template>
          </section>
        </main>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref } from 'vue'
import type { PropType } from 'vue'
import { useRoute } from 'vue-router'
import { useSensorStore } from '../stores/sensorStore'
import { humanizeAssetKey as alarmLabel } from '../utils/assets'
import { clamp, round1, round2 } from '../utils/numbers'
import Sidebar from '../components/dashboard/layout/Sidebar.vue'
import TransformerTwinMiniChart from '../components/transformer-twin/TransformerTwinMiniChart.vue'

const route = useRoute()
const store = useSensorStore()
const activeTab = ref('overview')

onMounted(() => {
  if(!store.stations.length){
    store.start()
  }
})

const tabs = [
  { key:'overview', label:'Overview' },
  { key:'digital', label:'Digital Twin' },
  { key:'topology', label:'Topology' },
  { key:'analytics', label:'Analytics' },
  { key:'maintenance', label:'Maintenance' },
  { key:'events', label:'Events' }
]

const routeStationId = computed(() => {
  const id = route.params.id

  return Array.isArray(id) ? id[0] : id
})

const station = computed(() =>
  store.getSubstationById(routeStationId.value)
)

const transformers = computed(() =>
  store.transformers.filter(transformer => transformer.substation === station.value?.station_id)
)

const stationId = computed(() => station.value?.station_id || routeStationId.value || 'TS-001')
const stationName = computed(() => station.value?.station_name || `Substation ${stationId.value}`)
const activeTabLabel = computed(() =>
  tabs.find(tab => tab.key === activeTab.value)?.label || 'Overview'
)
const pageTitle = computed(() =>
  activeTab.value === 'digital'
    ? `Digital Twin - ${stationName.value}`
    : activeTab.value === 'analytics'
      ? `Analytics - ${stationName.value}`
      : stationName.value
)

const lastUpdate = computed(() =>
  new Date().toLocaleTimeString('hr-HR', {
    hour:'2-digit',
    minute:'2-digit',
    second:'2-digit',
    hour12:false
  })
)

const health = computed(() => station.value ? store.getStationHealth(station.value) : 91)
const risk = computed(() => station.value ? store.getStationRisk(station.value) : 12)
const activeAlarmCount = computed(() =>
  station.value?.alarms
    ? Object.values(station.value.alarms).filter(Boolean).length
    : 0
)

const voltage = computed(() => round1(station.value?.electrical?.voltage_kv || 20.4))
const current = computed(() => Math.round(station.value?.electrical?.current_a || 354))
const frequency = computed(() => round2(station.value?.electrical?.frequency_hz || 50.01))
const activePowerKw = computed(() => Math.round(station.value?.electrical?.active_power_kw || 7320))
const reactivePower = computed(() => Math.round(station.value?.electrical?.reactive_power_kvar || activePowerKw.value * .16))
const harmonics = computed(() => round1(station.value?.electrical?.harmonics_thd || 2.4))
const busbarTemp = computed(() => round1(station.value?.thermal?.busbar_temp_c || 43.6))
const oilTemp = computed(() => round1(station.value?.thermal?.oil_temp_c || 62.8))
const windingTemp = computed(() => round1(station.value?.thermal?.winding_temp_c || 71.2))
const ambientTemp = computed(() => round1(station.value?.thermal?.ambient_temp_c || store.weather?.temperatureC || 24))
const hydrogen = computed(() => round1(station.value?.oil_gas?.hydrogen_ppm || 11.8))
const activePowerMw = computed(() => round1(activePowerKw.value / 1000))
const transformerCount = computed(() => Math.max(transformers.value.length, 2))
const installedCapacity = computed(() => transformerCount.value * 40)
const loadPct = computed(() =>
  Math.round(clamp(Math.max(
    current.value / 5.7,
    (activePowerMw.value / Math.max(installedCapacity.value * .72, 1)) * 100
  ), 18, 96))
)
const powerFactor = computed(() =>
  round2(activePowerKw.value / Math.max(Math.hypot(activePowerKw.value, reactivePower.value), 1)).toFixed(2)
)
const voltageStability = computed(() =>
  Math.round(clamp(100 - Math.abs(voltage.value - 20.4) * 3.4 - harmonics.value * .55 - risk.value * .05, 88, 99))
)
const forecastPeak = computed(() => Math.round(clamp(loadPct.value + 11 + risk.value * .08, 38, 98)))
const forecastConfidence = computed(() => Math.round(clamp(94 - risk.value * .18, 76, 96)))
const remainingLife = computed(() => Math.max(1, Math.round((health.value / 100) * 24)))
const operatingMode = computed(() => risk.value > 70 ? 'Contingency Watch' : risk.value > 40 ? 'Load Watch' : 'Normal Supply')
const gridState = computed(() => risk.value > 70 ? 'Critical' : risk.value > 40 ? 'Watch' : 'Stable')
const riskBand = computed(() => risk.value > 70 ? 'High' : risk.value > 40 ? 'Medium' : 'Low')
const riskTone = computed(() => risk.value > 70 ? 'red' : risk.value > 40 ? 'yellow' : 'green')
const riskMessage = computed(() =>
  risk.value > 70
    ? 'Cascade exposure is high. Transfer load and inspect protection coordination.'
    : risk.value > 40
      ? 'Thermal and voltage margins are narrowing. Keep feeder transfer plan armed.'
      : 'Substation is operating inside the expected realtime envelope.'
)

const measurementRows = computed(() => [
  { label:'Busbar Voltage', value:voltage.value, unit:'kV', icon:'bolt', tone:'green', spark:67 },
  { label:'Incoming Current', value:current.value, unit:'A', icon:'electrical_services', tone:riskTone.value, spark:82 },
  { label:'Active Power', value:activePowerMw.value, unit:'MW', icon:'offline_bolt', tone:'cyan', spark:48 },
  { label:'Reactive Power', value:round1(reactivePower.value / 1000), unit:'MVAr', icon:'data_usage', tone:'white', spark:38 },
  { label:'Frequency', value:frequency.value, unit:'Hz', icon:'settings_input_component', tone:'green', spark:22 },
  { label:'Busbar Temp', value:busbarTemp.value, unit:'C', icon:'device_thermostat', tone:busbarTemp.value > 70 ? 'yellow' : 'green', spark:71 },
  { label:'Power Quality THD', value:harmonics.value, unit:'%', icon:'show_chart', tone:harmonics.value > 4.5 ? 'yellow' : 'cyan', spark:57 }
])

const overviewKpis = computed(() => [
  { label:'Grid Health', value:health.value, unit:'%', icon:'health_and_safety', tone:riskTone.value === 'green' ? 'green' : riskTone.value },
  { label:'Outage Risk', value:risk.value, unit:'%', icon:'crisis_alert', tone:riskTone.value },
  { label:'Station Load', value:loadPct.value, unit:'%', icon:'speed', tone:loadPct.value > 82 ? 'yellow' : 'cyan' },
  { label:'Voltage Stability', value:voltageStability.value, unit:'%', icon:'ssid_chart', tone:'green' },
  { label:'Power Flow', value:activePowerMw.value, unit:'MW', icon:'schema', tone:'cyan' },
  { label:'Active Alarms', value:activeAlarmCount.value, unit:'', icon:'notifications_active', tone:activeAlarmCount.value ? 'yellow' : 'green' }
])

const analyticsKpis = computed(() => [
  { label:'Anomaly Score', value:Math.round(clamp(risk.value * 1.08 + harmonics.value * 4, 0, 99)), unit:'%', icon:'radar', tone:riskTone.value },
  { label:'Forecast Peak', value:forecastPeak.value, unit:'%', icon:'trending_up', tone:forecastPeak.value > 82 ? 'yellow' : 'cyan' },
  { label:'AI Confidence', value:forecastConfidence.value, unit:'%', icon:'psychology', tone:'green' },
  { label:'Thermal Margin', value:Math.round(clamp(100 - busbarTemp.value, 15, 74)), unit:'C', icon:'thermostat', tone:busbarTemp.value > 70 ? 'yellow' : 'green' },
  { label:'THD', value:harmonics.value, unit:'%', icon:'waves', tone:harmonics.value > 4.5 ? 'yellow' : 'cyan' },
  { label:'RUL', value:remainingLife.value, unit:'yr', icon:'event_available', tone:'green' }
])

const feeders = computed(() => {
  const names = [
    ['F-01','City Center','hospital'],
    ['F-02','Industrial Ring','factory'],
    ['F-03','North Residential','home'],
    ['F-04','East Commercial','storefront'],
    ['F-05','West Backup Tie','swap_horiz'],
    ['F-06','Critical Services','local_hospital']
  ]

  return names.map(([id,name,icon],index) => {
    const swing = Math.sin((index + 1) * 1.17 + loadPct.value * .04) * 7
    const load = Math.round(clamp(loadPct.value + swing + index * 2 - 4, 22, 99))
    const status = load > 88 || (risk.value > 68 && index < 2)
      ? 'Critical'
      : load > 76 || (risk.value > 42 && index === 1)
        ? 'Watch'
        : 'Normal'
    const tone = status === 'Critical' ? 'red' : status === 'Watch' ? 'yellow' : 'green'

    return {
      id,
      name,
      icon,
      load,
      status,
      tone,
      current:Math.round(current.value * (.14 + index * .015)),
      customers:860 + index * 410 + assetSeed.value * 9,
      breaker:index === 4 && risk.value < 42 ? 'Standby' : 'Closed'
    }
  })
})

const protectionRows = computed(() => [
  { zone:'Incoming 110 kV', relay:'Distance + UV', pickup:'0.82 pu', latency:'42 ms', status:risk.value > 70 ? 'Armed' : 'Healthy', tone:risk.value > 70 ? 'yellow' : 'green' },
  { zone:'T1 bay', relay:'Differential 87T', pickup:'2.1 In', latency:'31 ms', status:'Healthy', tone:'green' },
  { zone:'T2 bay', relay:'Overcurrent 50/51', pickup:'1.35 In', latency:'58 ms', status:loadPct.value > 82 ? 'Watch' : 'Healthy', tone:loadPct.value > 82 ? 'yellow' : 'green' },
  { zone:'20 kV busbar', relay:'Arc flash + REF', pickup:'Instant', latency:'18 ms', status:'Healthy', tone:'green' },
  { zone:'Feeder group', relay:'Earth fault 51N', pickup:'0.18 In', latency:'66 ms', status:activeAlarmCount.value ? 'Armed' : 'Healthy', tone:activeAlarmCount.value ? 'yellow' : 'green' }
])

const breakerRows = computed(() => [
  { id:'CB-110-A', label:'Incoming A', state:'Closed', tone:'green' },
  { id:'CB-110-B', label:'Incoming B', state:risk.value > 65 ? 'Ready' : 'Open', tone:risk.value > 65 ? 'yellow' : 'white' },
  { id:'BC-20-1', label:'Bus Coupler', state:loadPct.value > 80 ? 'Closed' : 'Auto', tone:loadPct.value > 80 ? 'yellow' : 'cyan' },
  { id:'TR-01', label:'Transformer Bay 1', state:'Closed', tone:'green' },
  { id:'TR-02', label:'Transformer Bay 2', state:transformerCount.value > 1 ? 'Closed' : 'Standby', tone:'green' }
])

const liveState = computed(() => [
  { label:'Realtime State Engine', value:store.connection?.websocketConnected ? 'Streaming' : 'Polling', icon:'sync_alt', tone:store.connection?.websocketConnected ? 'green' : 'yellow' },
  { label:'CrateDB Twin Store', value:store.connection?.crateConnected ? 'Connected' : 'Degraded', icon:'database', tone:store.connection?.crateConnected ? 'green' : 'yellow' },
  { label:'N-1 Mode', value:risk.value > 40 ? 'Armed' : 'Passive', icon:'account_tree', tone:risk.value > 40 ? 'yellow' : 'cyan' },
  { label:'AI Forecast', value:`${forecastConfidence.value}%`, icon:'psychology', tone:'green' },
  { label:'Protection', value:activeAlarmCount.value ? 'Armed' : 'Healthy', icon:'shield', tone:activeAlarmCount.value ? 'yellow' : 'green' },
  { label:'Power Quality', value:`THD ${harmonics.value}%`, icon:'waves', tone:harmonics.value > 4.5 ? 'yellow' : 'cyan' }
])

const switchingSteps = computed(() => [
  { step:'01', label:'Validate busbar voltage', value:`${voltage.value} kV`, tone:'green' },
  { step:'02', label:'Shift non-critical feeders', value:`${feeders.value[4]?.id || 'F-05'} tie`, tone:loadPct.value > 78 ? 'yellow' : 'cyan' },
  { step:'03', label:'Reserve transformer margin', value:`${Math.max(4, installedCapacity.value - activePowerMw.value)} MVA`, tone:'green' },
  { step:'04', label:'Recalculate cascade exposure', value:`${Math.max(2, risk.value - 11)}%`, tone:riskTone.value }
])

const environment = computed(() => [
  { label:'Ambient', value:`${ambientTemp.value} C`, icon:'device_thermostat' },
  { label:'Storm Risk', value:`${store.weather?.stormRisk || 3}%`, icon:'thunderstorm' },
  { label:'Wind', value:`${store.weather?.windRisk || 8}%`, icon:'air' },
  { label:'Grid Impact', value:`${store.weather?.gridImpact || Math.round(risk.value * .28)}%`, icon:'cell_tower' }
])

const twinCoreMetrics = computed(() => [
  { label:'State Sync', value:store.connection?.websocketConnected ? 99 : 86, unit:'%' },
  { label:'Health', value:health.value, unit:'%' },
  { label:'Lifetime', value:remainingLife.value, unit:'yr' },
  { label:'Thermal Stress', value:Math.round(clamp(busbarTemp.value + oilTemp.value * .18, 18, 96)), unit:'%' },
  { label:'DGA Stress', value:Math.round(clamp(hydrogen.value * 3.2, 4, 92)), unit:'%' },
  { label:'Load Model', value:forecastConfidence.value, unit:'%' },
  { label:'SCADA Quality', value:voltageStability.value, unit:'%' }
])

const simulationMetrics = computed(() => [
  { label:'N-1 Risk', value:Math.round(clamp(risk.value + 9, 0, 99)), unit:'%', danger:risk.value > 50 },
  { label:'Cascade', value:Math.round(clamp(risk.value * .62, 2, 88)), unit:'%', danger:risk.value > 65 },
  { label:'Affected Feeders', value:risk.value > 70 ? 4 : risk.value > 40 ? 2 : 1, unit:'' },
  { label:'Customers', value:customerImpact.value, unit:'' },
  { label:'Transfer Margin', value:Math.round(clamp(100 - loadPct.value + 18, 8, 88)), unit:'%' },
  { label:'Peak +24h', value:forecastPeak.value, unit:'%' },
  { label:'Confidence', value:forecastConfidence.value, unit:'%' }
])

const topologyMetrics = computed(() => [
  { label:'110 kV Bays', value:2, unit:'' },
  { label:'20 kV Feeders', value:feeders.value.length, unit:'' },
  { label:'Tie Capacity', value:Math.round(installedCapacity.value * .34), unit:'MVA' },
  { label:'Reserve', value:Math.round(clamp(100 - loadPct.value, 4, 82)), unit:'%' },
  { label:'Voltage Stability', value:voltageStability.value, unit:'%' },
  { label:'Breaker Ops', value:assetSeed.value % 7 + 3, unit:'/24h' }
])

const customerClusters = computed(() =>
  feeders.value.slice(0, 4).map((feeder,index) => ({
    name:feeder.name,
    type:['Critical','Industrial','Residential','Commercial'][index],
    customers:feeder.customers,
    risk:Math.round(clamp(risk.value + feeder.load * .16 - 9, 2, 96)),
    tone:feeder.tone
  }))
)

const anomalyRows = computed(() => {
  const maxFeederLoad = Math.max(...feeders.value.map(item => item.load))

  return [
    { parameter:'Voltage deviation', current:`${round2(voltage.value - 20.0)} kV`, expected:'19.6 - 20.8 kV', deviation:`${Math.abs(round1((voltage.value - 20.4) * 4.9))}%`, status:voltageStability.value < 93 ? 'Watch' : 'Normal', tone:voltageStability.value < 93 ? 'yellow' : 'green' },
    { parameter:'Feeder load skew', current:`${maxFeederLoad}%`, expected:'< 86%', deviation:`${Math.max(0, maxFeederLoad - 86)}%`, status:maxFeederLoad > 86 ? 'Watch' : 'Normal', tone:maxFeederLoad > 86 ? 'yellow' : 'green' },
    { parameter:'Busbar temperature', current:`${busbarTemp.value} C`, expected:'< 75 C', deviation:`${Math.max(0, round1(busbarTemp.value - 75))} C`, status:busbarTemp.value > 75 ? 'Critical' : 'Normal', tone:busbarTemp.value > 75 ? 'red' : 'green' },
    { parameter:'Harmonics THD', current:`${harmonics.value}%`, expected:'< 4.5%', deviation:`${Math.max(0, round1(harmonics.value - 4.5))}%`, status:harmonics.value > 4.5 ? 'Watch' : 'Normal', tone:harmonics.value > 4.5 ? 'yellow' : 'green' }
  ]
})

const insightRows = computed(() => [
  { title:'AI load forecast', body:`Expected peak reaches ${forecastPeak.value}% during the next 24h window.`, icon:'trending_up', tone:forecastPeak.value > 82 ? 'yellow' : 'cyan', time:'Now' },
  { title:'Topology recommendation', body:`Keep ${feeders.value[4]?.id || 'F-05'} prepared as transfer path for the highest loaded feeder.`, icon:'swap_horiz', tone:'cyan', time:'2 min' },
  { title:'Protection coordination', body:`Relay latency remains below target; ${activeAlarmCount.value ? 'alarm path is armed' : 'no immediate relay action required'}.`, icon:'shield', tone:activeAlarmCount.value ? 'yellow' : 'green', time:'4 min' },
  { title:'Predictive maintenance', body:`Remaining useful life is estimated at ${remainingLife.value} years based on thermal and DGA stress.`, icon:'event_available', tone:'green', time:'8 min' }
])

const eventInsightRows = computed(() => [
  { title:'Event correlation', body:'Alarm engine groups voltage, thermal and feeder symptoms into one operator sequence.', icon:'hub', tone:'cyan', time:'Live' },
  { title:'Suggested action', body:risk.value > 40 ? 'Run switching scenario before peak window.' : 'Keep automatic monitoring active.', icon:'task_alt', tone:risk.value > 40 ? 'yellow' : 'green', time:'Now' }
])

const alarmRows = computed(() => {
  const alarms = Object.entries(station.value?.alarms || {})
    .filter(([,enabled]) => enabled)
    .map(([key],index) => ({
      label:alarmLabel(key),
      icon:key.includes('temp') || key.includes('overheating') ? 'device_thermostat' : key.includes('voltage') ? 'bolt' : 'warning',
      severity:risk.value > 70 ? 'red' : 'yellow',
      time:index ? `${index + 2} min` : 'Now'
    }))

  return alarms.length
    ? alarms
    : [
        { label:'No active SCADA alarms', icon:'check_circle', severity:'green', time:'Now' },
        { label:'Voltage and thermal drift monitor armed', icon:'radar', severity:'cyan', time:'1 min' }
      ]
})

const eventRows = computed(() => {
  const stationEvents = store.eventStream
    .filter(event => !event.assetId || event.assetId === stationId.value)
    .slice(0, 8)
    .map(event => ({
      time:new Date(event.timestamp).toLocaleTimeString('hr-HR', { hour:'2-digit', minute:'2-digit' }),
      source:event.source || 'SCADA',
      event:event.title || 'Realtime event',
      detail:event.description || stationName.value,
      severity:event.severity || 'INFO',
      tone:(event.severity || '').toLowerCase().includes('critical') ? 'red' : (event.severity || '').toLowerCase().includes('warning') ? 'yellow' : 'cyan'
    }))

  return stationEvents.length
    ? stationEvents
    : [
        { time:lastUpdate.value.slice(0,5), source:'SYSTEM', event:'Twin state refreshed', detail:'CrateDB latest state loaded into substation model.', severity:'INFO', tone:'cyan' },
        { time:'14:22', source:'AI', event:'Load forecast updated', detail:`Peak estimate ${forecastPeak.value}% with ${forecastConfidence.value}% confidence.`, severity:'INFO', tone:'green' },
        { time:'14:18', source:'SCADA', event:'Protection heartbeat', detail:'All relay groups responded within target latency.', severity:'INFO', tone:'green' }
      ]
})

const maintenance = computed(() => ({
  open:risk.value > 70 ? 5 : risk.value > 40 ? 3 : 1,
  next:risk.value > 70 ? '24h' : risk.value > 40 ? '7 days' : '30 days',
  priority:risk.value > 70 ? 'Critical' : risk.value > 40 ? 'High' : 'Normal'
}))

const assetHealthRows = computed(() => [
  { asset:'T1 Power Transformer', health:Math.max(54, health.value - 2), stress:Math.round(clamp(oilTemp.value, 22, 96)), tone:health.value < 70 ? 'yellow' : 'green' },
  { asset:'T2 Power Transformer', health:Math.max(58, health.value + 3), stress:Math.round(clamp(windingTemp.value - 6, 22, 96)), tone:'green' },
  { asset:'20 kV Busbar A', health:voltageStability.value, stress:Math.round(clamp(busbarTemp.value, 18, 92)), tone:busbarTemp.value > 70 ? 'yellow' : 'green' },
  { asset:'Protection IED Group', health:Math.round(clamp(97 - activeAlarmCount.value * 4, 72, 99)), stress:activeAlarmCount.value ? 41 : 18, tone:activeAlarmCount.value ? 'yellow' : 'green' },
  { asset:'Battery & DC System', health:95, stress:22, tone:'green' }
])

const workOrderRows = computed(() => [
  { id:'WO-2418', title:'Thermography inspection', owner:'Field crew A', due:maintenance.value.next, status:risk.value > 40 ? 'Open' : 'Planned', tone:risk.value > 40 ? 'yellow' : 'cyan' },
  { id:'WO-2421', title:'Protection settings audit', owner:'Relay engineer', due:'7 days', status:activeAlarmCount.value ? 'Open' : 'Ready', tone:activeAlarmCount.value ? 'yellow' : 'green' },
  { id:'WO-2427', title:'OLTC operations review', owner:'Asset team', due:'30 days', status:'Planned', tone:'green' }
])

const inspectionRows = computed(() => [
  { label:'Inspect infrared hotspots on 20 kV busbar', state:busbarTemp.value > 65 ? 'Required' : 'Watch', tone:busbarTemp.value > 65 ? 'yellow' : 'cyan' },
  { label:'Review feeder imbalance and phase loading', state:loadPct.value > 78 ? 'Required' : 'Normal', tone:loadPct.value > 78 ? 'yellow' : 'green' },
  { label:'Sample oil/DGA on main transformer bank', state:hydrogen.value > 15 ? 'Required' : 'Normal', tone:hydrogen.value > 15 ? 'yellow' : 'green' },
  { label:'Validate UPS and DC battery autonomy', state:'Normal', tone:'green' }
])

const fallbackContingency = computed(() => ({
  risk:risk.value > 50 ? 'ELEVATED' : 'LOW',
  affectedCustomers:customerImpact.value,
  overloadedAssets:feeders.value.filter(feeder => feeder.load > 76).length
}))

const customerImpact = computed(() =>
  feeders.value.reduce((sum,feeder) => sum + (feeder.status === 'Critical' ? feeder.customers : feeder.status === 'Watch' ? Math.round(feeder.customers * .35) : 0), 0)
)

const assetSeed = computed(() => {
  const match = String(stationId.value).match(/(\d+)/)
  return match ? Number(match[1]) : 1
})

function runStationContingency(){
  store.runContingency(stationId.value)
}

const SparkLine = defineComponent({
  name:'SparkLine',
  props:{
    seed:{ type:Number, default:42 },
    tone:{ type:String, default:'green' }
  },
  setup(props){
    const points = computed(() =>
      Array.from({ length:8 },(_,index) => {
        const x = (index / 7) * 64
        const wave = Math.sin(index * .88 + props.seed * .13) * 4.4
        const secondary = Math.cos(index * .57 + props.seed * .07) * 2.7
        const drift = ((props.seed % 19) - 9) * .18
        const value = 10 + wave + secondary + drift + index * .35
        const y = Math.max(3, Math.min(17, value))

        return `${Number(x.toFixed(1))},${Number(y.toFixed(1))}`
      }).join(' ')
    )

    return () => h('svg', { class:'spark-line', viewBox:'0 0 64 20' }, [
      h('path', {
        class:'spark-grid',
        d:'M0 10H64'
      }),
      h('polyline', {
        class:['spark-path', props.tone],
        points:points.value
      })
    ])
  }
})

const KpiCard = defineComponent({
  name:'KpiCard',
  props:{
    metric:{ type:Object as PropType<Record<string, any>>, required:true }
  },
  setup(props){
    return () => h('div', { class:'sst-card kpi-card' }, [
      h('span', { class:['material-icons', props.metric.tone] }, props.metric.icon),
      h('div', [
        h('small', props.metric.label),
        h('strong', [String(props.metric.value), props.metric.unit ? h('em', ` ${props.metric.unit}`) : null])
      ])
    ])
  }
})

const TrendPanel = defineComponent({
  name:'TrendPanel',
  props:{
    title:{ type:String, required:true },
    seed:{ type:Number, default:72 },
    legendA:{ type:String, default:'Actual' },
    legendB:{ type:String, default:'Forecast' },
    footer:{ type:Array as PropType<any[]>, default:() => [] },
    sideStats:{ type:Array as PropType<any[]>, default:() => [] }
  },
  setup(props){
    return () => h('div', { class:'sst-card trend-panel' }, [
      h('div', { class:'card-header' }, [
        h('h2', props.title),
        h('div', { class:'legend' }, [
          h('span', [h('i', { class:'actual' }), props.legendA]),
          h('span', [h('i', { class:'forecast' }), props.legendB])
        ])
      ]),
      h('div', { class:'trend-body' }, [
        h(TransformerTwinMiniChart, { seed:props.seed }),
        props.sideStats.length
          ? h('div', { class:'side-stats' }, props.sideStats.map(stat =>
              h('div', [h('span', stat[0]), h('strong', stat[1])])
            ))
          : null
      ]),
      props.footer.length
        ? h('div', { class:'trend-footer' }, props.footer.map(item =>
            h('div', [h('span', item[0]), h('strong', item[1])])
          ))
        : null
    ])
  }
})

const MetricCard = defineComponent({
  name:'MetricCard',
  props:{
    title:{ type:String, required:true },
    metrics:{ type:Array as PropType<any[]>, default:() => [] },
    compact:{ type:Boolean, default:false }
  },
  setup(props){
    return () => h('div', { class:['sst-card metric-card', { compact:props.compact }] }, [
      h('h2', props.title),
      h('div', { class:'metric-grid' }, props.metrics.map(metric =>
        h('div', [
          h('span', metric.label),
          h('strong', [String(metric.value), metric.unit ? h('em', ` ${metric.unit}`) : null]),
          metric.danger ? h('b', { style:{ width:`${metric.value}%` } }) : null
        ])
      ))
    ])
  }
})

const SubstationDiagram = defineComponent({
  name:'SubstationDiagram',
  props:{
    feeders:{ type:Array as PropType<any[]>, default:() => [] },
    risk:{ type:Number, default:0 },
    load:{ type:Number, default:0 },
    voltage:{ type:Number, default:20.4 },
    large:{ type:Boolean, default:false },
    dense:{ type:Boolean, default:false }
  },
  setup(props){
    const feederLines = computed(() =>
      props.feeders.map((feeder,index) => {
        const x = 120 + index * 112
        return {
          ...feeder,
          x,
          path:`M${x} 178V244`,
          labelY:index % 2 ? 285 : 272
        }
      })
    )

    return () => h('div', { class:['substation-diagram', { large:props.large, dense:props.dense }] }, [
      h('svg', { viewBox:'0 0 820 430', role:'img', 'aria-label':'Substation one-line diagram' }, [
        h('defs', [
          h('linearGradient', { id:'busGlow', x1:'0', x2:'1' }, [
            h('stop', { offset:'0%', 'stop-color':'#38bfff', 'stop-opacity':'.25' }),
            h('stop', { offset:'50%', 'stop-color':'#38bfff' }),
            h('stop', { offset:'100%', 'stop-color':'#71f23f', 'stop-opacity':'.75' })
          ]),
          h('filter', { id:'softGlow', x:'-20%', y:'-20%', width:'140%', height:'140%' }, [
            h('feGaussianBlur', { stdDeviation:'4', result:'blur' }),
            h('feMerge', [
              h('feMergeNode', { in:'blur' }),
              h('feMergeNode', { in:'SourceGraphic' })
            ])
          ])
        ]),
        h('path', { class:'diagram-grid', d:'M40 66H780M40 122H780M40 178H780M40 234H780M40 290H780M40 346H780M96 40V386M208 40V386M320 40V386M432 40V386M544 40V386M656 40V386M768 40V386' }),
        h('path', { class:'incoming-line', d:'M410 30V82' }),
        h('rect', { class:['hv-yard', props.risk > 70 ? 'red' : ''], x:'347', y:'82', width:'126', height:'48', rx:'5' }),
        h('text', { class:'diagram-label', x:'410', y:'112', 'text-anchor':'middle' }, '110 kV GIS'),
        h('path', { class:'transformer-link', d:'M410 130V164' }),
        h('g', { class:'transformer-bank' }, [
          h('circle', { cx:'382', cy:'176', r:'28' }),
          h('circle', { cx:'438', cy:'176', r:'28' }),
          h('text', { class:'diagram-value', x:'410', y:'181', 'text-anchor':'middle' }, '2 x 40 MVA')
        ]),
        h('path', { class:'transformer-link', d:'M410 204V232' }),
        h('path', { class:'busbar bus-a', d:'M82 178H738' }),
        h('path', { class:'busbar bus-b', d:'M82 232H738' }),
        h('text', { class:'diagram-label', x:'82', y:'164' }, `20 kV BUS A ${props.voltage} kV`),
        h('text', { class:'diagram-label', x:'82', y:'258' }, `20 kV BUS B LOAD ${props.load}%`),
        h('path', { class:'coupler', d:'M410 178V232' }),
        h('rect', { class:'breaker', x:'396', y:'196', width:'28', height:'18', rx:'3' }),
        ...feederLines.value.flatMap(feeder => [
          h('path', { class:['feeder-line', feeder.tone], d:feeder.path }),
          h('rect', { class:['breaker', feeder.tone], x:String(feeder.x - 13), y:'196', width:'26', height:'18', rx:'3' }),
          h('circle', { class:['feeder-node', feeder.tone], cx:String(feeder.x), cy:'244', r:'8' }),
          h('path', { class:['feeder-tail', feeder.tone], d:`M${feeder.x - 24} 244H${feeder.x + 24}M${feeder.x} 252V266` }),
          h('text', { class:'diagram-label', x:String(feeder.x), y:String(feeder.labelY), 'text-anchor':'middle' }, feeder.id),
          h('text', { class:'diagram-small', x:String(feeder.x), y:String(feeder.labelY + 17), 'text-anchor':'middle' }, `${feeder.load}%`)
        ]),
        h('path', { class:'tie-line', d:'M684 232C744 254 754 310 708 352' }),
        h('text', { class:'diagram-small cyan', x:'700', y:'374', 'text-anchor':'middle' }, 'Tie path'),
        h('g', { class:'diagram-badges' }, [
          h('rect', { x:'54', y:'318', width:'178', height:'54', rx:'5' }),
          h('text', { class:'diagram-label', x:'70', y:'341' }, 'Protection zones armed'),
          h('text', { class:'diagram-small', x:'70', y:'359' }, '87T / 50-51 / UV / REF'),
          h('rect', { x:'566', y:'318', width:'198', height:'54', rx:'5' }),
          h('text', { class:'diagram-label', x:'582', y:'341' }, 'AI cascade monitor'),
          h('text', { class:'diagram-small', x:'582', y:'359' }, `Risk ${props.risk}% - load flow live`)
        ])
      ])
    ])
  }
})

function simplePanel(name, className, renderContent){
  return defineComponent({
    name,
    props:{
      rows:{ type:Array as PropType<any[]>, default:() => [] },
      items:{ type:Array as PropType<any[]>, default:() => [] },
      steps:{ type:Array as PropType<any[]>, default:() => [] },
      maintenance:{ type:Object as PropType<Record<string, any>>, default:null },
      health:{ type:Number, default:0 },
      risk:{ type:Number, default:0 },
      contingency:{ type:Object as PropType<Record<string, any>>, default:null },
      fallback:{ type:Object as PropType<Record<string, any>>, default:null },
      busbarTemp:{ type:Number, default:44 },
      ambientTemp:{ type:Number, default:24 }
    },
    setup(props){
      return () => h('div', { class:['sst-card', className] }, renderContent(props))
    }
  })
}

const LiveStatePanel = simplePanel('LiveStatePanel', 'live-state-card', props => [
  h('h2', 'Live State Engine'),
  h('div', { class:'status-list' }, props.items.map(item =>
    h('div', { class:'status-row' }, [
      h('span', { class:['material-icons', item.tone] }, item.icon),
      h('span', item.label),
      h('strong', { class:item.tone }, item.value)
    ])
  ))
])

const BreakerPanel = simplePanel('BreakerPanel', 'breaker-card', props => [
  h('h2', 'Breaker State'),
  h('div', { class:'breaker-list' }, props.rows.map(row =>
    h('div', [
      h('span', row.id),
      h('strong', row.label),
      h('em', { class:row.tone }, row.state)
    ])
  ))
])

const FeederTable = simplePanel('FeederTable', 'feeder-table-card', props => [
  h('h2', 'Feeder Telemetry'),
  h('table', { class:'sst-table' }, [
    h('thead', [h('tr', [
      h('th', 'Feeder'), h('th', 'Load'), h('th', 'Current'), h('th', 'Customers'), h('th', 'Breaker'), h('th', 'Status')
    ])]),
    h('tbody', props.rows.map(row =>
      h('tr', [
        h('td', [h('strong', row.id), h('span', row.name)]),
        h('td', `${row.load}%`),
        h('td', `${row.current} A`),
        h('td', row.customers.toLocaleString('en-US')),
        h('td', row.breaker),
        h('td', [h('em', { class:['table-pill', row.tone] }, row.status)])
      ])
    ))
  ])
])

const ProtectionPanel = simplePanel('ProtectionPanel', 'protection-card', props => [
  h('h2', 'Protection & Relay Logic'),
  h('div', { class:'protection-list' }, props.rows.map(row =>
    h('div', [
      h('span', row.zone),
      h('strong', row.relay),
      h('small', `${row.pickup} - ${row.latency}`),
      h('em', { class:row.tone }, row.status)
    ])
  ))
])

const ContingencyPanel = simplePanel('ContingencyPanel', 'contingency-card', props => {
  const data = props.contingency || props.fallback || {}

  return [
    h('h2', 'N-1 Result'),
    h('div', { class:'contingency-score' }, [
      h('strong', data.risk || 'LOW'),
      h('span', 'Contingency exposure')
    ]),
    h('div', { class:'mini-stat-list' }, [
      h('div', [h('span', 'Affected customers'), h('strong', Number(data.affectedCustomers || 0).toLocaleString('en-US'))]),
      h('div', [h('span', 'Overloaded assets'), h('strong', data.overloadedAssets || 0)]),
      h('div', [h('span', 'Recommended action'), h('strong', (data.overloadedAssets || 0) ? 'Transfer load' : 'Monitor')])
    ])
  ]
})

const ThermalMapPanel = simplePanel('ThermalMapPanel', 'thermal-card', props => [
  h('h2', 'Thermal Field'),
  h('div', { class:'thermal-visual', style:{ '--heat':`${Math.min(100, props.busbarTemp + props.risk * .35)}%` } }, [
    h('div', { class:'thermal-yard' }, [
      h('i'), h('i'), h('i'), h('i'), h('i'), h('i')
    ]),
    h('span', { class:'hotspot one' }),
    h('span', { class:'hotspot two' })
  ]),
  h('div', { class:'thermal-meta' }, [
    h('span', `Busbar ${props.busbarTemp} C`),
    h('span', `Ambient ${props.ambientTemp} C`)
  ])
])

const SwitchingPanel = simplePanel('SwitchingPanel', 'switching-card', props => [
  h('h2', 'Switching Scenario'),
  h('div', { class:'step-list' }, props.steps.map(step =>
    h('div', [
      h('em', step.step),
      h('span', step.label),
      h('strong', { class:step.tone }, step.value)
    ])
  ))
])

const EnvironmentPanel = simplePanel('EnvironmentPanel', 'environment-card', props => [
  h('h2', 'Environmental Conditions'),
  h('div', { class:'environment-grid' }, props.items.map(item =>
    h('div', [
      h('span', { class:'material-icons' }, item.icon),
      h('small', item.label),
      h('strong', item.value)
    ])
  ))
])

const CustomerPanel = simplePanel('CustomerPanel', 'customer-card', props => [
  h('h2', 'Customer Impact Zones'),
  h('div', { class:'customer-list' }, props.rows.map(row =>
    h('div', [
      h('span', [h('strong', row.name), h('small', row.type)]),
      h('em', `${row.customers.toLocaleString('en-US')} customers`),
      h('b', { class:row.tone }, `${row.risk}%`)
    ])
  ))
])

const AnomalyTable = simplePanel('AnomalyTable', 'anomaly-card', props => [
  h('h2', 'Anomaly Detection'),
  h('table', { class:'sst-table' }, [
    h('thead', [h('tr', [
      h('th', 'Parameter'), h('th', 'Current'), h('th', 'Expected'), h('th', 'Deviation'), h('th', 'Status')
    ])]),
    h('tbody', props.rows.map(row =>
      h('tr', [
        h('td', row.parameter),
        h('td', row.current),
        h('td', row.expected),
        h('td', row.deviation),
        h('td', [h('em', { class:['table-pill', row.tone] }, row.status)])
      ])
    ))
  ])
])

const InsightsPanel = simplePanel('InsightsPanel', 'insights-card', props => [
  h('h2', 'Insights & Recommendations'),
  h('div', { class:'insight-list' }, props.items.map(item =>
    h('div', [
      h('span', { class:['material-icons', item.tone] }, item.icon),
      h('div', [
        h('strong', item.title),
        h('small', item.body)
      ]),
      h('em', item.time)
    ])
  ))
])

const MaintenanceForecast = simplePanel('MaintenanceForecast', 'maintenance-forecast-card', props => [
  h('h2', 'Predictive Maintenance'),
  h('div', { class:'maintenance-hero' }, [
    h('strong', props.maintenance?.priority || 'Normal'),
    h('span', `${props.maintenance?.open || 0} open work orders`),
    h('em', `Next inspection ${props.maintenance?.next || '30 days'}`)
  ]),
  h('div', { class:'mini-stat-list' }, [
    h('div', [h('span', 'Health'), h('strong', `${props.health}%`)]),
    h('div', [h('span', 'Risk'), h('strong', `${props.risk}%`)]),
    h('div', [h('span', 'Maintenance mode'), h('strong', props.risk > 40 ? 'Condition based' : 'Routine')])
  ])
])

const AssetHealthPanel = simplePanel('AssetHealthPanel', 'asset-health-card', props => [
  h('h2', 'Asset Health Breakdown'),
  h('div', { class:'asset-health-list' }, props.rows.map(row =>
    h('div', [
      h('span', row.asset),
      h('strong', `${row.health}%`),
      h('em', `${row.stress}% stress`),
      h('b', { class:row.tone, style:{ width:`${row.health}%` } })
    ])
  ))
])

const WorkOrderPanel = simplePanel('WorkOrderPanel', 'work-order-card', props => [
  h('h2', 'Work Orders'),
  h('div', { class:'work-order-list' }, props.rows.map(row =>
    h('div', [
      h('span', row.id),
      h('strong', row.title),
      h('small', `${row.owner} - ${row.due}`),
      h('em', { class:row.tone }, row.status)
    ])
  ))
])

const InspectionPanel = simplePanel('InspectionPanel', 'inspection-card', props => [
  h('h2', 'Inspection Checklist'),
  h('div', { class:'inspection-list' }, props.rows.map(row =>
    h('div', [
      h('span', { class:['material-icons', row.tone] }, row.state === 'Normal' ? 'check_circle' : 'radio_button_checked'),
      h('strong', row.label),
      h('em', { class:row.tone }, row.state)
    ])
  ))
])

const EventTimeline = simplePanel('EventTimeline', 'event-card', props => [
  h('h2', 'Substation Event Timeline'),
  h('div', { class:'event-list' }, props.rows.map(row =>
    h('div', [
      h('time', row.time),
      h('span', { class:row.tone }, row.severity),
      h('strong', row.event),
      h('small', `${row.source} - ${row.detail}`)
    ])
  ))
])
</script>

<style>
.sst-layout{
  color:#f5fbff;
  background:
    radial-gradient(circle at 24% 0%, rgba(42,178,255,.16), transparent 30%),
    radial-gradient(circle at 80% 10%, rgba(113,242,63,.08), transparent 26%),
    linear-gradient(135deg,#030912 0%,#071421 48%,#040a12 100%);
}

.sst-page{
  position:relative;
  height:100vh;
  min-height:0;
  display:flex;
  flex-direction:column;
  overflow:hidden;
  color:#f5fbff;
  background:
    linear-gradient(90deg, rgba(49,157,255,.045) 1px, transparent 1px),
    linear-gradient(0deg, rgba(49,157,255,.035) 1px, transparent 1px),
    radial-gradient(circle at 34% -6%, rgba(38,151,255,.18), transparent 34%),
    linear-gradient(135deg,#030912 0%,#081522 50%,#050b13 100%);
  background-size:32px 32px,32px 32px,auto,auto;
}

.sst-topbar{
  min-height:58px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:18px;
  padding:0 24px;
  border-bottom:1px solid rgba(91,136,174,.18);
  background:linear-gradient(180deg,rgba(5,13,24,.92),rgba(5,13,24,.78));
  box-shadow:0 10px 28px rgba(0,0,0,.22);
  backdrop-filter:blur(16px);
}

.breadcrumbs,
.topbar-actions{
  display:flex;
  align-items:center;
  gap:14px;
  min-width:0;
}

.breadcrumbs{
  color:#b8c8d5;
  font-size:14px;
}

.breadcrumbs strong{
  color:#f5fbff;
  font-size:16px;
  font-weight:800;
}

.online-pill{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:4px 14px;
  border:1px solid rgba(113,242,63,.26);
  border-radius:999px;
  color:#71f23f;
  font-weight:700;
  background:rgba(113,242,63,.06);
}

.online-pill i{
  width:7px;
  height:7px;
  border-radius:50%;
  background:#71f23f;
  box-shadow:0 0 12px rgba(113,242,63,.86);
}

.clock,
.admin{
  color:#d7e4ee;
}

.clock{
  padding:0 18px;
  border-left:1px solid rgba(255,255,255,.08);
  border-right:1px solid rgba(255,255,255,.08);
  font-variant-numeric:tabular-nums;
}

.sst-scroll{
  flex:1;
  min-height:0;
  overflow:auto;
}

.sst-content{
  min-width:0;
  padding:12px 18px 14px;
}

.title-row{
  min-height:54px;
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:18px;
  margin-bottom:8px;
}

.sst-content h1{
  margin:0;
  color:#f5fbff;
  font-size:24px;
  font-weight:800;
  line-height:1.15;
  letter-spacing:0;
  text-shadow:0 0 18px rgba(64,196,255,.13);
}

.sst-card h2{
  margin:0;
  padding:12px 13px 8px;
  color:#f7fbff;
  font-size:12px;
  font-weight:800;
  line-height:1.2;
  letter-spacing:0;
  text-transform:uppercase;
}

.asset-meta{
  display:flex;
  align-items:center;
  gap:10px;
  margin-top:6px;
  color:#9fb5c6;
  font-size:12px;
}

.online-badge,
.state-chip{
  display:inline-flex;
  align-items:center;
  min-height:22px;
  padding:3px 8px;
  border:1px solid rgba(113,242,63,.22);
  border-radius:4px;
  color:#71f23f;
  font-size:10px;
  font-weight:800;
  line-height:1;
  text-transform:uppercase;
  background:rgba(113,242,63,.06);
}

.state-chip.yellow{ color:#ffb238; border-color:rgba(255,178,56,.3); background:rgba(255,178,56,.08); }
.state-chip.red{ color:#ff3347; border-color:rgba(255,51,71,.35); background:rgba(255,51,71,.08); }
.state-chip.cyan{ color:#40c4ff; border-color:rgba(64,196,255,.3); background:rgba(64,196,255,.08); }

.time-controls{
  display:flex;
  align-items:center;
  gap:8px;
}

.time-controls button{
  min-height:32px;
  padding:0 12px;
  border:1px solid rgba(91,151,194,.24);
  border-radius:4px;
  color:#c2d2de;
  background:linear-gradient(180deg,rgba(10,24,40,.92),rgba(5,13,24,.88));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.035);
  cursor:pointer;
}

.time-controls button.active{
  color:#fff;
  border-color:rgba(64,196,255,.48);
  background:linear-gradient(180deg,#1688ef,#0c64bd);
  box-shadow:0 0 18px rgba(40,143,255,.22), inset 0 1px 0 rgba(255,255,255,.18);
}

.tab-row{
  min-height:44px;
  display:grid;
  grid-template-columns:repeat(6,minmax(0,1fr));
  margin-bottom:10px;
  overflow:hidden;
  border:1px solid rgba(91,151,194,.2);
  border-radius:5px;
  background:linear-gradient(180deg,rgba(8,20,34,.72),rgba(5,13,24,.72));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.035);
}

.tab-row button{
  min-width:0;
  border:0;
  color:#c6d4de;
  font-size:12px;
  font-weight:800;
  letter-spacing:0;
  text-transform:uppercase;
  background:transparent;
  cursor:pointer;
}

.tab-row button:hover{
  color:#f5fbff;
  background:rgba(64,196,255,.055);
}

.tab-row button.active{
  color:#40c4ff;
  background:linear-gradient(180deg,rgba(64,196,255,.07),rgba(64,196,255,.015));
  box-shadow:inset 0 -2px 0 #40c4ff, inset 0 1px 0 rgba(255,255,255,.04);
  text-shadow:0 0 10px rgba(64,196,255,.38);
}

.sst-card{
  position:relative;
  min-width:0;
  overflow:hidden;
  border:1px solid rgba(91,151,194,.24);
  border-radius:5px;
  color:#f5fbff;
  background:
    linear-gradient(90deg, rgba(64,196,255,.035) 1px, transparent 1px),
    linear-gradient(0deg, rgba(64,196,255,.025) 1px, transparent 1px),
    linear-gradient(180deg,rgba(9,21,36,.9),rgba(5,13,24,.92));
  background-size:24px 24px,24px 24px,auto;
  box-shadow:0 15px 38px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.045);
}

.sst-card::before{
  content:'';
  position:absolute;
  inset:0 0 auto;
  height:1px;
  pointer-events:none;
  background:linear-gradient(90deg,transparent,rgba(78,203,255,.35),transparent);
}

.sst-card > *{
  position:relative;
}

.overview-kpi-grid,
.analytics-kpi-grid{
  display:grid;
  grid-template-columns:repeat(6,minmax(0,1fr));
  gap:10px;
  margin-bottom:10px;
}

.kpi-card{
  min-height:88px;
  display:flex;
  align-items:center;
  gap:14px;
  padding:13px 15px;
}

.kpi-card .material-icons{
  font-size:34px;
}

.kpi-card small,
.kpi-card strong,
.kpi-card em{
  display:block;
}

.kpi-card small{
  color:#aabcca;
  font-size:12px;
}

.kpi-card strong{
  margin-top:4px;
  color:#f5fbff;
  font-size:24px;
  font-weight:500;
  line-height:1;
  font-variant-numeric:tabular-nums;
}

.kpi-card em{
  display:inline;
  color:#c4d3df;
  font-size:14px;
  font-style:normal;
}

.overview-main-grid{
  display:grid;
  grid-template-columns:300px minmax(500px,1fr) 300px;
  gap:10px;
  margin-bottom:10px;
}

.right-stack,
.left-column,
.right-column,
.topology-side{
  display:grid;
  gap:10px;
  align-content:start;
}

.card-header{
  min-height:42px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  padding-right:13px;
}

.card-header h2{
  padding-right:0;
}

.legend{
  display:flex;
  gap:12px;
  color:#91a8b8;
  font-size:10px;
}

.legend span{
  display:flex;
  align-items:center;
  gap:5px;
}

.legend i{
  width:15px;
  height:4px;
  display:block;
  border-radius:999px;
}

.legend .actual{ background:#39a7ff; }
.legend .forecast{ background:#5bec67; }

.measurement-list{
  display:grid;
  padding:0 12px 12px;
}

.measurement-list div{
  display:grid;
  grid-template-columns:20px minmax(0,1fr) 54px 56px 32px;
  align-items:center;
  gap:8px;
  min-height:38px;
  border-top:1px solid rgba(116,155,188,.095);
  color:#bfd1dd;
  font-size:12px;
}

.measurement-list div:hover,
.status-row:hover,
.compact-alarm-list div:hover{
  background:rgba(64,196,255,.035);
}

.measurement-list strong{
  color:#f5fbff;
  font-size:15px;
  font-weight:700;
  text-align:right;
  font-variant-numeric:tabular-nums;
}

.measurement-list em{
  color:#8fa9b8;
  font-size:11px;
  font-style:normal;
}

.risk-card{
  display:grid;
  justify-items:center;
  padding-bottom:13px;
  text-align:center;
}

.risk-card p{
  min-height:42px;
  margin:4px 18px 12px;
  color:#aabcca;
  font-size:12px;
  line-height:1.35;
}

.risk-gauge{
  width:132px;
  aspect-ratio:1;
  display:grid;
  place-items:center;
  border-radius:50%;
  background:
    radial-gradient(circle at center,#091522 0 57%,transparent 58%),
    conic-gradient(#ff3347 0 var(--risk), #f9d334 var(--risk) calc(var(--risk) + 10%), #496273 0 100%);
  filter:drop-shadow(0 0 14px rgba(255,51,71,.18));
}

.risk-gauge strong,
.risk-gauge span,
.risk-gauge em{
  grid-area:1 / 1;
}

.risk-gauge strong{
  transform:translateY(-10px);
  color:#f5fbff;
  font-size:34px;
  line-height:1;
}

.risk-gauge span{
  transform:translate(32px,-14px);
  color:#d7e4ee;
  font-size:13px;
}

.risk-gauge em{
  transform:translateY(24px);
  color:#ffb238;
  font-size:11px;
  font-style:normal;
  font-weight:800;
  text-transform:uppercase;
}

.primary-action{
  min-height:34px;
  border-radius:4px;
  color:#02101a !important;
  background:#40c4ff !important;
  font-size:12px;
  font-weight:800;
}

.compact-alarm-list{
  display:grid;
  padding:0 12px 12px;
}

.compact-alarm-list div{
  min-height:35px;
  display:grid;
  grid-template-columns:22px minmax(0,1fr) 46px;
  align-items:center;
  gap:8px;
  border-top:1px solid rgba(116,155,188,.095);
  color:#bfd1dd;
  font-size:12px;
}

.compact-alarm-list small{
  color:#8fa9b8;
  text-align:right;
}

.alarm-count{
  min-width:26px;
  min-height:22px;
  display:inline-grid;
  place-items:center;
  border-radius:4px;
  color:#fff;
  background:#ff3347;
  font-size:12px;
  font-weight:800;
}

.substation-diagram{
  min-height:300px;
  padding:0 10px 10px;
}

.substation-diagram.large{
  min-height:526px;
}

.substation-diagram svg{
  width:100%;
  height:100%;
  min-height:292px;
  display:block;
}

.substation-diagram.large svg{
  min-height:510px;
}

.diagram-grid{
  fill:none;
  stroke:rgba(116,155,188,.075);
  stroke-width:1;
}

.incoming-line,
.transformer-link,
.coupler{
  fill:none;
  stroke:#38bfff;
  stroke-width:4;
  stroke-linecap:round;
  filter:url(#softGlow);
}

.busbar{
  fill:none;
  stroke:url(#busGlow);
  stroke-width:7;
  stroke-linecap:round;
  filter:url(#softGlow);
}

.hv-yard,
.diagram-badges rect{
  fill:rgba(9,24,39,.82);
  stroke:rgba(64,196,255,.32);
  stroke-width:1;
}

.hv-yard.red{
  stroke:rgba(255,51,71,.55);
}

.transformer-bank circle{
  fill:rgba(64,196,255,.06);
  stroke:#40c4ff;
  stroke-width:2;
  filter:url(#softGlow);
}

.breaker{
  fill:#07111f;
  stroke:#b9d8ea;
  stroke-width:2;
}

.breaker.green{ stroke:#71f23f; }
.breaker.yellow{ stroke:#ffb238; }
.breaker.red{ stroke:#ff3347; }

.feeder-line,
.feeder-tail,
.tie-line{
  fill:none;
  stroke-width:3;
  stroke-linecap:round;
  filter:url(#softGlow);
}

.feeder-line.green,
.feeder-tail.green{ stroke:#71f23f; }
.feeder-line.yellow,
.feeder-tail.yellow{ stroke:#ffb238; }
.feeder-line.red,
.feeder-tail.red{ stroke:#ff3347; }
.tie-line{ stroke:#5bec67; stroke-dasharray:8 8; }

.feeder-node.green{ fill:#71f23f; }
.feeder-node.yellow{ fill:#ffb238; }
.feeder-node.red{ fill:#ff3347; }

.diagram-label{
  fill:#dbe8ef;
  font-size:13px;
  font-weight:800;
}

.diagram-small{
  fill:#9fb5c6;
  font-size:11px;
}

.diagram-small.cyan{
  fill:#40c4ff;
}

.diagram-value{
  fill:#f5fbff;
  font-size:12px;
  font-weight:800;
}

.diagram-footer{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:8px;
  padding:0 12px 12px;
}

.diagram-footer span,
.trend-footer span,
.side-stats span,
.mini-stat-list span{
  display:block;
  color:#9fb4c3;
  font-size:11px;
}

.diagram-footer strong,
.trend-footer strong,
.side-stats strong,
.mini-stat-list strong{
  display:block;
  color:#f5fbff;
  font-size:14px;
  font-variant-numeric:tabular-nums;
}

.overview-chart-grid,
.analytics-chart-grid{
  display:grid;
  grid-template-columns:1fr 1fr 1.25fr;
  gap:10px;
  margin-bottom:10px;
}

.trend-panel{
  min-height:212px;
}

.trend-body{
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  align-items:center;
  gap:8px;
  padding:0 12px;
}

.trend-body .mini-chart{
  height:132px;
}

.trend-footer{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:8px;
  padding:0 12px 10px;
}

.side-stats{
  min-width:92px;
  display:grid;
  gap:8px;
}

.side-stats div,
.metric-grid div{
  border:1px solid rgba(91,151,194,.18);
  border-radius:4px;
  background:linear-gradient(180deg,rgba(10,24,40,.64),rgba(6,14,25,.58));
}

.side-stats div{
  padding:9px;
}

.overview-bottom-grid{
  display:grid;
  grid-template-columns:minmax(560px,1.35fr) minmax(360px,.85fr) minmax(300px,.75fr);
  gap:10px;
}

.sst-table{
  width:100%;
  border-collapse:collapse;
  color:#dbe8ef;
  font-size:12px;
}

.sst-table th,
.sst-table td{
  padding:9px 12px;
  border-top:1px solid rgba(116,155,188,.095);
  text-align:left;
  vertical-align:middle;
}

.sst-table th{
  color:#8fa9b8;
  font-size:10px;
  font-weight:800;
  text-transform:uppercase;
}

.sst-table td:not(:first-child){
  text-align:right;
  font-variant-numeric:tabular-nums;
}

.sst-table td:first-child strong,
.sst-table td:first-child span{
  display:block;
}

.sst-table td:first-child span{
  color:#8fa9b8;
  font-size:10px;
}

.table-pill{
  display:inline-flex;
  justify-content:center;
  min-width:56px;
  padding:3px 7px;
  border-radius:3px;
  font-size:10px;
  font-style:normal;
  font-weight:800;
  text-transform:uppercase;
}

.table-pill.green{ color:#71f23f; border:1px solid rgba(113,242,63,.16); background:rgba(113,242,63,.06); }
.table-pill.yellow{ color:#ffb238; border:1px solid rgba(255,178,56,.2); background:rgba(255,178,56,.07); }
.table-pill.red{ color:#ff3347; border:1px solid rgba(255,51,71,.22); background:rgba(255,51,71,.08); }

.protection-list,
.breaker-list,
.status-list,
.step-list,
.customer-list,
.asset-health-list,
.work-order-list,
.inspection-list,
.event-list{
  display:grid;
  padding:0 12px 12px;
}

.protection-list div,
.breaker-list div,
.status-row,
.step-list div,
.customer-list div,
.work-order-list div,
.inspection-list div,
.event-list div{
  position:relative;
  min-height:42px;
  display:grid;
  align-items:center;
  gap:7px;
  padding:8px 0;
  border-top:1px solid rgba(116,155,188,.095);
}

.status-row{
  grid-template-columns:22px minmax(0,1fr) auto;
  color:#bfd1dd;
  font-size:12px;
}

.status-row strong{
  font-size:12px;
}

.protection-list div{
  grid-template-columns:minmax(0,1fr) minmax(0,1fr) 86px 64px;
}

.protection-list span,
.breaker-list span,
.step-list span,
.work-order-list span,
.event-list time{
  color:#8fa9b8;
  font-size:11px;
}

.protection-list strong,
.breaker-list strong,
.step-list strong,
.work-order-list strong,
.event-list strong,
.inspection-list strong{
  color:#f5fbff;
  font-size:12px;
}

.protection-list small,
.work-order-list small,
.event-list small{
  color:#9fb5c6;
  font-size:11px;
}

.protection-list em,
.breaker-list em,
.step-list em,
.work-order-list em,
.inspection-list em{
  font-size:10px;
  font-style:normal;
  font-weight:800;
  text-align:right;
  text-transform:uppercase;
}

.contingency-score{
  padding:6px 12px 12px;
}

.contingency-score strong{
  display:block;
  color:#40c4ff;
  font-size:30px;
  line-height:1;
}

.contingency-score span{
  color:#9fb5c6;
  font-size:12px;
}

.mini-stat-list{
  display:grid;
  gap:8px;
  padding:0 12px 12px;
}

.mini-stat-list div{
  display:flex;
  justify-content:space-between;
  gap:12px;
  padding:9px;
  border:1px solid rgba(91,151,194,.18);
  border-radius:4px;
  background:linear-gradient(180deg,rgba(10,24,40,.64),rgba(6,14,25,.58));
}

.digital-grid{
  display:grid;
  grid-template-columns:250px minmax(500px,1fr) 310px;
  gap:10px;
  margin-bottom:10px;
}

.center-diagram-card .substation-diagram{
  min-height:526px;
}

.thermal-visual{
  position:relative;
  height:176px;
  margin:0 12px 8px;
  overflow:hidden;
  border:1px solid rgba(91,151,194,.18);
  border-radius:4px;
  background:
    linear-gradient(90deg,rgba(17,70,255,.9),rgba(17,207,255,.76) 38%,rgba(255,222,56,.86) 66%,rgba(255,54,49,.88)),
    #071526;
  box-shadow:inset 0 0 40px rgba(0,0,0,.28);
}

.thermal-yard{
  position:absolute;
  inset:24px 26px;
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:16px;
  mix-blend-mode:multiply;
}

.thermal-yard i{
  border:3px solid rgba(0,0,0,.42);
  border-radius:5px;
  background:rgba(255,255,255,.32);
}

.hotspot{
  position:absolute;
  width:34px;
  aspect-ratio:1;
  border-radius:50%;
  background:rgba(255,255,255,.22);
  box-shadow:0 0 28px rgba(255,255,255,.8);
}

.hotspot.one{ left:36%; top:34%; }
.hotspot.two{ right:22%; bottom:22%; opacity:.72; }

.thermal-meta{
  display:flex;
  justify-content:space-between;
  padding:0 13px 12px;
  color:#c3d4df;
  font-size:11px;
}

.step-list div{
  grid-template-columns:28px minmax(0,1fr) auto;
}

.step-list em{
  width:26px;
  min-height:24px;
  display:grid;
  place-items:center;
  border-radius:4px;
  color:#40c4ff;
  text-align:center;
  background:rgba(64,196,255,.08);
}

.environment-grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:8px;
  padding:2px 12px 13px;
}

.environment-grid div{
  display:grid;
  justify-items:center;
  gap:5px;
  min-height:72px;
  padding:8px;
  border:1px solid rgba(91,151,194,.18);
  border-radius:4px;
  color:#aabcca;
  text-align:center;
  background:linear-gradient(180deg,rgba(10,24,40,.64),rgba(6,14,25,.58));
}

.environment-grid .material-icons{
  color:#d1e1ec;
  font-size:24px;
}

.environment-grid small{
  font-size:10px;
}

.environment-grid strong{
  color:#f5fbff;
  font-size:15px;
}

.digital-bottom-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
}

.metric-grid{
  display:grid;
  grid-template-columns:repeat(7,minmax(0,1fr));
  gap:8px;
  padding:0 12px 12px;
}

.metric-card.compact .metric-grid{
  grid-template-columns:repeat(2,minmax(0,1fr));
}

.metric-grid div{
  position:relative;
  min-height:58px;
  padding:8px;
  overflow:hidden;
}

.metric-grid span,
.metric-grid strong,
.metric-grid em{
  display:block;
}

.metric-grid span{
  color:#a4b7c7;
  font-size:10px;
}

.metric-grid strong{
  margin-top:5px;
  color:#f5fbff;
  font-size:18px;
  font-weight:500;
  font-variant-numeric:tabular-nums;
}

.metric-grid em{
  display:inline;
  color:#b4c6d3;
  font-size:12px;
  font-style:normal;
}

.metric-grid b{
  position:absolute;
  left:8px;
  right:8px;
  bottom:6px;
  max-width:calc(100% - 16px);
  height:3px;
  border-radius:999px;
  background:#ff3347;
  box-shadow:0 0 10px rgba(255,51,71,.52);
}

.topology-view-grid{
  display:grid;
  grid-template-columns:minmax(620px,1fr) 360px;
  gap:10px;
  margin-bottom:10px;
}

.topology-large-card .substation-diagram{
  min-height:590px;
}

.customer-list div{
  grid-template-columns:minmax(0,1fr) auto 48px;
}

.customer-list span strong,
.customer-list span small{
  display:block;
}

.customer-list span small,
.customer-list em{
  color:#8fa9b8;
  font-size:10px;
  font-style:normal;
}

.customer-list b{
  font-size:13px;
  text-align:right;
  font-variant-numeric:tabular-nums;
}

.feeder-card-grid{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:10px;
}

.feeder-card{
  min-height:108px;
  padding:13px;
}

.feeder-head{
  display:grid;
  grid-template-columns:26px minmax(0,1fr) auto;
  align-items:start;
  gap:10px;
}

.feeder-head strong,
.feeder-head span{
  display:block;
}

.feeder-head strong{
  color:#f5fbff;
  font-size:13px;
}

.feeder-head span{
  color:#8fa9b8;
  font-size:11px;
}

.feeder-head em{
  font-size:10px;
  font-style:normal;
  font-weight:800;
  text-transform:uppercase;
}

.feeder-load{
  display:grid;
  grid-template-columns:minmax(0,1fr) 48px;
  align-items:center;
  gap:10px;
  margin-top:18px;
}

.feeder-load span{
  height:8px;
  overflow:hidden;
  border-radius:999px;
  background:rgba(255,255,255,.08);
}

.feeder-load i{
  display:block;
  height:100%;
  border-radius:inherit;
  background:linear-gradient(90deg,#71f23f,#38bfff,#ffb238);
  box-shadow:0 0 10px rgba(64,196,255,.32);
}

.feeder-load strong{
  color:#f5fbff;
  font-size:13px;
  text-align:right;
}

.analytics-bottom-grid{
  display:grid;
  grid-template-columns:minmax(620px,1.25fr) minmax(440px,.9fr);
  gap:10px;
}

.insight-list{
  display:grid;
  padding:0 14px 12px;
}

.insight-list > div{
  position:relative;
  min-height:61px;
  display:grid;
  grid-template-columns:34px minmax(0,1fr);
  align-items:start;
  gap:12px;
  padding:12px 96px 10px 0;
  border-top:1px solid rgba(255,255,255,.06);
}

.insight-list strong,
.insight-list small{
  display:block;
}

.insight-list strong{
  color:#f5fbff;
  font-size:12px;
  line-height:1.3;
}

.insight-list small,
.insight-list em{
  color:#aabcca;
  font-size:11px;
  line-height:1.35;
}

.insight-list em{
  position:absolute;
  top:14px;
  right:0;
  width:82px;
  font-style:normal;
  text-align:right;
}

.maintenance-grid{
  display:grid;
  grid-template-columns:300px minmax(460px,1fr) minmax(420px,.9fr);
  gap:10px;
  margin-bottom:10px;
}

.inspection-grid{
  display:grid;
  grid-template-columns:minmax(420px,.8fr) minmax(620px,1.2fr);
  gap:10px;
}

.maintenance-hero{
  margin:0 12px 12px;
  padding:13px;
  border:1px solid rgba(64,196,255,.18);
  border-radius:4px;
  background:linear-gradient(180deg,rgba(64,196,255,.08),rgba(64,196,255,.025));
}

.maintenance-hero strong,
.maintenance-hero span,
.maintenance-hero em{
  display:block;
}

.maintenance-hero strong{
  color:#f5fbff;
  font-size:28px;
  line-height:1;
}

.maintenance-hero span,
.maintenance-hero em{
  margin-top:6px;
  color:#aabcca;
  font-size:12px;
  font-style:normal;
}

.asset-health-list div{
  grid-template-columns:minmax(0,1fr) 50px 78px;
  padding-bottom:13px;
}

.asset-health-list b{
  position:absolute;
  left:0;
  right:0;
  bottom:5px;
  height:3px;
  border-radius:999px;
  background:#71f23f;
  box-shadow:0 0 8px rgba(113,242,63,.42);
}

.asset-health-list b.yellow{
  background:#ffb238;
  box-shadow:0 0 8px rgba(255,178,56,.42);
}

.work-order-list div{
  grid-template-columns:64px minmax(0,1fr) minmax(120px,.6fr) 54px;
}

.inspection-list div{
  grid-template-columns:24px minmax(0,1fr) 70px;
}

.events-grid{
  display:grid;
  grid-template-columns:minmax(620px,1.2fr) minmax(360px,.8fr) minmax(360px,.8fr);
  gap:10px;
}

.event-list div{
  grid-template-columns:48px 68px minmax(0,.72fr) minmax(0,1.4fr);
}

.event-list span{
  font-size:10px;
  font-weight:800;
}

.spark-line{
  width:52px;
  height:18px;
}

.spark-grid{
  fill:none;
  stroke:rgba(143,169,184,.18);
  stroke-width:1;
}

.spark-path{
  fill:none;
  stroke:#35dc58;
  stroke-width:1.8;
  stroke-linecap:round;
  stroke-linejoin:round;
  filter:drop-shadow(0 0 4px rgba(53,220,88,.42));
}

.spark-path.cyan{ stroke:#36c8ff; filter:drop-shadow(0 0 4px rgba(54,200,255,.42)); }
.spark-path.yellow{ stroke:#ffb238; filter:drop-shadow(0 0 4px rgba(255,178,56,.42)); }
.spark-path.red{ stroke:#ff3347; filter:drop-shadow(0 0 4px rgba(255,51,71,.42)); }
.spark-path.white{ stroke:#eaf5fc; }

.green{ color:#67f06c !important; }
.cyan{ color:#36c8ff !important; }
.yellow{ color:#ffb238 !important; }
.red{ color:#ff3347 !important; }
.white{ color:#eaf5fc !important; }

@media (max-width: 1480px){
  .overview-kpi-grid,
  .analytics-kpi-grid{
    grid-template-columns:repeat(3,minmax(0,1fr));
  }

  .overview-main-grid,
  .digital-grid{
    grid-template-columns:250px minmax(420px,1fr) 280px;
  }

  .overview-bottom-grid,
  .maintenance-grid,
  .events-grid{
    grid-template-columns:1fr 1fr;
  }

  .metric-grid{
    grid-template-columns:repeat(4,minmax(0,1fr));
  }
}

@media (max-width: 1180px){
  .sst-page{
    height:auto;
    min-height:100vh;
    overflow:visible;
  }

  .sst-scroll{
    overflow:visible;
  }

  .title-row,
  .asset-meta,
  .sst-topbar{
    align-items:flex-start;
    flex-direction:column;
  }

  .topbar-actions{
    flex-wrap:wrap;
  }

  .overview-main-grid,
  .overview-chart-grid,
  .overview-bottom-grid,
  .digital-grid,
  .digital-bottom-grid,
  .topology-view-grid,
  .analytics-chart-grid,
  .analytics-bottom-grid,
  .maintenance-grid,
  .inspection-grid,
  .events-grid{
    grid-template-columns:1fr;
  }

  .topology-large-card .substation-diagram,
  .center-diagram-card .substation-diagram{
    min-height:500px;
  }
}

@media (max-width: 760px){
  .sst-content{
    padding:14px;
  }

  .sst-topbar{
    padding:14px;
  }

  .sst-content h1{
    font-size:24px;
  }

  .time-controls{
    flex-wrap:wrap;
  }

  .tab-row{
    grid-template-columns:repeat(2,minmax(0,1fr));
  }

  .tab-row button{
    min-height:35px;
  }

  .overview-kpi-grid,
  .analytics-kpi-grid,
  .diagram-footer,
  .trend-footer,
  .metric-grid,
  .feeder-card-grid{
    grid-template-columns:1fr;
  }

  .measurement-list div{
    grid-template-columns:20px minmax(0,1fr) 50px;
    gap:6px;
  }

  .measurement-list em,
  .measurement-spark{
    display:none;
  }

  .protection-list div,
  .work-order-list div,
  .event-list div,
  .asset-health-list div{
    grid-template-columns:1fr;
  }

  .sst-table{
    font-size:10px;
  }

  .sst-table th,
  .sst-table td{
    padding:6px 8px;
  }
}
</style>
