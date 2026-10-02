import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { useI18n } from '../i18n'
import { useSensorStore } from '../stores/sensorStore'
import type { MetricHistoryKey, MetricHistoryValue } from '../types/dashboard'
import { formatClockTime } from '../utils/dateTime'
import { metricLinePoints } from '../utils/metricSeries'
import { gridHealthStatus } from '../utils/gridHealth'
import { workspacePreferences } from '../stores/workspacePreferences'

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
    const stationCount = Math.max(store.stations.length || store.summary.stations || 0, 1)
    const nominalMW = stationCount * 3

    return Math.min(100, Math.round((store.totalLoadMW / nominalMW) * 100))
  })

  const gridStatus = computed(() => {
    const health = gridHealthStatus(store.currentGridHealth)
    if(health === 'critical') return 'CRITICAL'
    if(health === 'warning') return 'WATCH'
    return 'STABLE'
  })

  function historyValues(key:MetricHistoryKey):MetricHistoryValue[]{
    const values = store.metricHistory?.[key] || []

    return values
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
      spark:historyValues('systemLoadPct'),
      chartClass:systemLoadPct.value > 88 ? 'warning' : 'normal'
    },
    {
      label:t('dashboard.blackoutRisk'),
      value:store.currentBlackoutProbability >= 70 ? t('dashboard.high') : store.currentBlackoutProbability >= 35 ? t('dashboard.medium') : t('dashboard.lowUpper'),
      detail:`${store.currentBlackoutProbability}%`,
      class:store.currentBlackoutProbability >= 70 ? 'text-negative' : store.currentBlackoutProbability >= 35 ? 'text-warning' : 'text-positive'
    },
    {
      label:t('dashboard.activeAlarms'),
      value:store.currentAlarmCount,
      class:store.currentAlarmCount ? 'text-negative' : 'text-positive'
    }
  ])

  const notificationItems = computed(() =>
    store.eventStream.filter(event => {
      if (event.severity === 'CRITICAL') return true
      if (event.severity === 'WARNING') return workspacePreferences.notificationWarnings
      return workspacePreferences.notificationInfo
    }).slice(0, workspacePreferences.notificationLimit).map(event => ({
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
