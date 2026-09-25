import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { useI18n } from '../i18n'
import { useSensorStore } from '../stores/sensorStore'
import type { MetricHistoryKey, MetricHistoryValue } from '../types/dashboard'
import { formatClockTime } from '../utils/dateTime'
import { createSparkSeries, metricLinePoints } from '../utils/metricSeries'

export function useDashboardTopbar(){
  const store = useSensorStore()
  const {
    language,
    languageOptions,
    currentLanguageOption,
    setLanguage,
    t,
    translateText,
    translateStatus
  } = useI18n()
  const now = ref(new Date())
  let clockTimer:ReturnType<typeof setInterval> | null = null

  const dateLocale = computed(() =>
    language.value === 'hr' ? 'hr-HR' : undefined
  )

  const clock = computed(() => formatClockTime(now.value))

  const dateLabel = computed(() =>
    now.value.toLocaleDateString(dateLocale.value, {
      day:'2-digit',
      month:'short',
      year:'numeric'
    })
  )

  const systemLoadPct = computed(() => {
    const stationCount = Math.max(store.summary.stations || 0, 1)
    const nominalMW = stationCount * 3

    return Math.min(100, Math.round((store.totalLoadMW / nominalMW) * 100))
  })

  const gridStatus = computed(() => {
    if(store.blackout.probability >= 70) return 'CRITICAL'
    if(store.blackout.probability >= 35 || store.summary.activeAlarms > 0) return 'WATCH'
    return 'STABLE'
  })

  function historyValues(key:MetricHistoryKey, offset = 0):MetricHistoryValue[]{
    const values = store.metricHistory?.[key] || []

    return values.length > 1 ? values : createSparkSeries(offset)
  }

  const topStatus = computed(() => [
    {
      label:t('dashboard.gridStatus'),
      value:t(gridStatus.value),
      class:gridStatus.value === 'STABLE' ? 'text-positive' : gridStatus.value === 'WATCH' ? 'text-warning' : 'text-negative'
    },
    {
      label:t('dashboard.systemLoad'),
      value:`${systemLoadPct.value}%`,
      detail:`${store.totalLoadMW} MW`,
      class:systemLoadPct.value > 88 ? 'text-warning' : 'text-white',
      spark:historyValues('systemLoadPct', 6),
      chartClass:systemLoadPct.value > 88 ? 'warning' : 'normal'
    },
    {
      label:t('dashboard.blackoutRisk'),
      value:store.blackout.probability >= 35 ? t('dashboard.medium') : t('dashboard.lowUpper'),
      detail:`${store.blackout.probability}%`,
      class:store.blackout.probability >= 35 ? 'text-warning' : 'text-positive'
    },
    {
      label:t('dashboard.activeAlarms'),
      value:store.summary.activeAlarms || store.alarms.length,
      class:(store.summary.activeAlarms || store.alarms.length) ? 'text-negative' : 'text-positive'
    }
  ])

  const notificationItems = computed(() =>
    store.eventStream.slice(0, 5).map(event => ({
      id:event.id,
      title:event.title || 'Realtime event',
      detail:[
        formatClockTime(event.timestamp),
        event.assetId || event.source || 'SYSTEM'
      ].filter(Boolean).join(' - '),
      severity:event.severity || 'INFO',
      icon:notificationIcon(event.severity),
      color:notificationColor(event.severity)
    }))
  )

  function notificationColor(severity:string):string{
    if(severity === 'CRITICAL') return 'negative'
    if(severity === 'WARNING') return 'warning'
    return 'info'
  }

  function notificationIcon(severity:string):string{
    if(severity === 'CRITICAL') return 'priority_high'
    if(severity === 'WARNING') return 'warning'
    return 'notifications'
  }

  onMounted(() => {
    clockTimer = setInterval(() => {
      now.value = new Date()
    }, 1000)
  })

  onBeforeUnmount(() => {
    if(clockTimer){
      clearInterval(clockTimer)
    }
  })

  return {
    clock,
    currentLanguageOption,
    dateLabel,
    language,
    languageOptions,
    linePoints:metricLinePoints,
    notificationItems,
    setLanguage,
    store,
    t,
    topStatus,
    translateStatus,
    translateText
  }
}
