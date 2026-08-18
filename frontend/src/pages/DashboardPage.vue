<template>
  <q-layout view="lHh Lpr lFf">
    <Sidebar />

    <q-page-container>
      <q-page class="dashboard-page dashboard-noc">
        <Topbar
          @open-topology="topologyOpen = true"
          @open-notifications="openNotifications"
        />

        <!-- <q-banner
          v-if="store.error"
          rounded
          class="bg-red-10 text-red-2"
        >
          {{ store.error }}
        </q-banner> -->

        <!-- <RealtimeMetricsTicker
          :summary="store.summary"
          :connection="store.connection"
          :total-load="store.totalLoadMW"
          :blackout="store.blackout"
        /> -->

        <div class="dashboard-workspace noc-workspace">
          <main class="primary-ops-column">
            <section class="map-zone">
              <DashboardMap :focus-station="stationFocusRequest" />
            </section>

            <section class="operator-kpi-row">
              <q-card
                v-for="metric in operatorMetrics"
                :key="metric.label"
                flat
                bordered
                class="operator-kpi-card"
              >
                <q-card-section class="q-pa-sm">
                  <div class="section-kicker">{{ metric.label }}</div>
                  <div class="operator-kpi-value">
                    {{ metric.value }}<small>{{ metric.unit }}</small>
                  </div>
                  <div :class="['operator-kpi-trend', metric.trendClass]">
                    {{ metric.trend }}
                  </div>
                  <svg
                    class="mini-line-chart q-mt-xs"
                    viewBox="0 0 140 42"
                    preserveAspectRatio="none"
                  >
                    <polyline
                      :points="linePoints(metric.spark, 140, 42)"
                      :class="['glow-line', metric.chartClass]"
                    />
                  </svg>
                </q-card-section>
              </q-card>
            </section>

            <section class="ops-drawer-layout">
              <div class="ops-drawer-content">
                <transition name="ops-expand" mode="out-in">
                  <ActiveAlarmsEventsPanel
                    v-if="activeOpsPanel === 'alarms'"
                    key="alarms"
                    :events="store.eventStream"
                    :top-risk-substations="store.topRiskSubstations"
                    :open-register-signal="notificationOpenSignal"
                    class="ops-panel-card"
                    @focus-station="focusStationOnMap"
                  />

                  <AlarmCorrelationPanel
                    v-else-if="activeOpsPanel === 'correlation'"
                    key="correlation"
                    :correlations="store.correlations"
                    class="ops-panel-card"
                    @select="store.openRootCause"
                  />

                  <AlarmRootCausePanel
                    v-else-if="activeOpsPanel === 'rootCause'"
                    key="rootCause"
                    :root-cause="store.activeRootCause"
                    class="ops-panel-card"
                  />

                  <RealtimeEventStream
                    v-else
                    key="events"
                    :events="store.eventStream"
                    class="ops-panel-card"
                  />
                </transition>
              </div>

              <div class="ops-icon-rail">
                <q-btn
                  v-for="panel in opsPanels"
                  :key="panel.key"
                  round
                  dense
                  flat
                  size="11px"
                  :icon="panel.icon"
                  :color="activeOpsPanel === panel.key ? 'cyan' : 'blue-grey-3'"
                  :class="['ops-rail-btn', { active: activeOpsPanel === panel.key }]"
                  @click="activeOpsPanel = panel.key"
                >
                  <q-tooltip anchor="center left" self="center right">
                    {{ panel.label }}
                  </q-tooltip>
                </q-btn>
              </div>
            </section>
          </main>

          <aside class="right-rail noc-right-rail">
            <LoadForecastCard :points="store.forecast" />

            <BlackoutPredictionCard
              :prediction="store.blackout"
              :top-risk="store.topRiskSubstations"
            />

            <TopRiskSubstationsCard
              :stations="store.topRiskSubstations"
              @select-station="focusStationOnMap"
            />

            <AIInsightsPanel :insights="store.insights" />

            <OutageRiskMapCard :stations="store.topRiskSubstations" />
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

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useSensorStore } from '../stores/sensorStore'
import Sidebar from '../components/dashboard/layout/Sidebar.vue'
import Topbar from '../components/dashboard/layout/Topbar.vue'
import DashboardMap from '../components/dashboard/map/DashboardMap.vue'
import BlackoutPredictionCard from '../components/dashboard/right-sidebar/BlackoutPredictionCard.vue'
import TopRiskSubstationsCard from '../components/dashboard/right-sidebar/TopRiskSubstationsCard.vue'
import AIInsightsPanel from '../components/dashboard/right-sidebar/AIInsightsPanel.vue'
import LoadForecastCard from '../components/dashboard/right-sidebar/LoadForecastCard.vue'
import OutageRiskMapCard from '../components/dashboard/right-sidebar/OutageRiskMapCard.vue'
import ActiveAlarmsEventsPanel from '../components/dashboard/operations/alarms/ActiveAlarmsEventsPanel.vue'
import AlarmCorrelationPanel from '../components/dashboard/operations/alarms/AlarmCorrelationPanel.vue'
import AlarmRootCausePanel from '../components/dashboard/operations/alarms/AlarmRootCausePanel.vue'
import RealtimeEventStream from '../components/dashboard/operations/RealtimeEventStream.vue'
import SystemTopologyDialog from '../components/dashboard/system/SystemTopologyDialog.vue'
import { useI18n } from '../i18n'

const store = useSensorStore()
const { t } = useI18n()
const topologyOpen = ref(false)
const activeOpsPanel = ref('alarms')
const stationFocusRequest = ref(null)
const notificationOpenSignal = ref(0)

const opsPanels = computed(() => [
  { key:'alarms', label:t('dashboard.activeAlarmsEvents'), icon:'table_rows' },
  { key:'correlation', label:t('dashboard.alarmCorrelation'), icon:'hub' },
  { key:'rootCause', label:t('dashboard.rootCauseAnalysis'), icon:'account_tree' },
  { key:'events', label:t('dashboard.realtimeEventStream'), icon:'stream' }
])

const voltageStability = computed(() => {
  const latest = pointValue(store.metricHistory?.voltageStability?.at(-1))
  const fallback = Math.max(91, Math.min(99, store.summary.gridHealth + 4))

  return Math.round((latest || fallback) * 10) / 10
})

const energyEfficiency = computed(() => {
  const latest = pointValue(store.metricHistory?.energyEfficiency?.at(-1))
  const fallback = Math.max(70, Math.min(96, store.summary.gridHealth - 3))

  return Math.round((latest || fallback) * 10) / 10
})

const avgThd = computed(() => {
  const values = store.stations
    .map(station => station.electrical?.harmonics_thd)
    .filter(Number.isFinite)

  if(!values.length) return 3.2

  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
})

const sparkSeeds = [28, 32, 42, 35, 48, 38, 52, 45, 58, 54, 66, 72]

function spark(offset = 0){
  return sparkSeeds.map((value, index) =>
    Math.max(12, Math.min(92, value + ((index + offset) % 4) * 4 - offset))
  )
}

function historyValues(key, offset = 0){
  const values = store.metricHistory?.[key] || []

  return values.length > 1
    ? values
    : spark(offset)
}

function pointValue(point){
  return typeof point === 'number'
    ? point
    : Number(point?.value) || 0
}

function pointTimestamp(point){
  if(!point || typeof point !== 'object' || !point.timestamp){
    return null
  }

  const parsed = typeof point.timestamp === 'number'
    ? point.timestamp
    : Date.parse(point.timestamp)

  return Number.isFinite(parsed) ? parsed : null
}

function metricDelta(key){
  const values = store.metricHistory?.[key] || []

  if(values.length < 2){
    return 0
  }

  return pointValue(values.at(-1)) - pointValue(values.at(-2))
}

function trendText(key, unit = '', fallback = t('dashboard.live')){
  const delta = metricDelta(key)

  if(!delta){
    return fallback
  }

  const sign = delta > 0 ? '+' : ''
  const rounded = Math.abs(delta) >= 10
    ? Math.round(delta)
    : Math.round(delta * 10) / 10

  return `${sign}${rounded}${unit} ${t('dashboard.vsLastUpdate')}`
}

function linePoints(values, width, height){
  if(!values.length) return ''

  const plottedValues = values.map(pointValue)
  const timestamps = values.map(pointTimestamp)
  const validTimestamps = timestamps.filter(Number.isFinite)
  const min = Math.min(...plottedValues)
  const max = Math.max(...plottedValues)
  const range = Math.max(1, max - min)
  const latestTimestamp = validTimestamps.at(-1)
  const firstTimestamp = validTimestamps[0]
  const historyWindowMs = 60 * 60 * 1000
  const elapsedMs = Number.isFinite(firstTimestamp) && Number.isFinite(latestTimestamp)
    ? latestTimestamp - firstTimestamp
    : 0
  const timelineStart = Number.isFinite(firstTimestamp) && Number.isFinite(latestTimestamp)
    ? elapsedMs >= historyWindowMs
      ? latestTimestamp - historyWindowMs
      : firstTimestamp
    : null
  const timelineEnd = timelineStart === null
    ? null
    : elapsedMs >= historyWindowMs
      ? latestTimestamp
      : Math.max(firstTimestamp + 1, latestTimestamp)

  return values
    .map((point, index) => {
      const value = pointValue(point)
      const timestamp = timestamps[index]
      const x = timelineStart !== null && Number.isFinite(timestamp)
        ? Math.max(0, Math.min(width, ((timestamp - timelineStart) / (timelineEnd - timelineStart)) * width))
        : values.length === 1
          ? width / 2
          : (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * (height - 6) - 3

      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function focusStationOnMap(stationId){
  stationFocusRequest.value = {
    id:stationId,
    requestedAt:Date.now()
  }
}

function openNotifications(){
  activeOpsPanel.value = 'alarms'
  notificationOpenSignal.value += 1
}

const operatorMetrics = computed(() => [
  {
    label:t('dashboard.totalLoad'),
    value:(store.totalLoadMW / 1000).toFixed(2),
    unit:' GW',
    trend:trendText('totalLoadMW', ' MW', t('dashboard.live')),
    trendClass:'text-positive',
    chartClass:'normal',
    spark:historyValues('totalLoadMW', 0)
  },
  {
    label:t('dashboard.frequency'),
    value:(pointValue(store.metricHistory?.frequency?.at(-1)) || 50.02).toFixed(2),
    unit:' Hz',
    trend:trendText('frequency', ' Hz', t('dashboard.live')),
    trendClass:'text-positive',
    chartClass:'normal',
    spark:historyValues('frequency', 2)
  },
  {
    label:t('dashboard.voltageStability'),
    value:voltageStability.value,
    unit:'%',
    trend:t('dashboard.good'),
    trendClass:'text-positive',
    chartClass:'normal',
    spark:historyValues('voltageStability', 4)
  },
  {
    label:t('dashboard.powerQuality'),
    value:avgThd.value,
    unit:'% THD',
    trend:avgThd.value > 5 ? t('dashboard.watch') : t('dashboard.good'),
    trendClass:avgThd.value > 5 ? 'text-warning' : 'text-positive',
    chartClass:avgThd.value > 5 ? 'warning' : 'normal',
    spark:historyValues('powerQuality', 1)
  },
  {
    label:t('dashboard.activeAlarms'),
    value:store.summary.activeAlarms || store.alarms.length,
    unit:'',
    trend:trendText('activeAlarms', '', t('dashboard.live')),
    trendClass:'text-negative',
    chartClass:'critical',
    spark:historyValues('activeAlarms', 3)
  },
  {
    label:t('dashboard.energyEfficiency'),
    value:energyEfficiency.value,
    unit:'%',
    trend:t('dashboard.excellent'),
    trendClass:'text-positive',
    chartClass:'normal',
    spark:historyValues('energyEfficiency', 5)
  }
])

onMounted(() => {
  store.start()
})
</script>

<style>
.dashboard-page{
  height:100vh;
  min-height:0;
  padding:14px;
  color:#f5fbff;
  background:
    radial-gradient(circle at top left, rgba(64,196,255,.14), transparent 34%),
    linear-gradient(135deg,#050b14 0%,#081421 48%,#0b1118 100%);
}

.dashboard-page{
  display:grid;
  grid-template-rows:auto auto minmax(0,1fr);
  gap:10px;
  overflow:hidden;
}

.dashboard-workspace{
  display:grid;
  grid-template-columns:minmax(0,1fr) 330px;
  grid-template-rows:minmax(0,1fr) 228px;
  gap:10px;
  min-height:0;
  overflow:hidden;
}

.map-zone{
  min-height:0;
  height:100%;
}

.right-rail{
  display:grid;
  gap:10px;
  min-height:0;
}

.right-rail{
  grid-row:1;
  grid-column:2;
  grid-template-rows:min-content min-content minmax(0,1fr);
  overflow:auto;
  padding-right:2px;
  scrollbar-width:thin;
}

@media (max-width: 1100px){
.dashboard-page{
    height:auto;
    overflow:visible;
  }
}

@media (max-width: 1100px){
.dashboard-workspace{
    grid-template-columns:1fr;
    grid-template-rows:auto;
    overflow:visible;
  }
}

@media (max-width: 1100px){
.map-zone{
    height:520px;
  }
}

@media (max-width: 1100px){
.right-rail{
    grid-column:auto;
    grid-row:auto;
    grid-template-columns:repeat(2,minmax(0,1fr));
    grid-template-rows:auto;
    overflow:visible;
  }
}

@media (max-width: 760px){
.right-rail{
    grid-template-columns:1fr;
  }
}

.dashboard-noc{
  grid-template-rows:auto auto auto minmax(0,1fr);
  padding:10px 12px 12px;
  gap:10px;
  background:
    radial-gradient(circle at 26% 6%, rgba(45,156,219,.16), transparent 28%),
    radial-gradient(circle at 82% 12%, rgba(82,255,168,.08), transparent 24%),
    linear-gradient(135deg,#02060c 0%,#07121d 48%,#050a11 100%);
}

.noc-workspace{
  grid-template-columns:minmax(0,1fr) 326px;
  grid-template-rows:minmax(0,1fr);
  gap:10px;
}

.primary-ops-column{
  min-width:0;
  min-height:0;
  display:grid;
  grid-template-rows:minmax(420px,1fr) auto minmax(214px,auto);
  gap:10px;
  overflow:hidden;
}

.noc-right-rail{
  grid-column:auto;
  grid-row:auto;
  grid-template-rows:auto auto auto minmax(190px,1fr) 206px;
  overflow:auto;
  padding-right:2px;
}

.operator-kpi-row{
  display:grid;
  grid-template-columns:repeat(6,minmax(0,1fr));
  gap: 10px;
  padding-bottom: 20px;
}

.operator-kpi-card{
  min-width:0;
  color:#f5fbff;
  border-color:rgba(64,196,255,.14);
  border-radius:8px;
  background:linear-gradient(180deg,rgba(9,20,32,.94),rgba(5,12,22,.96));
}

.operator-kpi-card .q-card__section{
  padding:10px;
}

.operator-kpi-value{
  margin-top:4px;
  font-size:23px;
  line-height:1.05;
  font-weight:900;
  font-variant-numeric:tabular-nums;
}

.operator-kpi-value small{
  margin-left:4px;
  color:#c1d5df;
  font-size:12px;
  font-weight:600;
}

.operator-kpi-trend{
  min-height:16px;
  margin-top:8px;
  font-size:11px;
}

.operator-kpi-card{
  box-shadow:0 16px 42px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.025);
}

@media (max-width: 1320px){
.operator-kpi-row{
    grid-template-columns:repeat(2,minmax(0,1fr));
  }
}

@media (max-width: 1320px){
.noc-workspace{
    grid-template-columns:1fr;
    overflow:auto;
  }
}

@media (max-width: 1320px){
.primary-ops-column{
    overflow:visible;
  }
}

@media (max-width: 1320px){
.noc-right-rail{
    grid-template-columns:repeat(2,minmax(0,1fr));
    grid-template-rows:auto;
    overflow:visible;
  }
}

@media (max-width: 820px){
.operator-kpi-row,
.noc-right-rail{
    grid-template-columns:1fr;
  }
}

.dashboard-noc{
  grid-template-rows:auto minmax(0,1fr);
  padding:8px 10px 10px;
}

.noc-workspace{
  grid-template-columns:minmax(0,1fr) 350px;
  min-height:0;
  overflow:hidden;
}

.primary-ops-column{
  grid-template-rows:minmax(0,1fr) 108px 250px;
  min-height:0;
}

.noc-right-rail{
  height:100%;
  max-height:100%;
  min-height:0;
  overflow-y:auto;
  overflow-x:hidden;
  grid-template-rows:auto;
  align-content:start;
  padding-right:0;
  scrollbar-width:none;
  -ms-overflow-style:none;
}

.noc-right-rail::-webkit-scrollbar{
  width:0;
  height:0;
  display:none;
}

@media (max-width: 1320px){
.noc-right-rail{
    height:auto;
    max-height:none;
    overflow:visible;
    grid-template-columns:repeat(2,minmax(0,1fr));
    grid-template-rows:auto;
    padding-right:0;
  }
}

@media (max-width: 820px){
.noc-right-rail{
    grid-template-columns:1fr;
  }
}

.operator-kpi-card .q-card__section{
  padding:8px;
}

.operator-kpi-value{
  font-size:21px;
}

.operator-kpi-trend{
  margin-top:5px;
}

.mini-line-chart{
  width:100%;
  height:34px;
}

.ops-drawer-layout{
  padding-top: 18px;
  min-height:0;
  height:100%;
  display:grid;
  grid-template-columns:minmax(0,1fr) 42px;
  gap:8px;
  overflow:hidden;
}

.ops-drawer-content{
  min-height:0;
  min-width:0;
  overflow:hidden;
}

.ops-panel-card{
  height:100%;
  min-height:0;
  max-height:none;
  overflow:hidden;
}

.ops-panel-card > .q-card__section:first-child{
  min-height:46px;
}

.ops-panel-card .event-scroll{
  height:165px;
}

.ops-panel-card .panel-scroll-list,
.ops-panel-card .root-cause-body{
  max-height:198px;
  overflow:auto;
  scrollbar-width:thin;
}

.ops-panel-card .q-list{
  max-height:198px;
  overflow:auto;
}

.ops-icon-rail{
  height:100%;
  min-height:0;
  box-sizing:border-box;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:7px;
  padding:7px 4px;
  border:1px solid rgba(64,196,255,.14);
  border-radius:8px;
  background:rgba(5,12,22,.78);
}

.ops-rail-btn{
  width:30px;
  height:30px;
  border:1px solid transparent;
  transition:transform .18s ease, background .18s ease, border-color .18s ease;
}

.ops-rail-btn:hover,
.ops-rail-btn.active{
  border-color:rgba(64,196,255,.38);
  background:rgba(64,196,255,.12);
  transform:translateX(-2px) scale(1.04);
}

.ops-expand-enter-active,
.ops-expand-leave-active{
  transition:opacity .18s ease, transform .18s ease;
}

.ops-expand-enter-from,
.ops-expand-leave-to{
  opacity:0;
  transform:translateX(12px) scale(.99);
}

@media (max-width: 1320px){
.operator-kpi-row{
    grid-template-columns:repeat(6,minmax(0,1fr));
  }
}

@media (max-width: 1320px){
.primary-ops-column{
    grid-template-rows:minmax(0,1fr) 108px 288px;
  }
}

@media (max-width: 1320px){
.ops-panel-card{
    max-height:none;
  }
}
</style>
