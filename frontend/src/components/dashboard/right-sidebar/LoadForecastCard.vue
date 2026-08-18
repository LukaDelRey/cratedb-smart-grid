<template>
  <q-card flat bordered class="scada-card load-forecast-card">
    <q-card-section class="row items-center justify-between q-pa-sm">
      <div>
        <div class="section-kicker-light">{{ t('dashboard.loadForecast') }}</div>
      </div>

      <q-btn-toggle
        v-model="mode"
        dense
        unelevated
        class="forecast-range-toggle"
        toggle-color="cyan"
        color="transparent"
        text-color="blue-grey-2"
        :options="rangeOptions"
      />
    </q-card-section>

    <q-card-section class="forecast-card-body q-pa-sm q-pt-none">
      <div class="forecast-chart-wrap">
        <div class="forecast-axis-labels">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        <svg
          class="forecast-line-chart"
          viewBox="0 0 320 132"
          preserveAspectRatio="none"
        >
          <path
            v-for="line in gridLines"
            :key="line"
            class="chart-grid-line"
            :d="`M 0 ${line} H 320`"
          />
          <path
            class="chart-area-fill forecast-blue-fill"
            :d="areaPath"
          />
          <path
            v-if="currentGuidePath"
            class="forecast-current-guide"
            :d="currentGuidePath"
          />
          <polyline
            :points="linePath"
            class="glow-line forecast-main-line"
          />
        </svg>

        <div
          class="forecast-current-value text-blue-3"
          :style="currentValueStyle"
        >
          {{ currentPercent }}%
        </div>

        <div class="forecast-time-axis">
          <span
            v-for="label in axisLabels"
            :key="label"
          >
            {{ label }}
          </span>
        </div>
      </div>

      <div class="row forecast-summary-row">
        <div class="col-4 q-pr-sm">
          <div class="metric-box forecast-metric-box">
            <span>{{ t('dashboard.peak') }}</span>
            <strong>{{ peakLoad }} MW</strong>
          </div>
        </div>
        <div class="col-4 q-pr-sm">
          <div class="metric-box forecast-metric-box">
            <span>{{ t('dashboard.avgRisk') }}</span>
            <strong>{{ avgRisk }}%</strong>
          </div>
        </div>
        <div class="col-4">
          <div class="metric-box forecast-metric-box">
            <span>{{ t('dashboard.confidence') }}</span>
            <strong>{{ avgConfidence }}%</strong>
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useSensorStore } from '../../../stores/sensorStore'
import { useI18n } from '../../../i18n'

const props = defineProps({
  points:{
    type:Array,
    default:() => []
  }
})

const store = useSensorStore()
const { t } = useI18n()
const mode = ref('1h')
const gridLines = [8, 37, 66, 95, 124]
const rangeOptions = computed(() => [
  { label:t('dashboard.oneH'), value:'1h' },
  { label:t('dashboard.twentyFourH'), value:'24h' },
  { label:t('dashboard.sevenD'), value:'7d' }
])

const rangeConfigs = {
  '1h':{
    title:'Next 60 Minutes',
    durationMs:60 * 60 * 1000,
    maxPoints:24,
    labelType:'minutes'
  },
  '24h':{
    title:'Next 24 Hours',
    durationMs:24 * 60 * 60 * 1000,
    maxPoints:28,
    labelType:'hours'
  },
  '7d':{
    title:'Next 7 Days',
    durationMs:7 * 24 * 60 * 60 * 1000,
    maxPoints:28,
    labelType:'days'
  }
}

const activeRange = computed(() => rangeConfigs[mode.value])

function pointValue(point){
  return typeof point === 'number'
    ? point
    : Number(point?.value) || 0
}

function pointTimestamp(point,index,total,durationMs){
  if(point && typeof point === 'object' && point.timestamp){
    const parsed = typeof point.timestamp === 'number'
      ? point.timestamp
      : Date.parse(point.timestamp)

    if(Number.isFinite(parsed)){
      return parsed
    }
  }

  const start = Date.now()
  const step = total > 1
    ? durationMs / (total - 1)
    : durationMs

  return start + index * step
}

function pointLabel(timestamp,type){
  const date = new Date(timestamp)

  if(type === 'days'){
    return date.toLocaleDateString([], {
      day:'2-digit',
      month:'short'
    })
  }

  return date.toLocaleTimeString([], {
    hour:'2-digit',
    minute:'2-digit',
    hour12:false
  })
}

function average(values){
  const clean = values.filter(Number.isFinite)

  if(!clean.length) return 0

  return Math.round(clean.reduce((sum,value) => sum + value, 0) / clean.length)
}

function interpolateValue(points, progress, key){
  if(!points.length) return 0
  if(points.length === 1) return Number(points[0]?.[key]) || 0

  const scaled = progress * (points.length - 1)
  const leftIndex = Math.floor(scaled)
  const rightIndex = Math.min(points.length - 1, leftIndex + 1)
  const localProgress = scaled - leftIndex
  const left = Number(points[leftIndex]?.[key]) || 0
  const right = Number(points[rightIndex]?.[key]) || left

  return left + (right - left) * localProgress
}

const historyPoints = computed(() => {
  const loads = store.metricHistory?.totalLoadMW || []

  if(loads.length < 2){
    return []
  }

  const risks = store.metricHistory?.blackoutRisk || []
  const slice = loads.slice(-activeRange.value.maxPoints)
  const riskSlice = risks.slice(-slice.length)

  return slice.map((loadPoint,index) => ({
    timestamp:loadPoint?.timestamp,
    loadMW:pointValue(loadPoint),
    risk:pointValue(riskSlice[index]),
    confidence:Math.max(72, 94 - Math.abs(slice.length - index - 1) * 2)
  }))
})

const forecastPoints = computed(() =>
  props.points.map((point,index) => ({
    timestamp:pointTimestamp(
      point,
      index,
      props.points.length,
      activeRange.value.durationMs
    ),
    loadMW:Number(point.loadMW) || 0,
    risk:Number(point.risk) || 0,
    confidence:Number(point.confidence) || 0
  }))
)

const currentLoadMW = computed(() => {
  const latestHistory = historyPoints.value.at(-1)?.loadMW

  if(Number.isFinite(latestHistory) && latestHistory > 0){
    return latestHistory
  }

  const latestForecast = forecastPoints.value.at(0)?.loadMW

  if(Number.isFinite(latestForecast) && latestForecast > 0){
    return latestForecast
  }

  return store.totalLoadMW || 0
})

const fallbackRisk = computed(() =>
  Number(store.blackout?.probability) ||
  average(forecastPoints.value.map(point => point.risk)) ||
  12
)

function projectedPoints(config){
  const count = config.maxPoints
  const durationMs = config.durationMs
  const now = Date.now()
  const source = forecastPoints.value
  const baseLoad = currentLoadMW.value || average(source.map(point => point.loadMW)) || 1

  return Array.from({ length:count }, (_, index) => {
    const progress = count > 1 ? index / (count - 1) : 0
    const timestamp = now + progress * durationMs
    const forecastLoad = interpolateValue(source, progress, 'loadMW')
    const forecastRisk = interpolateValue(source, progress, 'risk')
    const forecastConfidence = interpolateValue(source, progress, 'confidence')
    const cycleCount = mode.value === '7d' ? 7 : mode.value === '24h' ? 1 : 0.25
    const cycle = Math.sin(progress * Math.PI * 2 * cycleCount - Math.PI / 3)
    const shoulder = Math.sin(progress * Math.PI * 4 * cycleCount + Math.PI / 5) * 0.35
    const trend = mode.value === '7d' ? progress * 0.04 : progress * 0.02
    const shapedLoad = baseLoad * (1 + cycle * 0.08 + shoulder * 0.04 + trend)

    return {
      timestamp,
      loadMW:Math.max(0, Math.round((forecastLoad || shapedLoad) * 10) / 10),
      risk:Math.max(0, Math.min(100, Math.round((forecastRisk || fallbackRisk.value) * 10) / 10)),
      confidence:Math.max(62, Math.round((forecastConfidence || 94) - progress * (mode.value === '7d' ? 18 : 8)))
    }
  })
}

const displayPoints = computed(() => {
  if(mode.value === '1h' && historyPoints.value.length){
    return historyPoints.value
  }

  return projectedPoints(activeRange.value)
})

const peakLoad = computed(() =>
  Math.round(Math.max(0, ...displayPoints.value.map(point => point.loadMW || 0)))
)

const capacityMW = computed(() => {
  const stationNominal = (store.summary?.stations || store.stations.length || 0) * 3
  const observedMax = Math.max(
    peakLoad.value,
    currentLoadMW.value,
    store.totalLoadMW || 0
  )

  return Math.max(1, stationNominal, Math.ceil(observedMax / 0.92))
})

const avgRisk = computed(() =>
  average(displayPoints.value.map(point => point.risk || 0))
)

const avgConfidence = computed(() =>
  average(displayPoints.value.map(point => point.confidence || 0))
)

const timelineBounds = computed(() => {
  const points = displayPoints.value
  const durationMs = activeRange.value.durationMs
  const timestamps = points
    .map(point => point.timestamp)
    .filter(Number.isFinite)

  if(!timestamps.length){
    const start = Date.now()
    return { start, end:start + durationMs }
  }

  const first = timestamps[0]
  const latest = timestamps.at(-1)

  if(mode.value === '1h' && historyPoints.value.length){
    const elapsedMs = latest - first

    return elapsedMs >= durationMs
      ? { start:latest - durationMs, end:latest }
      : { start:first, end:Math.max(first + 1, latest) }
  }

  return {
    start:first,
    end:Math.max(first + 1, latest)
  }
})

const currentPercent = computed(() => {
  const latest = displayPoints.value.at(-1)?.loadMW || 0

  return Math.max(0, Math.min(100, Math.round((latest / capacityMW.value) * 100)))
})

const chartPoints = computed(() => {
  const width = 320
  const height = 132
  const { start, end } = timelineBounds.value
  const timelineRange = Math.max(1, end - start)

  return displayPoints.value.map((point, index) => ({
    ...point,
    loadPercent:Math.max(0, Math.min(100, ((point.loadMW || 0) / capacityMW.value) * 100)),
    x:Number.isFinite(point.timestamp)
      ? Math.max(0, Math.min(width, ((point.timestamp - start) / timelineRange) * width))
      : displayPoints.value.length === 1
        ? width / 2
        : (index / (displayPoints.value.length - 1)) * width,
    y:height - (Math.max(0, Math.min(100, ((point.loadMW || 0) / capacityMW.value) * 100)) / 100) * 104 - 14
  }))
})

const linePath = computed(() =>
  chartPoints.value
    .map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' ')
)

const areaPath = computed(() => {
  if(!chartPoints.value.length) return ''

  const first = chartPoints.value[0]
  const last = chartPoints.value.at(-1)

  return [
    `M ${first.x.toFixed(1)} 126`,
    ...chartPoints.value.map(point => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`),
    `L ${last.x.toFixed(1)} 126`,
    'Z'
  ].join(' ')
})

const currentGuidePath = computed(() => {
  const latest = chartPoints.value.at(-1)

  if(!latest){
    return ''
  }

  return `M ${latest.x.toFixed(1)} ${latest.y.toFixed(1)} V 126`
})

const currentValueStyle = computed(() => {
  const latest = chartPoints.value.at(-1)
  const top = latest
    ? Math.max(6, Math.min(112, latest.y - 10))
    : 10

  return {
    top:`${top}px`,
    right: `-6px`
  }
})

const axisLabels = computed(() => {
  const config = activeRange.value
  const { start, end } = timelineBounds.value
  const range = Math.max(1, end - start)

  return Array.from({ length:5 }, (_, index) => {
    const timestamp = start + (range / 4) * index
    return pointLabel(timestamp, config.labelType)
  })
})

</script>

<style>
.metric-box{
  padding:10px;
  border:1px solid rgba(255,255,255,.07);
  border-radius:8px;
  background:rgba(255,255,255,.025);
}

.metric-box span{
  display:block;
  color:#8fa9b8;
  font-size:11px;
}

.metric-box strong{
  display:block;
  margin-top:4px;
  color:#f5fbff;
}

.load-forecast-card{
  height:286px;
  min-height:286px;
  display:flex;
  flex-direction:column;
  overflow:hidden;
}

.load-forecast-card > .q-card__section:first-child{
  flex:0 0 auto;
  min-height:42px;
}

.forecast-card-body{
  flex:1 1 auto;
  min-height:0;
  display:flex;
  flex-direction:column;
}

.forecast-chart-wrap{
  flex:1 1 auto;
  position:relative;
  min-height:164px;
  padding-left:34px;
  padding-right:8px;
}

.forecast-axis-labels{
  position:absolute;
  left:0;
  top:2px;
  bottom:26px;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  color:#8fa9b8;
  font-size:10px;
}

.forecast-line-chart{
  width:100%;
  height:132px;
  display:block;
  overflow:visible;
}

.chart-grid-line{
  stroke:rgba(143,169,184,.18);
  stroke-width:1;
  vector-effect:non-scaling-stroke;
}

.chart-area-fill.normal{ fill:rgba(66,200,255,.13); }

.chart-area-fill.warning{ fill:rgba(255,178,56,.14); }

.chart-area-fill.critical{ fill:rgba(255,77,94,.15); }

.forecast-main-line{
  stroke-width:2.6;
}

.forecast-time-axis{
  display:flex;
  justify-content:space-between;
  padding-top:2px;
  color:#8fa9b8;
  font-size:10px;
}

.forecast-current-value{
  position:absolute;
  right:10px;
  top:10px;
  font-size:16px;
  font-weight:800;
}

.forecast-range-toggle{
  border:1px solid rgba(66,200,255,.14);
  border-radius:7px;
  background:rgba(6,16,30,.58);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.03);
  overflow:hidden;
}

.forecast-range-toggle .q-btn{
  min-height:24px;
  padding:2px 11px;
  font-size:10px;
  letter-spacing:0;
  border-radius:0;
}

.forecast-range-toggle .q-btn[aria-pressed="true"]{
  color:#41c9ff !important;
  background:rgba(30,133,226,.18) !important;
  box-shadow:inset 0 -1px 0 rgba(66,200,255,.45);
}

.forecast-chart-wrap{
  min-height:158px;
  padding-right:33px;
}

.forecast-line-chart{
  height:126px;
}

.chart-area-fill.forecast-blue-fill{
  fill:rgba(41,169,255,.09);
}

.forecast-main-line{
  stroke:#38bfff;
  stroke-width:1.75;
  filter:drop-shadow(0 0 4px rgba(56,191,255,.78));
}

.forecast-current-guide{
  fill:none;
  stroke:rgba(56,191,255,.38);
  stroke-width:1;
  stroke-dasharray:3 3;
  vector-effect:non-scaling-stroke;
}

.forecast-current-value{
  right:0;
  top:10px;
  font-size:13px;
  line-height:1;
  font-weight:700;
  text-shadow:0 0 7px rgba(56,191,255,.75);
}

.forecast-time-axis{
  padding-right:0;
  font-size:9.5px;
}

.forecast-summary-row{
  flex:0 0 auto;
  margin-top:6px;
}

.forecast-metric-box{
  min-height:50px;
  padding:7px 8px;
}

.forecast-metric-box span{
  font-size:10px;
}

.forecast-metric-box strong{
  margin-top:2px;
  font-size:12px;
}

.forecast-range-toggle .q-btn.q-btn--active{
  color:#41c9ff !important;
  background:rgba(30,133,226,.18) !important;
  box-shadow:inset 0 -1px 0 rgba(66,200,255,.45);
}
</style>
