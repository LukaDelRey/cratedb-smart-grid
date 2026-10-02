<template>
  <TransformerTwinShell
    :transformer="transformer"
    :station="station"
    :active-alarms="activeAlarmCount"
    :active-section="activeTabLabel"
    :last-update="lastUpdate"
  >
    <main class="tt-scroll">
      <q-banner v-if="!station" class="bg-blue-grey-10 text-white">{{ t('dashboard.noAssetTelemetry') }}</q-banner>
      <section class="tt-content" :class="`tab-${activeTab}`">
        <div class="title-row">
          <div>
            <h1>{{ pageTitle }}</h1>
            <div class="asset-meta">
              {{ transformer?.substation || 'Substation 110/20kV' }} - 110/20kV - 40 MVA - ONAN
              <span class="online-badge">Online</span>
            </div>
          </div>

          <div class="time-controls">
            <button type="button" class="scenario-button" @click="scenarioOpen = true">
              <q-icon name="science" size="17px" />
              {{ t('dashboard.runScenario') }}
            </button>
            <template v-if="activeTab === 'analytics'">
              <button type="button">May 14, 2025 - May 20, 2025</button>
              <button type="button" class="active">Live Data</button>
              <button type="button">Historical</button>
            </template>
            <template v-else>
              <button type="button">
                <span class="range-long">Last 5 minutes</span>
                <span class="range-short">5 min</span>
              </button>
              <button type="button" aria-label="Refresh">
                <q-icon name="refresh" size="17px" />
              </button>
            </template>
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
          <section class="overview-top-grid">
            <div class="tt-card measurements-card">
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
              <button class="text-link" type="button">View all measurements <q-icon name="chevron_right" /></button>
            </div>

            <div class="tt-card overview-diagram-card">
              <TransformerTwinDiagram
                compact
                :show-controls="false"
                :callouts="overviewCallouts"
              />
              <div class="diagram-footer">
                <span>Status <strong class="green-pill">Online</strong></span>
                <span>Health Score <strong class="green">{{ healthScore }} /100</strong></span>
                <span>Last Update <strong>{{ lastUpdate }}</strong></span>
              </div>
            </div>

            <div class="right-stack">
              <div class="tt-card health-card">
                <h2>Transformer Health</h2>
                <div class="health-gauge">
                  <strong>{{ healthScore }}</strong>
                  <span>/100</span>
                  <em>Excellent</em>
                </div>
                <p>Transformer is operating within normal limits</p>
              </div>

              <div class="tt-card active-alarms-card">
                <div class="card-header">
                  <h2>Active Alarms</h2>
                  <span class="alarm-count">{{ alarms.length }}</span>
                </div>
                <div class="compact-alarm-list">
                  <div v-for="alarm in alarms.slice(0,5)" :key="alarm.label">
                    <q-icon :name="alarm.icon" :class="alarm.severity" />
                    <span>{{ alarm.label }}</span>
                    <small>{{ alarm.time }}</small>
                  </div>
                </div>
                <button class="text-link" type="button">View all alarms <q-icon name="chevron_right" /></button>
              </div>
            </div>
          </section>

          <section class="overview-chart-grid">
            <TrendPanel
              title="Load & Power"
              :seed="loadPct"
              legend-a="Load (%)"
              legend-b="Power (MW)"
              :footer="[
                ['Load', `${loadPct} %`],
                ['Power', `${activePower} MW`]
              ]"
            />
            <TrendPanel
              title="Oil & Temperatures"
              :seed="oilTemp"
              legend-a="Top Oil (C)"
              legend-b="Winding H (C)"
              :footer="[
                ['Top Oil', `${oilTemp} C`],
                ['Winding H', `${windingTemp} C`],
                ['Winding L', `${round1(windingTemp - 6.3)} C`],
                ['Bottom Oil', `${round1(oilTemp - 4.2)} C`]
              ]"
            />
            <TrendPanel
              title="Voltage & Current"
              :seed="primaryVoltage"
              legend-a="Voltage (kV)"
              legend-b="Current (A)"
              :footer="[
                ['Primary Voltage', `${primaryVoltage} kV`],
                ['Secondary Voltage', `${secondaryVoltage} kV`],
                ['Current', `${loadCurrent} A`]
              ]"
            />
            <TrendPanel
              title="AI Forecast (Next 24h)"
              :seed="loadPct + 12"
              legend-a="Actual"
              legend-b="Forecast"
              :side-stats="[
                ['Peak Load', '85 %'],
                ['Confidence', '87 %']
              ]"
            />
          </section>

          <section class="overview-bottom-grid">
            <div class="tt-card">
              <h2>Sensor Status</h2>
              <table class="tt-table">
                <thead>
                  <tr>
                    <th>Sensor</th>
                    <th>Value</th>
                    <th>Unit</th>
                    <th>Status</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in sensorRows" :key="row.sensor">
                    <td>{{ row.sensor }}</td>
                    <td>{{ row.value }}</td>
                    <td>{{ row.unit }}</td>
                    <td>
                      <span class="status-ok" :class="{ warning:row.status === 'Warning' }">{{ row.status }}</span>
                    </td>
                    <td>
                      <SparkLine :seed="row.trend" :tone="row.status === 'Warning' ? 'yellow' : 'green'" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="tt-card dga-card">
              <h2>Gas Analysis (DGA)</h2>
              <div class="dga-layout">
                <table class="tt-table">
                  <tbody>
                    <tr v-for="gas in gasRows.slice(0,5)" :key="gas.gas">
                      <td>{{ gas.gas }}</td><td>{{ gas.value }}</td><td>{{ gas.unit }}</td><td><span class="status-ok">Normal</span></td>
                    </tr>
                  </tbody>
                </table>
                <div class="donut small"><strong>DGA</strong><span>Normal</span></div>
              </div>
            </div>

            <div class="tt-card">
              <h2>Events Log</h2>
              <table class="tt-table">
                <tbody>
                  <tr v-for="event in eventRows" :key="event.event">
                    <td>{{ event.time }}</td><td>{{ event.event }}</td><td :class="event.severityClass">{{ event.severity }}</td><td>TR-01</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>

        <template v-else-if="activeTab === 'digital'">
          <section class="digital-grid">
            <aside class="left-column">
              <div class="tt-card live-status-card">
                <h2>Live Status</h2>
                <div class="status-list">
                  <div v-for="item in liveStatus" :key="item.label" class="status-row">
                    <q-icon :name="item.icon" :class="item.tone" size="18px" />
                    <span>{{ item.label }}</span>
                    <strong :class="item.tone">{{ item.value }}</strong>
                  </div>
                </div>
              </div>

              <div class="tt-card">
                <h2>Component Status</h2>
                <div class="component-list">
                  <div v-for="component in componentStatuses" :key="component">
                    <span>{{ component }}</span>
                    <strong><i /> OK</strong>
                  </div>
                </div>
              </div>
            </aside>

            <TransformerTwinDiagram class="center-diagram" :callouts="digitalCallouts" />

            <aside class="right-column">
              <div class="tt-card heat-card">
                <h2>Temperature Distribution</h2>
                <div class="heatmap-visual">
                  <img src="../assets/transformer-twin/power-transformer.png" alt="Transformer temperature distribution">
                  <div class="temperature-scale">
                    <span>90 C</span>
                    <i />
                    <span>40 C</span>
                  </div>
                </div>
              </div>

              <div class="tt-card">
                <div class="card-header">
                  <h2>Loading Trend (24h)</h2>
                  <div class="legend"><span><i class="actual" />Actual Load</span><span><i class="forecast" />Forecasted Load</span></div>
                </div>
                <TransformerTwinMiniChart :seed="loadPct" />
              </div>

              <AgeingCard />
              <EnvironmentCard :items="environment" />
            </aside>
          </section>

          <section class="digital-bottom-grid">
            <MetricCard title="Real-time Parameters" :metrics="realtimeParameters" />
            <MetricCard title="Simulation & Prediction" :metrics="simulationMetrics" />
          </section>
        </template>

        <template v-else-if="activeTab === 'analytics'">
          <section class="analytics-kpi-grid">
            <div v-for="metric in analyticsKpis" :key="metric.label" class="tt-card kpi-card">
              <q-icon :name="metric.icon" :class="metric.tone" size="34px" />
              <div>
                <span>{{ metric.label }}</span>
                <strong>{{ metric.value }} <em>{{ metric.unit }}</em></strong>
                <small :class="metric.tone">{{ metric.status }}</small>
              </div>
            </div>
          </section>

          <section class="analytics-chart-grid">
            <TrendPanel title="Load & Power Trend" :seed="loadPct" :values="historyLoadSeries" legend-a="Load (%)" legend-b="Power (MW)" />
            <TrendPanel title="Temperature Analysis" :seed="oilTemp + 16" :values="historyThermalSeries" legend-a="Top Oil (C)" legend-b="Winding H (C)" />
            <TrendPanel
              title="Load Forecast (Next 7 Days)"
              :seed="loadPct + 14"
              legend-a="Actual Load"
              legend-b="Forecast"
              :side-stats="[
                ['Peak Load (Pred.)', '85 %'],
                ['Confidence', '87 %']
              ]"
            />
          </section>

          <section class="analytics-mid-grid">
            <div class="tt-card loss-card">
              <h2>Loss Analysis</h2>
              <div class="loss-layout">
                <div class="donut"><strong>Total Loss</strong><span>2.45 MW</span></div>
                <div class="loss-list">
                  <div>
                    <i class="blue" />
                    <span>
                      <em>No-load Loss</em>
                      <strong>0.45 MW (18%)</strong>
                    </span>
                  </div>
                  <div>
                    <i class="green-bg" />
                    <span>
                      <em>Load Loss</em>
                      <strong>1.65 MW (67%)</strong>
                    </span>
                  </div>
                  <div>
                    <i class="orange-bg" />
                    <span>
                      <em>Stray Loss</em>
                      <strong>0.20 MW (8%)</strong>
                    </span>
                  </div>
                  <div>
                    <i class="purple-bg" />
                    <span>
                      <em>Other Loss</em>
                      <strong>0.15 MW (6%)</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="tt-card">
              <h2>DGA (Dissolved Gas Analysis)</h2>
              <table class="tt-table">
                <tbody>
                  <tr v-for="gas in gasRows" :key="gas.gas">
                    <td>{{ gas.gas }}</td>
                    <td>{{ gas.value }}</td>
                    <td>{{ gas.unit }}</td>
                    <td>
                      <span class="status-ok">Normal</span>
                    </td>
                    <td>
                      <SparkLine :seed="gas.trend" tone="green" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <AgeingCard />

            <div class="tt-card correlation-card">
              <h2>Correlation Analysis</h2>
              <div class="scatter">
                <i v-for="index in 48" :key="index" :style="scatterStyle(index)" />
              </div>
              <div class="correlation-score">
                <span>Correlation Coefficient</span>
                <strong>0.78</strong>
                <em>Strong Positive</em>
              </div>
            </div>
          </section>

          <section class="analytics-bottom-grid">
            <div class="tt-card">
              <h2>Anomaly Detection</h2>
              <table class="tt-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Current Value</th>
                    <th>Expected Range</th>
                    <th>Deviation</th>
                    <th>Status</th>
                    <th>Detected At</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in anomalyRows" :key="row.parameter">
                    <td>{{ row.parameter }}</td><td>{{ row.value }}</td><td>{{ row.range }}</td><td>{{ row.deviation }}</td><td><span class="status-ok">Normal</span></td><td>May 20, 14:31:55</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="tt-card insights-card">
              <h2>Insights & Recommendations</h2>
              <div class="insight-list">
                <div v-for="insight in insights" :key="insight.title">
                  <q-icon :name="insight.icon" :class="insight.tone" size="28px" />
                  <div>
                    <strong>{{ insight.title }}</strong>
                    <span>{{ insight.body }}</span>
                  </div>
                  <small>{{ insight.time }}</small>
                </div>
              </div>
            </div>
          </section>
        </template>

        <template v-else-if="activeTab === 'schematic'">
          <section class="schematic-grid">
            <div class="tt-card schematic-diagram-card">
              <div class="card-header">
                <h2>Transformer Protection Schematic</h2>
                <div class="legend"><span><i class="actual" />Energized</span><span><i class="forecast" />Protection zone</span></div>
              </div>
              <div class="single-line-diagram">
                <svg viewBox="0 0 760 430" role="img" aria-label="Transformer single-line schematic">
                  <defs>
                    <filter id="schematicGlow" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <path class="diagram-grid-line" d="M80 60H700M80 140H700M80 220H700M80 300H700M80 380H700" />
                  <path class="energized-line" d="M70 80H230V178" />
                  <path class="energized-line" d="M530 252V350H690" />
                  <path class="aux-line" d="M230 178H530M230 252H530" />
                  <path class="zone-ring" d="M242 155H518V275H242Z" />
                  <g class="breaker-symbol" transform="translate(154 80)">
                    <rect x="-28" y="-18" width="56" height="36" rx="5" />
                    <path d="M-16 12L18 -12" />
                  </g>
                  <g class="breaker-symbol" transform="translate(608 350)">
                    <rect x="-28" y="-18" width="56" height="36" rx="5" />
                    <path d="M-16 12L18 -12" />
                  </g>
                  <g class="transformer-symbol" transform="translate(380 215)">
                    <circle cx="-38" cy="0" r="52" />
                    <circle cx="38" cy="0" r="52" />
                    <text x="0" y="-82">TR {{ transformer?.id || route.params.id }}</text>
                    <text x="0" y="92">{{ loadPct }}% load / {{ healthScore }} health</text>
                  </g>
                  <g class="schematic-label" transform="translate(74 56)">
                    <text>HV bus 110 kV</text>
                    <text y="22">{{ primaryVoltage }} kV</text>
                  </g>
                  <g class="schematic-label" transform="translate(582 322)">
                    <text>LV bus 20 kV</text>
                    <text y="22">{{ secondaryVoltage }} kV</text>
                  </g>
                  <g class="relay-node differential" transform="translate(260 116)">
                    <circle r="18" />
                    <text y="5">87T</text>
                  </g>
                  <g class="relay-node thermal" transform="translate(502 116)">
                    <circle r="18" />
                    <text y="5">49</text>
                  </g>
                  <g class="relay-node gas" transform="translate(260 314)">
                    <circle r="18" />
                    <text y="5">63</text>
                  </g>
                  <g class="relay-node ground" transform="translate(502 314)">
                    <circle r="18" />
                    <text y="5">51N</text>
                  </g>
                </svg>
              </div>
            </div>

            <aside class="schematic-side">
              <MetricCard title="Protection State" :metrics="schematicMetrics" />
              <div class="tt-card">
                <h2>Relay & Interlock Chain</h2>
                <div class="protection-chain">
                  <div v-for="step in protectionStages" :key="step.code">
                    <span>{{ step.code }}</span>
                    <strong>{{ step.label }}</strong>
                    <em :class="step.tone">{{ step.state }}</em>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </template>

        <template v-else-if="activeTab === 'maintenance'">
          <section class="maintenance-grid">
            <div class="tt-card maintenance-hero-card">
              <h2>Predictive Maintenance</h2>
              <div class="maintenance-hero">
                <strong>{{ maintenancePriority }}</strong>
                <span>{{ Math.max(12, Math.round((100 - riskScore) / 2)) }} days to recommended service window</span>
                <em>Driven by load, DGA, thermal stress and ageing factor</em>
              </div>
              <AgeingCard />
            </div>

            <div class="tt-card">
              <h2>Maintenance Plan</h2>
              <div class="maintenance-plan">
                <div v-for="item in maintenancePlan" :key="item.title">
                  <q-icon :name="item.icon" :class="item.tone" size="24px" />
                  <span>
                    <strong>{{ item.title }}</strong>
                    <small>{{ item.body }}</small>
                  </span>
                  <em>{{ item.due }}</em>
                </div>
              </div>
            </div>

            <div class="tt-card">
              <h2>Inspection Checklist</h2>
              <div class="inspection-list">
                <div v-for="item in inspectionChecklist" :key="item.label">
                  <q-icon :name="item.icon" :class="item.tone" size="22px" />
                  <span>{{ item.label }}</span>
                  <strong :class="item.tone">{{ item.state }}</strong>
                </div>
              </div>
            </div>
          </section>

          <section class="maintenance-bottom-grid">
            <TrendPanel
              title="Degradation Projection"
              :seed="ageingFactor + 31"
              legend-a="Observed"
              legend-b="Projected"
              :side-stats="[
                ['RUL', `${round1((healthScore / 100) * 28.7)} years`],
                ['Failure Risk', `${riskScore}%`]
              ]"
            />
            <TrendPanel
              title="DGA Watch Trend"
              :seed="gasRows[0].trend + gasRows[3].trend"
              legend-a="Hydrogen"
              legend-b="Acetylene"
              :footer="gasRows.slice(0,4).map(gas => [gas.gas, `${gas.value} ${gas.unit}`])"
            />
          </section>
        </template>

        <template v-else>
          <section class="events-grid">
            <div class="tt-card">
              <h2>Event Timeline</h2>
              <div class="event-timeline">
                <div v-for="event in eventTimeline" :key="`${event.time}-${event.title}`">
                  <time>{{ event.time }}</time>
                  <span :class="event.tone">{{ event.severity }}</span>
                  <strong>{{ event.title }}</strong>
                  <small>{{ event.detail }}</small>
                </div>
              </div>
            </div>

            <div class="tt-card">
              <h2>Alarm Lifecycle</h2>
              <div class="alarm-lifecycle">
                <div v-for="alarm in alarms.slice(0,5)" :key="alarm.label">
                  <q-icon :name="alarm.icon" :class="alarm.severity" size="22px" />
                  <span>
                    <strong>{{ alarm.label }}</strong>
                    <small>{{ alarm.time }} - {{ alarm.severity === 'critical' ? 'requires operator action' : 'watch condition' }}</small>
                  </span>
                </div>
              </div>
            </div>

            <div class="tt-card insights-card">
              <h2>Operator Notes</h2>
              <div class="insight-list">
                <div v-for="insight in eventInsights" :key="insight.title">
                  <q-icon :name="insight.icon" :class="insight.tone" size="28px" />
                  <div>
                    <strong>{{ insight.title }}</strong>
                    <span>{{ insight.body }}</span>
                  </div>
                  <small>{{ insight.time }}</small>
                </div>
              </div>
            </div>
          </section>
        </template>
      </section>
    </main>
    <ScenarioControlDialog
      v-model="scenarioOpen"
      :station-id="station?.station_id"
      default-type="overload"
    />
  </TransformerTwinShell>
</template>

<script setup lang="ts">
import { thresholdValue } from '../stores/thresholdSettings'
import { computed, defineComponent, h, onMounted, ref } from 'vue'
import type { PropType } from 'vue'
import { useRoute } from 'vue-router'
import { useSensorStore } from '../stores/sensorStore'
import { humanizeAssetKey as alarmLabel } from '../utils/assets'
import { round1 } from '../utils/numbers'
import TransformerTwinShell from '../components/transformer-twin/TransformerTwinShell.vue'
import TransformerTwinDiagram from '../components/transformer-twin/TransformerTwinDiagram.vue'
import TransformerTwinMiniChart from '../components/transformer-twin/TransformerTwinMiniChart.vue'
import ScenarioControlDialog from '../components/scenarios/ScenarioControlDialog.vue'
import { useI18n } from '../i18n'
import { useStationHistory } from '../composables/useStationHistory'

const route = useRoute()
const store = useSensorStore()
const activeTab = ref('overview')
const scenarioOpen = ref(false)
const { t } = useI18n()

onMounted(() => {
  if(!store.stations.length){
    store.start()
  }
})

const tabs = [
  { key:'overview', label:'Overview' },
  { key:'digital', label:'Digital Twin' },
  { key:'schematic', label:'Schematic' },
  { key:'analytics', label:'Analytics' },
  { key:'maintenance', label:'Maintenance' },
  { key:'events', label:'Events' }
]

const transformer = computed(() =>
  store.getTransformerById(route.params.id)
)

const station = computed(() =>
  transformer.value?.substation
    ? store.getSubstationById(transformer.value.substation)
    : null
)

const stationHistory = useStationHistory(() => station.value?.station_id)
const historyLoadSeries = stationHistory.series(point => {
  const current = point.electrical?.current_a
  return Number.isFinite(current) ? Math.max(0,Math.min(100,Number(current) / 6)) : null
})
const historyThermalSeries = stationHistory.series(point => point.thermal?.oil_temp_c)

const activeTabLabel = computed(() =>
  tabs.find(tab => tab.key === activeTab.value)?.label || 'Overview'
)

const pageTitle = computed(() =>
  activeTab.value === 'analytics'
    ? `Analytics - Transformer ${transformer.value?.id || route.params.id}`
    : activeTab.value === 'digital'
      ? `Digital Twin - Transformer ${transformer.value?.id || route.params.id}`
      : `Transformer ${transformer.value?.id || route.params.id}`
)

const activeAlarmCount = computed(() =>
  store.summary?.activeAlarms || store.alarms?.length || 0
)

const lastUpdate = computed(() =>
  new Date().toLocaleTimeString('hr-HR', {
    hour:'2-digit',
    minute:'2-digit',
    second:'2-digit',
    hour12:false
  })
)

const loadPct = computed(() => transformer.value?.loadPct ?? 0)
const oilTemp = computed(() => round1(transformer.value?.oilTemp ?? 0))
const windingTemp = computed(() => round1(transformer.value?.windingTemp ?? 0))
const primaryVoltage = computed(() => round1(station.value?.electrical?.voltage_v ? station.value.electrical.voltage_v / 1000 : 110.2))
const secondaryVoltage = computed(() => round1(primaryVoltage.value / 5.48))
const loadCurrent = computed(() => round1(loadPct.value * 4.34))
const activePower = computed(() => round1(loadPct.value * .303))
const apparentPower = computed(() => round1(activePower.value / .9))
const healthScore = computed(() => transformer.value?.healthScore ?? 0)
const riskScore = computed(() => transformer.value?.failureProbability ?? 0)
const ageingFactor = computed(() => Math.max(8, Math.round(100 - healthScore.value + riskScore.value)))

const measurementRows = computed(() => [
  { label:'Primary Voltage (L-L)', value:primaryVoltage.value, unit:'kV', icon:'bolt', tone:'green', spark:71 },
  { label:'Secondary Voltage (L-L)', value:secondaryVoltage.value, unit:'kV', icon:'electrical_services', tone:'green', spark:47 },
  { label:'Load Current', value:loadCurrent.value, unit:'A', icon:'warning', tone:'yellow', spark:83 },
  { label:'Active Power', value:activePower.value, unit:'MW', icon:'offline_bolt', tone:'yellow', spark:62 },
  { label:'Apparent Power', value:apparentPower.value, unit:'MVA', icon:'data_usage', tone:'cyan', spark:54 },
  { label:'Power Factor', value:'0.90', unit:'PF', icon:'speed', tone:'cyan', spark:36 },
  { label:'Frequency', value:'50.02', unit:'Hz', icon:'settings_input_component', tone:'green', spark:28 }
])

const liveStatus = computed(() => [
  { label:'Load', value:`${loadPct.value} %`, icon:'show_chart', tone:'cyan' },
  { label:'Health Score', value:`${healthScore.value} /100`, icon:'health_and_safety', tone:'green' },
  { label:'Temperature', value:`${oilTemp.value} C`, icon:'device_thermostat', tone:'white' },
  { label:'Oil Level', value:'Normal', icon:'oil_barrel', tone:'green' },
  { label:'Pressure', value:'0.25 bar', icon:'speed', tone:'white' },
  { label:'Cooling System', value:'Active', icon:'settings_input_component', tone:'green' },
  { label:'Tap Position', value:'5 (Neutral)', icon:'tune', tone:'white' },
  { label:'Last Update', value:lastUpdate.value, icon:'schedule', tone:'white' }
])

const componentStatuses = [
  'HV Bushings',
  'LV Bushings',
  'Winding (HV)',
  'Winding (LV)',
  'Core',
  'Cooling Fans',
  'OLTC'
]

const overviewCallouts = computed(() => [
  { label:'Top Oil Temp', value:oilTemp.value, unit:'C', x:17, y:22, side:'left' },
  { label:'Winding Temp (H)', value:windingTemp.value, unit:'C', x:18, y:42, side:'left' },
  { label:'Bottom Oil Temp', value:round1(oilTemp.value - 4.2), unit:'C', x:19, y:67, side:'left' },
  { label:'Load', value:loadPct.value, unit:'%', x:47, y:17, side:'right' },
  { label:'Oil Level', value:'Normal', unit:'', x:76, y:23, side:'right' },
  { label:'Pressure', value:'0.25', unit:'bar', x:77, y:43, side:'right' },
  { label:'Oil Quality', value:'Good', unit:'', x:77, y:60, side:'right' },
  { label:'Tank Temp', value:round1(oilTemp.value - 6.7), unit:'C', x:75, y:78, side:'right' }
])

const digitalCallouts = computed(() => [
  { label:'Top Oil Temp', value:oilTemp.value, unit:'C', x:35, y:18, side:'left' },
  { label:'Winding Temp (HV)', value:windingTemp.value, unit:'C', x:32, y:38, side:'left' },
  { label:'Winding Temp (LV)', value:round1(windingTemp.value - 6.3), unit:'C', x:34, y:58, side:'left' },
  { label:'Bottom Oil Temp', value:round1(oilTemp.value - 4.2), unit:'C', x:36, y:79, side:'left' },
  { label:'HV Current', value:loadCurrent.value, unit:'A', x:50, y:25, side:'right' },
  { label:'Oil Level', value:'Normal', unit:'', x:65, y:15, side:'right' },
  { label:'Oil Pressure', value:'0.25', unit:'bar', x:66, y:38, side:'right' },
  { label:'Cooling Fans', value:'Active', unit:'', x:65, y:58, side:'right' },
  { label:'Load Tap Changer', value:'Position: 5', unit:'', x:63, y:76, side:'right' },
  { label:'Vibration (Tank)', value:'1.8', unit:'mm/s', x:54, y:84, side:'right' }
])

const realtimeParameters = computed(() => [
  { label:'Primary Voltage (L-L)', value:primaryVoltage.value, unit:'kV' },
  { label:'Secondary Voltage (L-L)', value:secondaryVoltage.value, unit:'kV' },
  { label:'Load Current', value:loadCurrent.value, unit:'A' },
  { label:'Active Power', value:activePower.value, unit:'MW' },
  { label:'Apparent Power', value:apparentPower.value, unit:'MVA' },
  { label:'Power Factor', value:'0.90', unit:'' },
  { label:'Frequency', value:'50.02', unit:'Hz' }
])

const simulationMetrics = computed(() => [
  { label:'Hotspot Temp (Pred.)', value:round1(windingTemp.value + 5.6), unit:'C' },
  { label:'Winding Life (Est.)', value:round1((healthScore.value / 100) * 28.7), unit:'Years' },
  { label:'Next Maintenance (Est.)', value:Math.max(12, Math.round((100 - riskScore.value) / 2)), unit:'Days' },
  { label:'Failure Probability', value:riskScore.value, unit:'%', danger:true },
  { label:'Overload Capacity', value:Math.max(0, 90 - loadPct.value), unit:'%' },
  { label:'Cooling Efficiency', value:Math.min(99, Math.round(healthScore.value + 2)), unit:'%' },
  { label:'Insulation Life (Est.)', value:round1((healthScore.value / 100) * 31.2), unit:'Years' }
])

const schematicMetrics = computed(() => [
  { label:'Differential Relay', value:'Armed', unit:'' },
  { label:'Thermal Trip', value:round1(windingTemp.value + 5.6), unit:'C' },
  { label:'Buchholz Gas', value:gasRows[0].value, unit:'ppm' },
  { label:'Ground Fault', value:'0.02', unit:'pu' },
  { label:'Tap Position', value:5, unit:'' },
  { label:'Protection Zone', value:'HV-LV', unit:'' },
  { label:'Trip Margin', value:Math.max(4, Math.round(100 - loadPct.value)), unit:'%' }
])

const protectionStages = computed(() => [
  { code:'87T', label:'Transformer differential', state:'armed', tone:'green' },
  { code:'49', label:'Thermal image overload', state:windingTemp.value > 86 ? 'warning' : 'normal', tone:windingTemp.value > 86 ? 'yellow' : 'green' },
  { code:'63', label:'Buchholz gas relay', state:gasRows[0].value > 80 ? 'watch' : 'normal', tone:gasRows[0].value > 80 ? 'yellow' : 'green' },
  { code:'51N', label:'Ground overcurrent', state:'normal', tone:'green' },
  { code:'86', label:'Lockout trip circuit', state:riskScore.value > 70 ? 'ready' : 'standby', tone:riskScore.value > 70 ? 'red' : 'cyan' }
])

const environment = computed(() => [
  { label:'Ambient Temp', value:`${round1(store.weather?.temperatureC || 28.6)} C`, icon:'device_thermostat' },
  { label:'Humidity', value:'45 %', icon:'water_drop' },
  { label:'Wind Speed', value:'3.6 m/s', icon:'air' },
  { label:'Altitude', value:'220 m', icon:'terrain' }
])

const analyticsKpis = computed(() => [
  { label:'Health Score', value:healthScore.value, unit:'/100', status:'Excellent', icon:'health_and_safety', tone:'green' },
  { label:'Load Factor', value:loadPct.value, unit:'%', status:'Optimal', icon:'show_chart', tone:'cyan' },
  { label:'Top Oil Temp.', value:oilTemp.value, unit:'C', status:'Normal', icon:'device_thermostat', tone:'cyan' },
  { label:'Load Current', value:loadCurrent.value, unit:'A', status:'Normal', icon:'monitoring', tone:'green' },
  { label:'Active Power', value:activePower.value, unit:'MW', status:'Normal', icon:'offline_bolt', tone:'yellow' },
  { label:'Failure Probability', value:riskScore.value, unit:'%', status:'Low', icon:'warning', tone:'red' }
])

const sensorRows = computed(() => [
  { sensor:'Top Oil Temperature', value:oilTemp.value, unit:'C', status:'Normal', trend:62 },
  { sensor:'Winding Temperature (H)', value:windingTemp.value, unit:'C', status:windingTemp.value > 75 ? 'Warning' : 'Normal', trend:88 },
  { sensor:'Winding Temperature (L)', value:round1(windingTemp.value - 6.3), unit:'C', status:'Normal', trend:45 },
  { sensor:'Bottom Oil Temperature', value:round1(oilTemp.value - 4.2), unit:'C', status:'Normal', trend:73 },
  { sensor:'Oil Level', value:'Normal', unit:'-', status:'Normal', trend:31 }
])

const gasRows = [
  { gas:'Hydrogen (H2)', value:45, unit:'ppm', trend:44 },
  { gas:'Methane (CH4)', value:32, unit:'ppm', trend:58 },
  { gas:'Ethylene (C2H4)', value:18, unit:'ppm', trend:29 },
  { gas:'Acetylene (C2H2)', value:2, unit:'ppm', trend:76 },
  { gas:'Carbon Monoxide (CO)', value:25, unit:'ppm', trend:51 },
  { gas:'Carbon Dioxide (CO2)', value:350, unit:'ppm', trend:67 }
]

const alarms = computed(() => {
  const stationAlarms = station.value?.alarms || {}
  const active = Object.entries(stationAlarms)
    .filter(([,enabled]) => enabled)
    .map(([key],index) => ({
      label:alarmLabel(key),
      severity:index === 0 ? 'critical' : 'warning',
      icon:index === 0 ? 'report_problem' : 'warning',
      time:`14:${31 - index}:47`
    }))

  return active.length
    ? active
    : [
        { label:'High Winding Temperature (H)', severity:'critical', icon:'report_problem', time:'14:31:47' },
        { label:'Oil Temperature High', severity:'warning', icon:'warning', time:'14:30:12' },
        { label:'Cooling Fan #2 Failure', severity:'warning', icon:'warning', time:'14:28:01' },
        { label:'High Load', severity:'warning', icon:'warning', time:'14:27:33' },
        { label:'Buchholz Gas Detected', severity:'critical', icon:'report_problem', time:'14:25:10' }
      ]
})

const eventRows = computed(() =>
  alarms.value.map((alarm,index) => ({
    time:alarm.time,
    event:alarm.label,
    severity:index % 3 === 0 ? 'High' : index % 3 === 1 ? 'Medium' : 'Low',
    severityClass:index % 3 === 0 ? 'red' : index % 3 === 1 ? 'yellow' : 'green'
  }))
)

const anomalyRows = computed(() => [
  { parameter:'Top Oil Temperature', value:`${oilTemp.value} C`, range:`40 - ${thresholdValue('overheating', 90)} C`, deviation:'-24.6 C' },
  { parameter:'Winding Temperature (H)', value:`${windingTemp.value} C`, range:`50 - ${thresholdValue('cooling_winding', 95)} C`, deviation:'-16.4 C' },
  { parameter:'Load Current', value:`${loadCurrent.value} A`, range:'0 - 600 A', deviation:'-287.5 A' },
  { parameter:'Oil Pressure', value:'0.25 bar', range:'0.1 - 0.6 bar', deviation:'-0.35 bar' },
  { parameter:'Vibration (Tank)', value:'1.8 mm/s', range:'0 - 5 mm/s', deviation:'-3.2 mm/s' }
])

const insights = [
  { title:'Transformer is operating within normal parameters.', body:'All key indicators are in optimal range.', icon:'check_circle', tone:'green', time:'May 20, 14:30' },
  { title:'Load is expected to increase by 12% in next 3 days.', body:'No action required. System capacity is sufficient.', icon:'info', tone:'cyan', time:'May 20, 14:28' },
  { title:'Routine oil sampling recommended in next 15 days.', body:'Based on ageing factor and oil condition analysis.', icon:'build', tone:'white', time:'May 20, 14:25' }
]

const maintenancePriority = computed(() =>
  riskScore.value >= 70 || windingTemp.value >= 92
    ? 'Immediate'
    : riskScore.value >= 35 || windingTemp.value >= 82
      ? 'Planned'
      : 'Routine'
)

const maintenancePlan = computed(() => [
  {
    title:'Oil sampling and DGA validation',
    body:'Confirm gas trend and insulation moisture before the next load peak.',
    due:`${Math.max(7, Math.round((100 - riskScore.value) / 3))} days`,
    icon:'science',
    tone:'cyan'
  },
  {
    title:'Cooling bank inspection',
    body:`Fan stage follows ${oilTemp.value} C top-oil profile with ${Math.max(0, 90 - loadPct.value)}% overload headroom.`,
    due:windingTemp.value > 82 ? '24 h' : '14 days',
    icon:'mode_fan',
    tone:windingTemp.value > 82 ? 'yellow' : 'green'
  },
  {
    title:'OLTC contact resistance check',
    body:'Tap position is stable, schedule contact scan during the next low-load window.',
    due:'30 days',
    icon:'tune',
    tone:'white'
  },
  {
    title:'Protection relay self-test',
    body:'Verify 87T, 49, 63 and 51N relay chain before blackout scenario training.',
    due:riskScore.value > 35 ? '7 days' : '45 days',
    icon:'shield',
    tone:riskScore.value > 35 ? 'yellow' : 'green'
  }
])

const inspectionChecklist = computed(() => [
  { label:'Infrared scan of HV bushings', state:oilTemp.value > 80 ? 'watch' : 'clear', icon:'thermostat', tone:oilTemp.value > 80 ? 'yellow' : 'green' },
  { label:'Oil level and conservator bladder', state:'clear', icon:'oil_barrel', tone:'green' },
  { label:'Cooling fan stage command', state:windingTemp.value > 82 ? 'active' : 'standby', icon:'mode_fan', tone:windingTemp.value > 82 ? 'cyan' : 'white' },
  { label:'Grounding and neutral CT loop', state:'clear', icon:'electrical_services', tone:'green' },
  { label:'Relay event recorder download', state:alarms.value.length ? 'pending' : 'synced', icon:'receipt_long', tone:alarms.value.length ? 'yellow' : 'green' }
])

const eventTimeline = computed(() => [
  ...eventRows.value.map(row => ({
    time:row.time,
    severity:row.severity,
    tone:row.severityClass,
    title:row.event,
    detail:`Transformer ${transformer.value?.id || route.params.id} event captured by alarm engine.`
  })),
  {
    time:'14:22:18',
    severity:'Info',
    tone:'cyan',
    title:'Forecast recalculated',
    detail:`Next maintenance window adjusted to ${Math.max(12, Math.round((100 - riskScore.value) / 2))} days.`
  },
  {
    time:'14:20:44',
    severity:'Info',
    tone:'green',
    title:'Digital twin synchronized',
    detail:`Realtime model refreshed with ${loadPct.value}% loading and ${healthScore.value}/100 health score.`
  }
])

const eventInsights = computed(() => [
  {
    title:'Protection coordination is complete.',
    body:'Relay chain has armed states for differential, gas, thermal and ground fault protection.',
    icon:'verified',
    tone:'green',
    time:'Live'
  },
  {
    title:'Maintenance context is available.',
    body:`Priority is ${maintenancePriority.value.toLowerCase()} based on load, DGA, ageing and thermal stress.`,
    icon:'engineering',
    tone:maintenancePriority.value === 'Immediate' ? 'red' : maintenancePriority.value === 'Planned' ? 'yellow' : 'cyan',
    time:'AI'
  },
  {
    title:'Events are tied to operator action.',
    body:'The event log shows timeline, lifecycle state and recommended follow-up for operator review.',
    icon:'assignment_turned_in',
    tone:'white',
    time:'SCADA'
  }
])

function scatterStyle(index){
  const progress = (index - 1) / 47
  const jitterX = Math.sin(index * 2.13) * 2.6
  const jitterY = Math.sin(index * 1.31) * 5.4 + Math.cos(index * .77) * 3.2
  const x = 10 + progress * 78 + jitterX
  const y = 84 - progress * 62 + jitterY

  return {
    left:`${Math.max(5, Math.min(92, x))}%`,
    top:`${Math.max(10, Math.min(88, y))}%`
  }
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

const TrendPanel = defineComponent({
  name:'TrendPanel',
  props:{
    title:{ type:String, required:true },
    seed:{ type:Number, default:72 },
    legendA:{ type:String, default:'Actual' },
    legendB:{ type:String, default:'Forecast' },
    values:{ type:Array as PropType<number[]>, default:() => [] },
    footer:{ type:Array as PropType<any[]>, default:() => [] },
    sideStats:{ type:Array as PropType<any[]>, default:() => [] }
  },
  setup(props){
    return () => h('div', { class:'tt-card trend-panel' }, [
      h('div', { class:'card-header' }, [
        h('h2', props.title),
        h('div', { class:'legend' }, [
          h('span', [h('i', { class:'actual' }), props.legendA]),
          h('span', [h('i', { class:'forecast' }), props.legendB])
        ])
      ]),
      h('div', { class:'trend-body' }, [
        h(TransformerTwinMiniChart, { seed:props.seed, actualValues:props.values }),
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
    metrics:{ type:Array as PropType<any[]>, default:() => [] }
  },
  setup(props){
    return () => h('div', { class:'tt-card metric-card' }, [
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

const AgeingCard = defineComponent({
  name:'AgeingCard',
  setup(){
    return () => h('div', { class:'tt-card ageing-card' }, [
      h('h2', 'Ageing Factor'),
      h('div', { class:'ageing-layout' }, [
        h('div', { class:'ageing-gauge', style:{ '--ageing':`${ageingFactor.value}%` } }, [
          h('strong', `${ageingFactor.value}%`),
          h('span', 'Low')
        ]),
        h('div', { class:'condition-list' }, [
          h('div', [h('span', 'Insulation Condition'), h('strong', 'Good')]),
          h('div', [h('span', 'Oil Condition'), h('strong', 'Good')]),
          h('div', [h('span', 'Overall Health'), h('strong', 'Good')])
        ])
      ])
    ])
  }
})

const EnvironmentCard = defineComponent({
  name:'EnvironmentCard',
  props:{
    items:{ type:Array as PropType<any[]>, default:() => [] }
  },
  setup(props){
    return () => h('div', { class:'tt-card environment-card' }, [
      h('h2', 'Environmental Conditions'),
      h('div', { class:'environment-grid' }, props.items.map(item =>
        h('div', [
          h('span', { class:'material-icons' }, item.icon),
          h('small', item.label),
          h('strong', item.value)
        ])
      ))
    ])
  }
})
</script>

<style scoped>
.tt-scroll{
  flex:1;
  min-height:0;
  overflow:auto;
}

.tt-content{
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

h1{
  margin:0;
  color:#f5fbff;
  font-size:25px;
  line-height:1.12;
  font-weight:800;
}

.asset-meta{
  display:flex;
  align-items:center;
  gap:10px;
  margin-top:8px;
  color:#a7bac9;
  font-size:13px;
}

.online-badge,
.green-pill{
  padding:3px 9px;
  border-radius:5px;
  color:#71f23f;
  font-weight:800;
  background:rgba(113,242,63,.14);
}

.time-controls{
  display:flex;
  align-items:center;
  gap:6px;
}

.time-controls button{
  display:inline-flex;
  align-items:center;
  gap:6px;
  min-height:30px;
  padding:0 12px;
  border:1px solid rgba(64,196,255,.16);
  border-radius:5px;
  color:#b8c9d7;
  background:rgba(6,17,31,.72);
}

.time-controls button.scenario-button{
  color:#40c4ff;
  border-color:rgba(64,196,255,.35);
}

.time-controls button.active{
  color:#fff;
  background:#1479e8;
}

.range-short{
  display:none;
}

.tab-row{
  height:43px;
  display:grid;
  grid-template-columns:repeat(6,minmax(0,1fr));
  align-items:center;
  margin-bottom:10px;
  border:1px solid rgba(64,196,255,.14);
  border-radius:6px;
  background:rgba(6,17,31,.58);
}

.tab-row button{
  height:100%;
  border:0;
  border-right:1px solid rgba(255,255,255,.08);
  color:#c4d4df;
  font-size:12px;
  font-weight:800;
  text-transform:uppercase;
  background:transparent;
  cursor:pointer;
}

.tab-row button:last-child{
  border-right:0;
}

.tab-row button.active{
  color:#36c8ff;
  box-shadow:inset 0 -2px 0 #36c8ff;
}

.tt-card{
  min-width:0;
  overflow:hidden;
  border:1px solid rgba(64,196,255,.14);
  border-radius:8px;
  background:linear-gradient(180deg,rgba(8,19,34,.9),rgba(6,14,25,.9));
  box-shadow:0 14px 36px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.03);
}

.tt-card h2{
  margin:0;
  padding:12px 13px 8px;
  color:#f5fbff;
  font-size:13px;
  font-weight:800;
  text-transform:uppercase;
}

.card-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  padding-right:12px;
}

.overview-top-grid{
  display:grid;
  grid-template-columns:300px minmax(520px,1fr) 360px;
  gap:10px;
  margin-bottom:10px;
}

.measurements-card,
.overview-diagram-card,
.right-stack{
  min-height:300px;
}

.right-stack{
  display:grid;
  grid-template-rows:1fr 1fr;
  gap:10px;
}

.measurement-list{
  display:grid;
  padding:5px 12px 8px;
}

.measurement-list div{
  min-height:36px;
  display:grid;
  grid-template-columns:23px minmax(0,1fr) 58px 58px 30px;
  align-items:center;
  gap:8px;
  border-bottom:1px solid rgba(255,255,255,.055);
  color:#dce8ef;
  font-size:12px;
}

.measurement-spark{
  justify-self:end;
}

.measurement-list strong{
  color:#f5fbff;
  font-size:16px;
  font-weight:500;
  text-align:right;
}

.measurement-list em{
  color:#b3c4d0;
  font-size:11px;
  font-style:normal;
}

.text-link{
  display:flex;
  align-items:center;
  gap:5px;
  margin:3px 12px 10px;
  border:0;
  color:#36c8ff;
  font-size:12px;
  background:transparent;
}

.overview-diagram-card{
  display:grid;
  grid-template-rows:minmax(0,1fr) 44px;
}

.overview-diagram-card :deep(.diagram-card){
  min-height:0;
  height:100%;
  border:0;
  border-radius:0;
}

.diagram-footer{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  align-items:center;
  gap:12px;
  padding:0 22px;
  border-top:1px solid rgba(255,255,255,.08);
  color:#9fb4c3;
  font-size:12px;
  text-transform:uppercase;
}

.diagram-footer strong{
  margin-left:8px;
  color:#f5fbff;
  text-transform:none;
}

.health-card{
  display:grid;
  justify-items:center;
  align-content:center;
  text-align:center;
}

.health-gauge{
  position:relative;
  width:116px;
  aspect-ratio:1;
  display:grid;
  place-items:center;
  border-radius:50%;
  background:
    radial-gradient(circle at center,#091321 0 58%,transparent 59%),
    conic-gradient(#35dc58 0 78%, #f9d334 78% 88%, rgba(255,255,255,.14) 88%);
}

.health-gauge strong,
.health-gauge span,
.health-gauge em{
  grid-area:1 / 1;
}

.health-gauge strong{
  transform:translateY(-8px);
  font-size:32px;
}

.health-gauge span{
  transform:translate(26px,-6px);
  color:#d3e1ea;
  font-size:12px;
}

.health-gauge em{
  transform:translateY(29px);
  color:#5dec67;
  font-size:12px;
  font-style:normal;
  font-weight:800;
}

.health-card p{
  margin:6px 0 0;
  color:#9fb4c3;
  font-size:11px;
}

.active-alarms-card{
  display:grid;
  grid-template-rows:auto minmax(0,1fr) auto;
}

.alarm-count{
  min-width:26px;
  padding:3px 7px;
  border-radius:5px;
  color:white;
  font-size:12px;
  text-align:center;
  background:#ff3347;
}

.compact-alarm-list{
  display:grid;
  padding:0 12px;
}

.compact-alarm-list div,
.alarm-list div{
  min-height:28px;
  display:grid;
  grid-template-columns:22px minmax(0,1fr) 58px;
  align-items:center;
  gap:7px;
  border-bottom:1px solid rgba(255,255,255,.055);
  color:#dce8ef;
  font-size:11px;
}

.compact-alarm-list small,
.alarm-list small{
  color:#91a8b8;
  text-align:right;
}

.overview-chart-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:10px;
  margin-bottom:10px;
}

.trend-panel{
  min-height:210px;
}

.trend-body{
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  align-items:center;
  gap:8px;
  padding:0 12px;
}

.trend-panel :deep(.mini-chart){
  height:132px;
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

.legend .actual{
  background:#39a7ff;
}

.legend .forecast{
  background:#5bec67;
}

.trend-footer{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:8px;
  padding:0 12px 10px;
}

.trend-footer span,
.side-stats span{
  display:block;
  color:#9fb4c3;
  font-size:11px;
}

.trend-footer strong,
.side-stats strong{
  display:block;
  color:#f5fbff;
  font-size:14px;
}

.side-stats{
  display:grid;
  gap:8px;
  min-width:88px;
}

.side-stats div{
  padding:9px;
  border:1px solid rgba(255,255,255,.06);
  border-radius:6px;
  background:rgba(255,255,255,.025);
}

.overview-bottom-grid{
  display:grid;
  grid-template-columns:1.1fr .95fr 1fr;
  gap:10px;
}

.tt-table{
  width:100%;
  border-collapse:collapse;
  color:#dbe8ef;
  font-size:11px;
}

.tt-table th,
.tt-table td{
  padding:7px 12px;
  border-top:1px solid rgba(255,255,255,.06);
  text-align:left;
  white-space:nowrap;
}

.tt-table th{
  color:#91a8b8;
  font-weight:500;
}

.status-ok{
  padding:2px 6px;
  border-radius:4px;
  color:#52ee67;
  background:rgba(82,238,103,.12);
}

.status-ok.warning{
  color:#ffd233;
  background:rgba(255,210,51,.12);
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

.spark-path.cyan{
  stroke:#36c8ff;
  filter:drop-shadow(0 0 4px rgba(54,200,255,.42));
}

.spark-path.yellow{
  stroke:#ffb238;
  filter:drop-shadow(0 0 4px rgba(255,178,56,.42));
}

.dga-layout,
.loss-layout{
  display:grid;
  grid-template-columns:minmax(0,1fr) 120px;
  align-items:center;
  gap:10px;
  padding-right:12px;
}

.loss-layout{
  grid-template-columns:132px minmax(0,1fr);
  gap:16px;
  padding:4px 16px 14px 14px;
}

.donut{
  width:132px;
  aspect-ratio:1;
  display:grid;
  place-items:center;
  border-radius:50%;
  background:
    radial-gradient(circle at center,#091321 0 54%,transparent 55%),
    conic-gradient(#2a87dd 0 18%, #35dc58 18% 84%, #ed7b2f 84% 93%, #8752c9 93%);
}

.donut.small{
  width:104px;
}

.donut strong,
.donut span{
  grid-area:1 / 1;
}

.donut strong{
  transform:translateY(-10px);
  color:#dbe8ef;
  font-size:12px;
  font-weight:500;
}

.donut span{
  transform:translateY(13px);
  color:#52ee67;
  font-weight:800;
}

.digital-grid{
  display:grid;
  grid-template-columns:250px minmax(540px,1fr) 360px;
  gap:10px;
}

.left-column,
.right-column{
  display:grid;
  gap:10px;
  align-content:start;
}

.digital-grid .center-diagram{
  min-height:506px;
}

.status-list{
  display:grid;
  padding:3px 13px 13px;
}

.status-row{
  min-height:35px;
  display:grid;
  grid-template-columns:24px minmax(0,1fr) auto;
  align-items:center;
  gap:8px;
  border-bottom:1px solid rgba(255,255,255,.06);
  color:#d8e5ee;
  font-size:12px;
}

.status-row strong{
  color:#f5fbff;
  font-weight:700;
}

.component-list{
  display:grid;
  gap:5px;
  padding:0 13px 13px;
}

.component-list div{
  display:flex;
  justify-content:space-between;
  color:#b8cad6;
  font-size:12px;
}

.component-list i{
  width:7px;
  height:7px;
  display:inline-block;
  margin-right:7px;
  border-radius:50%;
  background:#67f06c;
  box-shadow:0 0 10px rgba(103,240,108,.7);
}

.component-list strong{
  color:#dffbea;
  font-weight:500;
}

.heatmap-visual{
  position:relative;
  min-height:178px;
  margin:0 12px 12px;
  overflow:hidden;
  border-radius:6px;
  background:
    linear-gradient(90deg,rgba(21,82,255,.95),rgba(34,218,255,.85),rgba(255,224,56,.92),rgba(255,52,49,.86)),
    #071526;
}

.heatmap-visual img{
  position:absolute;
  inset:9% 9% 8%;
  width:76%;
  height:82%;
  object-fit:contain;
  filter:grayscale(1) contrast(1.35);
  mix-blend-mode:multiply;
}

.temperature-scale{
  position:absolute;
  top:20px;
  right:14px;
  bottom:20px;
  display:grid;
  grid-template-rows:auto 1fr auto;
  gap:7px;
  color:#f5fbff;
  font-size:11px;
}

.temperature-scale i{
  width:13px;
  border-radius:999px;
  background:linear-gradient(180deg,#ff3331,#ffe33b,#23e4ff,#1852ff);
}

.ageing-layout{
  display:grid;
  grid-template-columns:105px minmax(0,1fr);
  gap:16px;
  align-items:center;
  padding:1px 13px 13px;
}

.ageing-gauge{
  width:86px;
  aspect-ratio:1;
  display:grid;
  place-items:center;
  border-radius:50%;
  background:
    radial-gradient(circle at center,#091321 0 52%,transparent 53%),
    conic-gradient(#67f06c var(--ageing), rgba(255,255,255,.12) 0);
}

.ageing-gauge strong,
.ageing-gauge span{
  grid-area:1 / 1;
}

.ageing-gauge strong{
  transform:translateY(-7px);
  font-size:21px;
}

.ageing-gauge span{
  transform:translateY(17px);
  color:#67f06c;
  font-size:11px;
  font-weight:800;
}

.condition-list{
  display:grid;
  gap:10px;
  padding-left:16px;
  border-left:1px solid rgba(255,255,255,.1);
}

.condition-list div{
  display:flex;
  justify-content:space-between;
  gap:10px;
  color:#aabcca;
  font-size:11px;
}

.condition-list strong{
  color:#67f06c;
}

.environment-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:8px;
  padding:2px 12px 13px;
}

.environment-grid div{
  display:grid;
  justify-items:center;
  gap:5px;
  color:#aabcca;
  text-align:center;
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
  font-size:16px;
}

.digital-bottom-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
  margin-top:10px;
}

.metric-grid{
  display:grid;
  grid-template-columns:repeat(7,minmax(0,1fr));
  gap:8px;
  padding:0 12px 12px;
}

.metric-grid div{
  position:relative;
  min-height:58px;
  padding:8px;
  overflow:hidden;
  border:1px solid rgba(255,255,255,.07);
  border-radius:5px;
  background:rgba(255,255,255,.025);
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

.kpi-card span,
.kpi-card small{
  display:block;
}

.kpi-card span{
  color:#aabcca;
  font-size:12px;
}

.kpi-card strong{
  display:block;
  margin-top:4px;
  color:#f5fbff;
  font-size:24px;
  font-weight:500;
}

.kpi-card em{
  color:#c4d3df;
  font-size:14px;
  font-style:normal;
}

.analytics-chart-grid{
  display:grid;
  grid-template-columns:1fr 1fr 1.25fr;
  gap:10px;
  margin-bottom:10px;
}

.analytics-chart-grid .trend-panel{
  min-height:225px;
}

.analytics-mid-grid{
  display:grid;
  grid-template-columns:1.08fr 1.12fr .92fr 1.38fr;
  gap:10px;
  margin-bottom:10px;
}

.loss-list{
  display:grid;
  gap:11px;
  color:#dbe8ef;
  font-size:12px;
}

.loss-list > div{
  display:grid;
  grid-template-columns:14px minmax(0,1fr);
  gap:10px;
  align-items:start;
  line-height:1.3;
}

.loss-list i{
  width:9px;
  height:9px;
  margin-top:4px;
  border-radius:3px;
}

.loss-list span,
.loss-list em,
.loss-list strong{
  display:block;
  min-width:0;
}

.loss-list em{
  color:#dbe8ef;
  font-style:normal;
  white-space:normal;
}

.loss-list strong{
  color:#c0d1dc;
  font-weight:500;
  white-space:normal;
}

.correlation-card{
  position:relative;
}

.scatter{
  position:relative;
  height:156px;
  margin:4px 16px 14px;
  overflow:hidden;
  border-left:1px solid rgba(255,255,255,.16);
  border-bottom:1px solid rgba(255,255,255,.16);
  background:
    linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px),
    linear-gradient(0deg, rgba(255,255,255,.04) 1px, transparent 1px);
  background-size:34px 30px;
}

.scatter::after{
  content:'';
  position:absolute;
  left:10%;
  width:78%;
  top:73%;
  height:2px;
  transform:rotate(-32deg);
  transform-origin:left center;
  border-radius:999px;
  background:linear-gradient(90deg,rgba(57,167,255,.25),#39a7ff);
  box-shadow:0 0 10px rgba(57,167,255,.45);
}

.scatter i{
  position:absolute;
  width:4px;
  height:4px;
  border-radius:50%;
  background:#39a7ff;
  box-shadow:0 0 8px rgba(57,167,255,.8);
}

.correlation-score{
  position:absolute;
  top:44px;
  right:15px;
  width:128px;
  padding:10px;
  border-radius:6px;
  background:rgba(5,12,22,.72);
}

.correlation-score span,
.correlation-score em{
  display:block;
  color:#aabcca;
  font-size:11px;
}

.correlation-score strong{
  display:block;
  color:#f5fbff;
  font-size:24px;
  font-weight:500;
}

.correlation-score em{
  color:#52ee67;
  font-style:normal;
}

.analytics-bottom-grid{
  display:grid;
  grid-template-columns:minmax(620px,1.35fr) minmax(440px,.9fr);
  gap:10px;
}

.schematic-grid{
  display:grid;
  grid-template-columns:minmax(620px,1fr) 360px;
  gap:10px;
}

.schematic-diagram-card{
  min-height:580px;
}

.single-line-diagram{
  min-height:520px;
  padding:12px;
}

.single-line-diagram svg{
  width:100%;
  height:100%;
  min-height:500px;
  display:block;
}

.diagram-grid-line{
  fill:none;
  stroke:rgba(116,155,188,.07);
  stroke-width:1;
}

.energized-line,
.aux-line{
  fill:none;
  stroke:#40c4ff;
  stroke-width:5;
  stroke-linecap:round;
  filter:url(#schematicGlow);
}

.aux-line{
  stroke:#5bec67;
  stroke-width:3;
  stroke-dasharray:10 8;
}

.zone-ring{
  fill:rgba(64,196,255,.035);
  stroke:rgba(64,196,255,.32);
  stroke-width:2;
  stroke-dasharray:8 8;
}

.breaker-symbol rect{
  fill:#07111f;
  stroke:#d8eefb;
  stroke-width:2;
}

.breaker-symbol path{
  fill:none;
  stroke:#ffb238;
  stroke-width:3;
  stroke-linecap:round;
}

.transformer-symbol circle{
  fill:rgba(64,196,255,.055);
  stroke:#40c4ff;
  stroke-width:3;
  filter:url(#schematicGlow);
}

.transformer-symbol text,
.schematic-label text,
.relay-node text{
  fill:#f5fbff;
  font-weight:800;
  text-anchor:middle;
}

.transformer-symbol text{
  font-size:17px;
}

.schematic-label text{
  font-size:13px;
  text-anchor:start;
}

.schematic-label text + text{
  fill:#40c4ff;
  font-size:18px;
}

.relay-node circle{
  fill:#081523;
  stroke:#5bec67;
  stroke-width:2;
  filter:url(#schematicGlow);
}

.relay-node.thermal circle,
.relay-node.gas circle{
  stroke:#ffb238;
}

.relay-node text{
  fill:#f5fbff;
  font-size:12px;
}

.schematic-side,
.maintenance-hero-card{
  display:grid;
  gap:10px;
  align-content:start;
}

.protection-chain,
.maintenance-plan,
.inspection-list,
.event-timeline,
.alarm-lifecycle{
  display:grid;
  padding:0 13px 13px;
}

.protection-chain div,
.maintenance-plan div,
.inspection-list div,
.event-timeline div,
.alarm-lifecycle div{
  min-height:44px;
  display:grid;
  align-items:center;
  gap:8px;
  border-top:1px solid rgba(116,155,188,.095);
}

.protection-chain div{
  grid-template-columns:42px minmax(0,1fr) 74px;
}

.protection-chain span{
  color:#40c4ff;
  font-weight:900;
}

.protection-chain strong,
.maintenance-plan strong,
.inspection-list span,
.event-timeline strong,
.alarm-lifecycle strong{
  color:#f5fbff;
  font-size:12px;
}

.protection-chain em,
.inspection-list strong,
.event-timeline span{
  font-size:10px;
  font-style:normal;
  font-weight:900;
  text-align:right;
  text-transform:uppercase;
}

.maintenance-grid{
  display:grid;
  grid-template-columns:310px minmax(460px,1fr) minmax(360px,.85fr);
  gap:10px;
  margin-bottom:10px;
}

.maintenance-hero{
  margin:0 13px 10px;
  padding:14px;
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
  font-size:30px;
  line-height:1;
}

.maintenance-hero span,
.maintenance-hero em,
.maintenance-plan small,
.event-timeline small,
.alarm-lifecycle small{
  color:#aabcca;
  font-size:11px;
  line-height:1.35;
}

.maintenance-hero em,
.maintenance-plan em{
  font-style:normal;
}

.maintenance-plan div{
  grid-template-columns:28px minmax(0,1fr) 62px;
  align-items:start;
  padding:11px 0;
}

.maintenance-plan span,
.maintenance-plan strong,
.maintenance-plan small,
.alarm-lifecycle span,
.alarm-lifecycle strong,
.alarm-lifecycle small{
  display:block;
  min-width:0;
}

.maintenance-plan em{
  color:#40c4ff;
  font-size:11px;
  font-weight:900;
  text-align:right;
}

.inspection-list div{
  grid-template-columns:26px minmax(0,1fr) 68px;
}

.maintenance-bottom-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
}

.events-grid{
  display:grid;
  grid-template-columns:minmax(560px,1.2fr) minmax(360px,.75fr) minmax(420px,.9fr);
  gap:10px;
}

.event-timeline div{
  grid-template-columns:58px 64px minmax(0,.7fr) minmax(0,1.3fr);
}

.event-timeline time{
  color:#91a8b8;
  font-size:11px;
  font-variant-numeric:tabular-nums;
}

.event-timeline span{
  text-align:left;
}

.alarm-lifecycle div{
  grid-template-columns:28px minmax(0,1fr);
  align-items:start;
  padding:10px 0;
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
  padding:12px 112px 10px 0;
  border-top:1px solid rgba(255,255,255,.06);
}

.insight-list > div > div{
  min-width:0;
}

.insight-list strong,
.insight-list span{
  display:block;
}

.insight-list strong{
  color:#f5fbff;
  font-size:12px;
  line-height:1.3;
}

.insight-list span,
.insight-list small{
  color:#aabcca;
  font-size:11px;
  line-height:1.35;
}

.insight-list small{
  position:absolute;
  top:14px;
  right:0;
  width:102px;
  text-align:right;
}

.empty-tab-card{
  min-height:260px;
  display:grid;
  align-content:center;
  justify-items:center;
  color:#aabcca;
}

.green{ color:#67f06c !important; }
.cyan{ color:#36c8ff !important; }
.yellow{ color:#ffb238 !important; }
.red{ color:#ff3347 !important; }
.white{ color:#eaf5fc !important; }
.critical{ color:#ff3347 !important; }
.warning{ color:#ffb238 !important; }
.blue{ background:#2a87dd; }
.green-bg{ background:#35dc58; }
.orange-bg{ background:#ed7b2f; }
.purple-bg{ background:#8752c9; }

/* Reference-dashboard visual polish */
.tt-content{
  background:
    radial-gradient(circle at 62% 4%, rgba(36,149,255,.08), transparent 25%),
    linear-gradient(90deg, rgba(64,196,255,.035) 1px, transparent 1px),
    linear-gradient(0deg, rgba(64,196,255,.025) 1px, transparent 1px);
  background-size:auto,26px 26px,26px 26px;
}

.title-row{
  min-height:50px;
  margin-bottom:10px;
}

h1{
  font-size:24px;
  letter-spacing:0;
  text-shadow:0 0 18px rgba(64,196,255,.13);
}

.asset-meta{
  color:#9fb5c6;
}

.online-badge,
.green-pill{
  border:1px solid rgba(113,242,63,.22);
  border-radius:4px;
  box-shadow:inset 0 0 16px rgba(113,242,63,.07);
}

.time-controls button{
  color:#c2d2de;
  border-color:rgba(91,151,194,.24);
  border-radius:4px;
  background:linear-gradient(180deg,rgba(10,24,40,.92),rgba(5,13,24,.88));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.035);
}

.time-controls button.active{
  color:#fff;
  border-color:rgba(64,196,255,.48);
  background:linear-gradient(180deg,#1688ef,#0c64bd);
  box-shadow:0 0 18px rgba(40,143,255,.22), inset 0 1px 0 rgba(255,255,255,.18);
}

.tab-row{
  height:44px;
  border-color:rgba(91,151,194,.2);
  border-radius:5px;
  background:linear-gradient(180deg,rgba(8,20,34,.72),rgba(5,13,24,.72));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.035);
}

.tab-row button{
  color:#c6d4de;
  letter-spacing:0;
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

.tt-card{
  position:relative;
  border-color:rgba(91,151,194,.24);
  border-radius:5px;
  background:
    linear-gradient(90deg, rgba(64,196,255,.035) 1px, transparent 1px),
    linear-gradient(0deg, rgba(64,196,255,.025) 1px, transparent 1px),
    linear-gradient(180deg,rgba(9,21,36,.9),rgba(5,13,24,.92));
  background-size:24px 24px,24px 24px,auto;
  box-shadow:0 15px 38px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.045);
}

.tt-card::before{
  content:'';
  position:absolute;
  inset:0 0 auto;
  height:1px;
  pointer-events:none;
  background:linear-gradient(90deg,transparent,rgba(78,203,255,.35),transparent);
}

.tt-card > *{
  position:relative;
}

.tt-card h2{
  color:#f7fbff;
  font-size:12px;
  letter-spacing:0;
}

.measurement-list div,
.status-row,
.compact-alarm-list div,
.alarm-list div,
.tt-table th,
.tt-table td{
  border-color:rgba(116,155,188,.095);
}

.measurement-list div:hover,
.status-row:hover,
.compact-alarm-list div:hover{
  background:rgba(64,196,255,.035);
}

.measurement-list strong,
.status-row strong,
.metric-grid strong,
.trend-footer strong,
.side-stats strong,
.tt-table td{
  font-variant-numeric:tabular-nums;
}

.health-gauge{
  width:130px;
  background:
    radial-gradient(circle at center,#091522 0 57%,transparent 58%),
    conic-gradient(#35dc58 0 76%, #f9d334 76% 86%, #496273 86% 100%);
  filter:drop-shadow(0 0 14px rgba(53,220,88,.2));
}

.health-gauge::after,
.donut::after,
.ageing-gauge::after{
  content:'';
  position:absolute;
  inset:10px;
  border-radius:50%;
  border:1px solid rgba(255,255,255,.035);
}

.trend-panel :deep(.mini-chart),
.tt-content .trend-panel .mini-chart{
  min-height:132px;
  padding:0 4px 2px;
}

.side-stats div,
.metric-grid div{
  border-color:rgba(91,151,194,.18);
  border-radius:4px;
  background:linear-gradient(180deg,rgba(10,24,40,.64),rgba(6,14,25,.58));
}

.tt-table tbody tr:hover{
  background:rgba(64,196,255,.035);
}

.status-ok{
  border:1px solid rgba(82,238,103,.14);
  border-radius:3px;
}

.digital-grid .center-diagram{
  min-height:536px;
}

.heatmap-visual{
  border:1px solid rgba(91,151,194,.18);
  border-radius:4px;
  background:
    linear-gradient(90deg,rgba(17,70,255,.94),rgba(17,207,255,.78) 37%,rgba(255,222,56,.88) 64%,rgba(255,54,49,.88)),
    #071526;
  box-shadow:inset 0 0 40px rgba(0,0,0,.28);
}

.heatmap-visual::after{
  content:'';
  position:absolute;
  inset:0;
  pointer-events:none;
  background:
    linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px),
    linear-gradient(0deg,rgba(255,255,255,.04) 1px,transparent 1px);
  background-size:18px 18px;
  mix-blend-mode:screen;
}

.temperature-scale i{
  width:12px;
  box-shadow:0 0 13px rgba(64,196,255,.26);
}

.donut,
.ageing-gauge{
  position:relative;
  box-shadow:0 0 18px rgba(53,220,88,.16);
}

.correlation-score{
  border:1px solid rgba(91,151,194,.18);
  background:linear-gradient(180deg,rgba(8,18,32,.88),rgba(4,11,20,.9));
  box-shadow:0 14px 30px rgba(0,0,0,.32);
}

@media (max-width: 1480px){
  .overview-top-grid,
  .digital-grid{
    grid-template-columns:230px minmax(360px,1fr) 285px;
  }

  .overview-chart-grid,
  .analytics-kpi-grid{
    grid-template-columns:repeat(3,minmax(0,1fr));
  }

  .metric-grid{
    grid-template-columns:repeat(4,minmax(0,1fr));
  }

  .measurement-list div{
    grid-template-columns:20px minmax(0,1fr) 44px 50px 24px;
    gap:6px;
    font-size:11px;
  }

  .measurement-list strong{
    font-size:14px;
  }

  .overview-bottom-grid,
  .analytics-mid-grid,
  .maintenance-grid,
  .events-grid{
    grid-template-columns:1fr 1fr;
  }

  .schematic-grid{
    grid-template-columns:1fr;
  }

  .digital-grid .center-diagram{
    min-height:490px;
  }

  .tt-card h2{
    font-size:12px;
  }
}

@media (max-width: 1180px){
  .tt-scroll{
    overflow:visible;
  }

  .title-row,
  .asset-meta{
    align-items:flex-start;
    flex-direction:column;
  }

  .overview-top-grid,
  .overview-chart-grid,
  .overview-bottom-grid,
  .digital-grid,
  .digital-bottom-grid,
  .analytics-kpi-grid,
  .analytics-chart-grid,
  .analytics-mid-grid,
  .analytics-bottom-grid,
  .maintenance-grid,
  .maintenance-bottom-grid,
  .events-grid{
    grid-template-columns:1fr;
  }

  .digital-grid .center-diagram{
    min-height:520px;
  }
}

@media (max-width: 760px){
  .range-long{
    display:none;
  }

  .range-short{
    display:inline;
  }

  .tt-content{
    padding:14px;
  }

  h1{
    font-size:24px;
  }

  .time-controls{
    flex-wrap:wrap;
  }

  .tab-row{
    height:auto;
    grid-template-columns:repeat(2,minmax(0,1fr));
  }

  .tab-row button{
    min-height:35px;
  }

  .diagram-footer,
  .metric-grid,
  .environment-grid{
    grid-template-columns:repeat(2,minmax(0,1fr));
  }

  .measurement-list div{
    grid-template-columns:20px minmax(0,1fr) auto 28px;
    gap:6px;
  }

  .measurement-list .measurement-spark{
    display:none;
  }

  .dga-layout,
  .loss-layout,
  .ageing-layout,
  .event-timeline div,
  .maintenance-plan div,
  .inspection-list div{
    grid-template-columns:1fr;
  }

  .tt-table{
    font-size:10px;
  }

  .tt-table th,
  .tt-table td{
    padding:6px 8px;
  }
}
</style>

<style>
.tt-content .trend-panel{
  min-height:210px;
}

.tt-content .trend-panel h2,
.tt-content .metric-card h2,
.tt-content .ageing-card h2,
.tt-content .environment-card h2{
  margin:0;
  padding:12px 13px 8px;
  color:#f5fbff;
  font-size:13px;
  font-weight:800;
  text-transform:uppercase;
}

.tt-content .trend-body{
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  align-items:center;
  gap:8px;
  padding:0 12px;
}

.tt-content .trend-panel .mini-chart{
  height:132px;
}

.tt-content .legend{
  display:flex;
  gap:12px;
  color:#91a8b8;
  font-size:10px;
}

.tt-content .legend span{
  display:flex;
  align-items:center;
  gap:5px;
}

.tt-content .legend i{
  width:15px;
  height:4px;
  display:block;
  border-radius:999px;
}

.tt-content .legend .actual{
  background:#39a7ff;
}

.tt-content .legend .forecast{
  background:#5bec67;
}

.tt-content .trend-footer{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:8px;
  padding:0 12px 10px;
}

.tt-content .trend-footer span,
.tt-content .side-stats span{
  display:block;
  color:#9fb4c3;
  font-size:11px;
}

.tt-content .trend-footer strong,
.tt-content .side-stats strong{
  display:block;
  color:#f5fbff;
  font-size:14px;
}

.tt-content .side-stats{
  display:grid;
  gap:8px;
  min-width:88px;
}

.tt-content .side-stats div{
  padding:9px;
  border:1px solid rgba(255,255,255,.06);
  border-radius:6px;
  background:rgba(255,255,255,.025);
}

.tt-content .metric-grid{
  display:grid;
  grid-template-columns:repeat(7,minmax(0,1fr));
  gap:8px;
  padding:0 12px 12px;
}

.tt-content .metric-grid div{
  position:relative;
  min-height:58px;
  padding:8px;
  overflow:hidden;
  border:1px solid rgba(255,255,255,.07);
  border-radius:5px;
  background:rgba(255,255,255,.025);
}

.tt-content .metric-grid span,
.tt-content .metric-grid strong,
.tt-content .metric-grid em{
  display:block;
}

.tt-content .metric-grid span{
  color:#a4b7c7;
  font-size:10px;
}

.tt-content .metric-grid strong{
  margin-top:5px;
  color:#f5fbff;
  font-size:18px;
  font-weight:500;
}

.tt-content .metric-grid em{
  display:inline;
  color:#b4c6d3;
  font-size:12px;
  font-style:normal;
}

.tt-content .metric-grid b{
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

.tt-content .ageing-layout{
  display:grid;
  grid-template-columns:105px minmax(0,1fr);
  gap:16px;
  align-items:center;
  padding:1px 13px 13px;
}

.tt-content .environment-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:8px;
  padding:2px 12px 13px;
}

.tt-content .environment-grid div{
  display:grid;
  justify-items:center;
  gap:5px;
  color:#aabcca;
  text-align:center;
}

.tt-content .environment-grid .material-icons{
  color:#d1e1ec;
  font-size:24px;
}

.tt-content .environment-grid small{
  font-size:10px;
}

.tt-content .environment-grid strong{
  color:#f5fbff;
  font-size:16px;
}

.tt-content .spark-line{
  width:52px;
  height:18px;
}

.tt-content .spark-grid{
  fill:none;
  stroke:rgba(143,169,184,.18);
  stroke-width:1;
}

.tt-content .spark-path{
  fill:none;
  stroke:#35dc58;
  stroke-width:1.8;
  stroke-linecap:round;
  stroke-linejoin:round;
  filter:drop-shadow(0 0 4px rgba(53,220,88,.42));
}

.tt-content .spark-path.cyan{
  stroke:#36c8ff;
  filter:drop-shadow(0 0 4px rgba(54,200,255,.42));
}

.tt-content .spark-path.yellow{
  stroke:#ffb238;
  filter:drop-shadow(0 0 4px rgba(255,178,56,.42));
}

.tt-content .trend-panel,
.tt-content .metric-card,
.tt-content .ageing-card,
.tt-content .environment-card{
  position:relative;
  border-color:rgba(91,151,194,.24);
  border-radius:5px;
  background:
    linear-gradient(90deg, rgba(64,196,255,.035) 1px, transparent 1px),
    linear-gradient(0deg, rgba(64,196,255,.025) 1px, transparent 1px),
    linear-gradient(180deg,rgba(9,21,36,.9),rgba(5,13,24,.92));
  background-size:24px 24px,24px 24px,auto;
  box-shadow:0 15px 38px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.045);
}

.tt-content .trend-panel::before,
.tt-content .metric-card::before,
.tt-content .ageing-card::before,
.tt-content .environment-card::before{
  content:'';
  position:absolute;
  inset:0 0 auto;
  height:1px;
  pointer-events:none;
  background:linear-gradient(90deg,transparent,rgba(78,203,255,.35),transparent);
}

.tt-content .trend-panel h2,
.tt-content .metric-card h2,
.tt-content .ageing-card h2,
.tt-content .environment-card h2{
  color:#f7fbff;
  font-size:12px;
  letter-spacing:0;
}

.tt-content .trend-footer strong,
.tt-content .side-stats strong,
.tt-content .metric-grid strong,
.tt-content .environment-grid strong{
  font-variant-numeric:tabular-nums;
}

.tt-content .side-stats div,
.tt-content .metric-grid div{
  border-color:rgba(91,151,194,.18);
  border-radius:4px;
  background:linear-gradient(180deg,rgba(10,24,40,.64),rgba(6,14,25,.58));
}

.tt-content .metric-grid div::after{
  content:'';
  position:absolute;
  inset:auto 8px 0;
  height:1px;
  background:linear-gradient(90deg,transparent,rgba(64,196,255,.22),transparent);
}

@media (max-width: 1480px){
  .tt-content .metric-grid{
    grid-template-columns:repeat(4,minmax(0,1fr));
  }
}

@media (max-width: 760px){
  .tt-content .metric-grid,
  .tt-content .environment-grid{
    grid-template-columns:repeat(2,minmax(0,1fr));
  }

  .tt-content .ageing-layout{
    grid-template-columns:1fr;
  }
}
</style>
