import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { fetchGridLoadForecast } from '../services/gridApi'
import type { GridLoadForecast } from '../services/gridApi'

import { useSensorStore } from '../stores/sensorStore'
import type { ForecastPoint } from '../types/dashboard'
import { average, clamp } from '../utils/numbers'

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

export function useLoadForecast(
  _getPoints:() => ForecastInputPoint[],
  t:Translate
){
  const store = useSensorStore()
  const mode = ref<ForecastRange>('1h')
  const gridLines = GRID_LINES
  const rangeOptions = computed(() => [
    { label:t('dashboard.oneH'), value:'1h' },
    { label:t('dashboard.twentyFourH'), value:'24h', disable:result.value ? !result.value.availableHorizons.includes(24) : false },
    { label:t('dashboard.sevenD'), value:'7d', disable:result.value ? !result.value.availableHorizons.includes(168) : false }
  ])
  const activeRange = computed(() => RANGE_CONFIGS[mode.value])

  const result = ref<GridLoadForecast|null>(null)
  const loading = ref(false)
  const failed = ref(false)
  let requestVersion = 0
  let refreshTimer:ReturnType<typeof setInterval>|null = null
  async function refresh(){
    const version = ++requestVersion
    loading.value = true
    failed.value = false
    try{
      const hours = mode.value === '1h' ? 1 : mode.value === '24h' ? 24 : 168
      const response = await fetchGridLoadForecast(hours)
      if(version === requestVersion) result.value = response
    }catch{
      if(version === requestVersion){ result.value = null; failed.value = true }
    }finally{
      if(version === requestVersion) loading.value = false
    }
  }
  watch(mode, () => { result.value = null; void refresh() })
  onMounted(() => { void refresh(); refreshTimer = setInterval(refresh, 60000) })
  onUnmounted(() => { requestVersion++; if(refreshTimer) clearInterval(refreshTimer) })

  const displayPoints = computed<ForecastDisplayPoint[]>(() =>
    (result.value?.points ?? []).map(point => ({
      timestamp:typeof point.timestamp === 'number' ? point.timestamp : Date.parse(String(point.timestamp)),
      loadMW:point.loadMW, risk:point.risk, confidence:point.confidence ?? 0
    })))
  const dataAvailable = computed(() => !loading.value && Boolean(result.value?.available && displayPoints.value.length))
  const forecastNote = computed(() => loading.value ? t('dashboard.forecastLoading')
    : failed.value ? t('dashboard.forecastUnavailable')
    : !result.value?.available ? t('dashboard.forecastHistoryRequired', {hours:mode.value === '7d' ? 168 : 24})
    : result.value.method === 'current-load-persistence' ? `${t('dashboard.forecastLiveBaseline')} · ${t('dashboard.forecastHistoryRequired', {hours:24})}`
    : t('dashboard.forecastHistoricalBaseline', {hours:result.value.historyHours}) +
      (!result.value.availableHorizons.includes(168) ? ` · ${t('dashboard.forecastHistoryRequired', {hours:168})} (7D)` : ''))
  const peakLoad = computed(() =>
    Math.round(Math.max(0, ...displayPoints.value.map(point => point.loadMW || 0)))
  )

  const capacityMW = computed(() => {
    const stationNominal = (store.summary?.stations || store.stations.length || 0) * 3

    return Math.max(1, stationNominal)
  })

  const avgRisk = computed(() =>
    average(displayPoints.value.map(point => point.risk || 0))
  )

  const avgConfidence = computed(() =>
    average(displayPoints.value.map(point => point.confidence || 0))
  )
  const confidenceAvailable = computed(() =>
    dataAvailable.value && (result.value?.points ?? []).some(point =>
      typeof point === 'object' && point.confidence != null)
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
    dataAvailable,
    forecastNote,
    confidenceAvailable,
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
