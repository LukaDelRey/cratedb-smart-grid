import { computed, ref } from 'vue'

import { useSensorStore } from '../stores/sensorStore'
import type { ForecastPoint, MetricHistoryValue } from '../types/dashboard'
import { average, clamp, round } from '../utils/numbers'

type Translate = (key:string, params?:Record<string, string | number>) => string
type ForecastRange = '1h' | '24h' | '7d'
type ForecastInputPoint = ForecastPoint | number
type LabelType = 'minutes' | 'hours' | 'days'

type RangeConfig = {
  title: string
  durationMs: number
  maxPoints: number
  labelType: LabelType
}

export type ForecastDisplayPoint = {
  timestamp: number
  loadMW: number
  risk: number
  confidence: number
}

const GRID_LINES = [8, 37, 66, 95, 124]

const RANGE_CONFIGS:Record<ForecastRange, RangeConfig> = {
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

function pointValue(point?:MetricHistoryValue):number{
  return typeof point === 'number'
    ? point
    : Number(point?.value) || 0
}

function pointTimestamp(
  point:ForecastInputPoint,
  index:number,
  total:number,
  durationMs:number
):number{
  if(point && typeof point === 'object' && point.timestamp){
    const parsed = typeof point.timestamp === 'number'
      ? point.timestamp
      : Date.parse(String(point.timestamp))

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

function pointLabel(timestamp:number, type:LabelType):string{
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

function interpolateValue(
  points:ForecastDisplayPoint[],
  progress:number,
  key:'loadMW' | 'risk' | 'confidence'
):number{
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

export function useLoadForecast(
  getPoints:() => ForecastInputPoint[],
  t:Translate
){
  const store = useSensorStore()
  const mode = ref<ForecastRange>('1h')
  const gridLines = GRID_LINES
  const rangeOptions = computed(() => [
    { label:t('dashboard.oneH'), value:'1h' },
    { label:t('dashboard.twentyFourH'), value:'24h' },
    { label:t('dashboard.sevenD'), value:'7d' }
  ])
  const activeRange = computed(() => RANGE_CONFIGS[mode.value])

  const historyPoints = computed<ForecastDisplayPoint[]>(() => {
    const loads = store.metricHistory?.totalLoadMW || []

    if(loads.length < 2){
      return []
    }

    const risks = store.metricHistory?.blackoutRisk || []
    const slice = loads.slice(-activeRange.value.maxPoints)
    const riskSlice = risks.slice(-slice.length)

    return slice.map((loadPoint, index) => ({
      timestamp:typeof loadPoint === 'object' ? Number(loadPoint.timestamp) || Date.now() : Date.now(),
      loadMW:pointValue(loadPoint),
      risk:pointValue(riskSlice[index]),
      confidence:Math.max(72, 94 - Math.abs(slice.length - index - 1) * 2)
    }))
  })

  const forecastPoints = computed<ForecastDisplayPoint[]>(() => {
    const points = getPoints()

    return points.map((point, index) => ({
      timestamp:pointTimestamp(point, index, points.length, activeRange.value.durationMs),
      loadMW:typeof point === 'object' ? Number(point.loadMW) || 0 : Number(point) || 0,
      risk:typeof point === 'object' ? Number(point.risk) || 0 : 0,
      confidence:typeof point === 'object' ? Number(point.confidence) || 0 : 0
    }))
  })

  const currentLoadMW = computed(() => {
    const latestHistory = historyPoints.value.at(-1)?.loadMW

    if(Number.isFinite(latestHistory) && latestHistory! > 0){
      return latestHistory!
    }

    const latestForecast = forecastPoints.value.at(0)?.loadMW

    if(Number.isFinite(latestForecast) && latestForecast! > 0){
      return latestForecast!
    }

    return store.totalLoadMW || 0
  })

  const fallbackRisk = computed(() =>
    Number(store.blackout?.probability) ||
    average(forecastPoints.value.map(point => point.risk)) ||
    12
  )

  function projectedPoints(config:RangeConfig):ForecastDisplayPoint[]{
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
        loadMW:Math.max(0, round(forecastLoad || shapedLoad, 1)),
        risk:clamp(round(forecastRisk || fallbackRisk.value, 1)),
        confidence:Math.max(62, Math.round((forecastConfidence || 94) - progress * (mode.value === '7d' ? 18 : 8)))
      }
    })
  }

  const displayPoints = computed<ForecastDisplayPoint[]>(() => {
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
    const observedMax = Math.max(peakLoad.value, currentLoadMW.value, store.totalLoadMW || 0)

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
    const timestamps = points.map(point => point.timestamp).filter(Number.isFinite)

    if(!timestamps.length){
      const start = Date.now()
      return { start, end:start + durationMs }
    }

    const first = timestamps[0]
    const latest = timestamps.at(-1)!

    if(mode.value === '1h' && historyPoints.value.length){
      const elapsedMs = latest - first

      return elapsedMs >= durationMs
        ? { start:latest - durationMs, end:latest }
        : { start:first, end:Math.max(first + 1, latest) }
    }

    return { start:first, end:Math.max(first + 1, latest) }
  })

  const currentPercent = computed(() => {
    const latest = displayPoints.value.at(-1)?.loadMW || 0

    return clamp(Math.round((latest / capacityMW.value) * 100))
  })

  const chartPoints = computed(() => {
    const width = 320
    const height = 132
    const { start, end } = timelineBounds.value
    const timelineRange = Math.max(1, end - start)

    return displayPoints.value.map((point, index) => {
      const loadPercent = clamp(((point.loadMW || 0) / capacityMW.value) * 100)

      return {
        ...point,
        loadPercent,
        x:Number.isFinite(point.timestamp)
          ? clamp(((point.timestamp - start) / timelineRange) * width, 0, width)
          : displayPoints.value.length === 1
            ? width / 2
            : (index / (displayPoints.value.length - 1)) * width,
        y:height - (loadPercent / 100) * 104 - 14
      }
    })
  })

  const linePath = computed(() =>
    chartPoints.value.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
  )

  const areaPath = computed(() => {
    if(!chartPoints.value.length) return ''

    const first = chartPoints.value[0]
    const last = chartPoints.value.at(-1)!

    return [
      `M ${first.x.toFixed(1)} 126`,
      ...chartPoints.value.map(point => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`),
      `L ${last.x.toFixed(1)} 126`,
      'Z'
    ].join(' ')
  })

  const currentGuidePath = computed(() => {
    const latest = chartPoints.value.at(-1)

    return latest ? `M ${latest.x.toFixed(1)} ${latest.y.toFixed(1)} V 126` : ''
  })

  const currentValueStyle = computed(() => {
    const latest = chartPoints.value.at(-1)
    const top = latest ? clamp(latest.y - 10, 6, 112) : 10

    return { top:`${top}px`, right:'-6px' }
  })

  const axisLabels = computed(() => {
    const config = activeRange.value
    const { start, end } = timelineBounds.value
    const range = Math.max(1, end - start)

    return Array.from({ length:5 }, (_, index) =>
      pointLabel(start + (range / 4) * index, config.labelType)
    )
  })

  return {
    areaPath,
    avgConfidence,
    avgRisk,
    axisLabels,
    currentGuidePath,
    currentPercent,
    currentValueStyle,
    gridLines,
    linePath,
    mode,
    peakLoad,
    rangeOptions
  }
}
