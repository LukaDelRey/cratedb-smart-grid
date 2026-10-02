<template>
  <section class="preferences-card scada-card">
    <header><q-icon :name="section === 'display' ? 'dashboard_customize' : 'notifications'" color="cyan" size="28px" /><div><h2>{{ copy.title }}</h2><p>{{ copy.description }}</p></div></header>
    <section v-for="group in groups" :key="group.title" class="preference-group">
      <h3>{{ group.title }}</h3><p>{{ group.description }}</p>
    <div v-for="field in group.fields" :key="field.key" class="preference-row">
      <div><strong>{{ field.label }}</strong><p>{{ field.description }}</p></div>
      <q-toggle v-model="workspacePreferences[field.key]" color="cyan" :aria-label="field.label" />
    </div>
    </section>
    <template v-if="section === 'notifications'">
      <div class="preference-row"><div><strong>{{ t('workspaceCopy.recentNotificationCount') }}</strong><p>{{ t('workspaceCopy.maximumEventsShownInTheNotificationMenu') }}</p></div><q-select v-model="workspacePreferences.notificationLimit" :options="[5,10,20]" dark outlined dense :aria-label="t('workspaceCopy.notificationCount')" class="count-select" /></div>
      <div class="safety-note"><q-icon name="shield" color="cyan" />{{ t('workspaceCopy.criticalNotificationsAlwaysRemainVisibleTheseFilters') }}</div>
    </template>
    <footer><span><q-icon name="check_circle" color="cyan" />{{ t('workspaceCopy.savedAutomaticallyInThisBrowser') }}</span><q-btn flat no-caps icon="restart_alt" :label="t('workspaceCopy.restoreDefaults')" @click="resetWorkspacePreferences(section)" /></footer>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../../i18n'
import { workspacePreferences, resetWorkspacePreferences } from '../../stores/workspacePreferences'
const props = defineProps<{ section: 'display' | 'notifications' }>()
const { t } = useI18n()
const copy = computed(() => props.section === 'display'
  ? { title: t('workspaceCopy.dashboardDisplay'), description: t('workspaceCopy.chooseDashboardComponentsTheLayoutAdaptsAutomatically') }
  : { title: t('workspaceCopy.notifications'), description: t('workspaceCopy.chooseWhichEventsAppearInTheNotification') })
const fields = computed(() => props.section === 'display' ? [
  { key:'showForecast' as const, label:t('workspaceCopy.loadForecast'), description:t('workspaceCopy.showTheLoadForecastCard') },
  { key:'showInsights' as const, label:t('workspaceCopy.predictiveGridInsights'), description:t('workspaceCopy.showPredictionsAndRecommendedActions') },
  { key:'showRiskMap' as const, label:t('workspaceCopy.outageRiskMap'), description:t('workspaceCopy.showTheSupportingOutageRiskMap') }
] : [
  { key:'notificationWarnings' as const, label:t('workspaceCopy.warnings'), description:t('workspaceCopy.includeWARNINGEvents') },
  { key:'notificationInfo' as const, label:t('workspaceCopy.informationalEvents'), description:t('workspaceCopy.includeInformationalAndOtherNoncriticalEvents') }
])
type ToggleKey = { [K in keyof typeof workspacePreferences]: typeof workspacePreferences[K] extends boolean ? K : never }[keyof typeof workspacePreferences]
const field = (key:ToggleKey, label:string, description:string) => ({ key, label, description })
const groups = computed(() => props.section === 'display' ? [
  { title:t('workspaceCopy.mapAndMetrics'), description:t('workspaceCopy.theMainGridMapAndMetricCharts'), fields:[
    field('showMap', t('workspaceCopy.gridMap'), t('workspaceCopy.showTheInteractiveGridMap')),
    field('showMapControls', t('workspaceCopy.mapLayersLegendAndMarkers'), t('workspaceCopy.showTheControlPanelOverTheMap')),
    field('showMetrics', t('workspaceCopy.operationalMetricsAndCharts'), t('workspaceCopy.showTheSixCardsAboveTheOperations'))
  ] },
  { title:t('workspaceCopy.operationsPanels'), description:t('workspaceCopy.panelsBelowTheChartsEnabledPanelsAppear'), fields:[
    field('showAlarms', t('dashboard.activeAlarmsEvents'), t('workspaceCopy.showTheActiveAlarmRegister')),
    field('showCorrelation', t('dashboard.alarmCorrelation'), t('workspaceCopy.showRelatedAlarmsAndIncidents')),
    field('showRootCause', t('dashboard.rootCauseAnalysis'), t('workspaceCopy.showIncidentRootCauseAnalysis')),
    field('showEvents', t('dashboard.realtimeEventStream'), t('workspaceCopy.showTheLiveEventStream'))
  ] },
  { title:t('workspaceCopy.analyticsCards'), description:t('workspaceCopy.cardsInTheRightDashboardColumn'), fields:[
    fields.value[0]!,
    field('showBlackout', t('workspaceCopy.blackoutPrediction'), t('workspaceCopy.showEstimatedRiskAndAffectedCustomers')),
    field('showTopRisk', t('workspaceCopy.topRiskSubstations'), t('workspaceCopy.showTheHighestRiskSubstations')),
    fields.value[1]!, fields.value[2]!
  ] }
] : [{ title:t('workspaceCopy.notificationTypes'), description:'', fields:fields.value }])
</script>
<style scoped>
.preferences-card{padding:28px;border:1px solid #223a4e;border-radius:12px;background:linear-gradient(130deg,#0c1b2a,#07121e)}
header{display:flex;align-items:center;gap:16px;margin-bottom:20px}h2{font-size:23px;margin:0 0 8px;color:#edf6ff}p{font-size:13px;line-height:1.6;color:#92aabd;margin:4px 0}
.preference-row{display:flex;justify-content:space-between;align-items:center;gap:24px;padding:20px 0;border-top:1px solid #203447}.preference-row strong{font-size:14px;color:#dce7ef}.count-select{width:100px;flex-shrink:0}
.safety-note{display:flex;gap:10px;align-items:center;background:#102538;border-radius:8px;padding:14px;font-size:12px;color:#9ab5c8;line-height:1.6}
footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-top:24px;font-size:12px;color:#8faabd}footer span{display:flex;align-items:center;gap:8px}
@media(max-width:700px){.preferences-card{padding:18px}}
.preference-group{margin-top:32px;padding:20px;border:1px solid rgba(91,156,194,.2);border-radius:10px;background:rgba(3,10,18,.25)}
.preference-group h3{margin:0 0 8px;padding-left:12px;border-left:3px solid #41c9ff;font-size:20px;line-height:1.3;font-weight:700;color:#edf7ff}
.preference-group > p{margin:0 0 18px;padding-left:15px;color:#7f9eb3;font-size:12px}
.preference-group .preference-row{padding:16px 4px}
.preference-group .preference-row strong{font-size:14px;font-weight:500;color:#c3d4e0}
.preference-group .preference-row p{font-size:12px;color:#829cad}
@media(max-width:700px){.preference-group{padding:16px}.preference-group h3{font-size:18px}}
</style>
