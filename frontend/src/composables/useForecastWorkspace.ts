import { computed } from 'vue'

import type { ForecastPoint } from '../types/dashboard'
import { average } from '../utils/numbers'
import { useSensorStore } from '../stores/sensorStore'

export function useForecastWorkspace(){
  const store = useSensorStore()

  const rows = computed(() => store.forecast.map((point:ForecastPoint, index) => ({
    id:`forecast-${index}`,
    period:String(point.label || `+${index + 1}h`),
    loadMW:Number(point.loadMW) || 0,
    risk:Number(point.risk) || 0,
    confidence:point.confidence == null ? null : Number(point.confidence)
  })))

  const peakLoad = computed(() =>
    Math.round(Math.max(0, ...rows.value.map(point => point.loadMW)))
  )

  const averageRisk = computed(() =>
    average(rows.value.map(point => point.risk))
  )

  const averageConfidence = computed(() =>
    average(rows.value.flatMap(point => point.confidence == null ? [] : [point.confidence]))
  )

  const highRiskWindows = computed(() =>
    rows.value.filter(point => point.risk >= 60).length
  )

  const riskColor = (risk:number) => {
    if(risk >= 70) return 'negative'
    if(risk >= 40) return 'warning'
    return 'positive'
  }

  return {
    confidenceAvailable:computed(() => rows.value.some(point => point.confidence != null)),
    averageConfidence,
    averageRisk,
    highRiskWindows,
    peakLoad,
    riskColor,
    rows,
    store
  }
}
