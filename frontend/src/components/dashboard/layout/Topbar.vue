<template>
  <div class="command-topbar q-px-sm q-py-xs">
    <div class="command-status-grid">
      <div
        v-for="item in topStatus"
        :key="item.label"
        class="command-status-card"
      >
        <span>{{ item.label }}</span>
        <strong :class="item.class">{{ item.value }}</strong>
        <small v-if="item.detail">{{ item.detail }}</small>

        <svg
          v-if="item.spark"
          class="status-line-chart"
          viewBox="0 0 120 24"
          preserveAspectRatio="none"
        >
          <polyline
            :points="linePoints(item.spark, 120, 24)"
            :class="['glow-line', item.chartClass]"
          />
        </svg>
      </div>
    </div>

    <div class="operator-cluster q-px-sm">
      <div class="q-mr-sm">
        <div class="operator-clock">{{ clock }}</div>
        <div class="operator-date">{{ dateLabel }}</div>
      </div>

      <q-btn
        flat
        round
        dense
        icon="notifications"
        color="blue-grey-2"
        :aria-label="t('dashboard.notifications')"
      >
        <q-badge
          v-if="store.summary.activeAlarms"
          floating
          color="negative"
        >
          {{ store.summary.activeAlarms }}
        </q-badge>

        <q-menu
          anchor="bottom right"
          self="top right"
          class="notification-menu"
        >
          <div class="notification-menu-head">
            <span>{{ t('dashboard.notifications') }}</span>
            <strong>{{ store.summary.activeAlarms || store.alarms.length }}</strong>
          </div>

          <q-list separator>
            <q-item
              v-for="item in notificationItems"
              :key="item.id"
              clickable
              v-close-popup
              class="notification-item"
              @click="emit('openNotifications')"
            >
              <q-item-section avatar>
                <q-icon
                  :name="item.icon"
                  :color="item.color"
                  size="20px"
                />
              </q-item-section>

              <q-item-section>
                <q-item-label>{{ translateText(item.title) }}</q-item-label>
                <q-item-label caption>{{ item.detail }}</q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-badge :color="item.color">
                  {{ translateStatus(item.severity) }}
                </q-badge>
              </q-item-section>
            </q-item>

            <q-item v-if="!notificationItems.length" class="notification-empty">
              <q-item-section>
                <q-item-label>{{ t('dashboard.noActiveAlarmsOrEvents') }}</q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-close-popup
              class="notification-view-all"
              @click="emit('openNotifications')"
            >
              <q-item-section>
                <q-item-label>{{ t('dashboard.viewAll') }}</q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-icon name="arrow_forward" color="cyan" size="18px" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>

      <q-btn
        flat
        round
        dense
        icon="account_tree"
        color="cyan"
        :aria-label="t('dashboard.openSystemTopology')"
        @click="emit('openTopology')"
      />

      <q-btn-dropdown
        flat
        dense
        no-caps
        icon="translate"
        color="blue-grey-2"
        class="language-switcher"
        :label="currentLanguageOption.shortLabel"
        :aria-label="t('dashboard.changeLanguage')"
      >
        <q-list dense class="language-menu">
          <q-item
            v-for="option in languageOptions"
            :key="option.code"
            clickable
            v-close-popup
            :active="language === option.code"
            active-class="language-active"
            @click="setLanguage(option.code)"
          >
            <q-item-section>
              <q-item-label>{{ option.label }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useSensorStore } from '../../../stores/sensorStore'
import { useI18n } from '../../../i18n'

const emit = defineEmits(['openTopology', 'openNotifications'])
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
let clockTimer = null

const dateLocale = computed(() =>
  language.value === 'hr' ? 'hr-HR' : undefined
)

const clock = computed(() =>
  now.value.toLocaleTimeString([], {
    hour:'2-digit',
    minute:'2-digit',
    second:'2-digit'
  })
)

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
  store.eventStream
    .slice(0, 5)
    .map(event => ({
      id:event.id,
      title:event.title || 'Realtime event',
      detail:[
        formatNotificationTime(event.timestamp),
        event.assetId || event.source || 'SYSTEM'
      ].filter(Boolean).join(' - '),
      severity:event.severity || 'INFO',
      icon:notificationIcon(event.severity),
      color:notificationColor(event.severity)
    }))
)

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

function notificationColor(severity){
  if(severity === 'CRITICAL') return 'negative'
  if(severity === 'WARNING') return 'warning'
  return 'info'
}

function notificationIcon(severity){
  if(severity === 'CRITICAL') return 'priority_high'
  if(severity === 'WARNING') return 'warning'
  return 'notifications'
}

function formatNotificationTime(timestamp){
  const parsed = timestamp ? new Date(timestamp) : new Date()

  if(Number.isNaN(parsed.getTime())){
    return '--:--:--'
  }

  return parsed.toLocaleTimeString([], {
    hour:'2-digit',
    minute:'2-digit',
    second:'2-digit'
  })
}

onMounted(() => {
  clockTimer = setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onBeforeUnmount(() => {
  clearInterval(clockTimer)
})
</script>

<style scoped>
.command-topbar{
  min-height:58px;
  display:grid;
  grid-template-columns:minmax(0,1fr) 350px;
  gap:10px;
  align-items:center;
}

.command-status-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:8px;
  min-width:0;
}

.command-status-card{
  min-height:42px;
  position:relative;
  overflow:hidden;
  padding:7px 9px;
  border:1px solid rgba(120,180,220,.16);
  border-radius:6px;
  background:linear-gradient(180deg,rgba(11,22,34,.92),rgba(4,10,18,.92));
}

.command-status-card span,
.command-status-card small{
  display:block;
  color:#8ba7b6;
  font-size:10px;
  line-height:1.2;
  text-transform:uppercase;
}

.command-status-card strong{
  display:inline-block;
  margin-top:3px;
  font-size:16px;
  line-height:1.05;
  font-weight:900;
}

.command-status-card small{
  display:inline-block;
  margin-left:8px;
  color:#c5d7e0;
  text-transform:none;
}

.status-line-chart{
  position:absolute;
  right:8px;
  bottom:6px;
  width:86px;
  height:18px;
  opacity:.95;
}

.glow-line{
  fill:none;
  stroke-width:2.4;
  stroke-linecap:round;
  stroke-linejoin:round;
  vector-effect:non-scaling-stroke;
}

.glow-line.normal{
  stroke:#42c8ff;
  filter:drop-shadow(0 0 5px rgba(66,200,255,.75));
}

.glow-line.warning{
  stroke:#ffb238;
  filter:drop-shadow(0 0 5px rgba(255,178,56,.75));
}

.glow-line.critical{
  stroke:#ff4d5e;
  filter:drop-shadow(0 0 5px rgba(255,77,94,.85));
}

.operator-cluster{
  width:100%;
  min-width:0;
  display:flex;
  justify-content:flex-end;
  align-items:center;
  gap:10px;
}

.language-switcher{
  min-height:30px;
  padding:0 6px;
  border:1px solid rgba(120,180,220,.16);
  border-radius:7px;
  background:rgba(6,16,30,.58);
  font-size:11px;
}

.language-menu{
  min-width:132px;
  color:#f5fbff;
  background:#07111f;
}

:global(.notification-menu){
  width:min(390px, calc(100vw - 24px));
  color:#f5fbff;
  background:#07111f !important;
  border:1px solid rgba(64,196,255,.22);
  border-radius:8px;
  box-shadow:0 18px 44px rgba(0,0,0,.42),0 0 24px rgba(64,196,255,.14);
}

:global(.notification-menu .q-list){
  color:#f5fbff;
  background:transparent;
}

:global(.notification-menu .q-item){
  color:#f5fbff;
  background:#07111f;
}

:global(.notification-menu .q-item:hover){
  background:rgba(64,196,255,.1);
}

:global(.notification-menu-head){
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  padding:10px 12px;
  border-bottom:1px solid rgba(255,255,255,.07);
}

:global(.notification-menu-head span){
  color:#e9eff1;
  font-size:12px;
  font-weight:800;
  text-transform:uppercase;
}

:global(.notification-menu-head strong){
  color:#ff4d5e;
  font-size:18px;
  font-weight:900;
}

:global(.notification-item){
  min-height:58px;
}

:global(.notification-item .q-item__label){
  color:#f5fbff;
  font-size:12px;
  font-weight:700;
}

:global(.notification-item .q-item__label--caption),
:global(.notification-empty .q-item__label){
  color:#8fa9b8;
  font-size:11px;
}

:global(.notification-view-all){
  color:#40c4ff;
  font-size:12px;
  font-weight:800;
  text-transform:uppercase;
}

.language-active{
  color:#40c4ff;
  background:rgba(64,196,255,.14);
}

.operator-clock{
  font-size:20px;
  font-weight:800;
  color:#f5fbff;
  font-variant-numeric:tabular-nums;
}

.operator-date{
  color:#8fa9b8;
  font-size:11px;
}

@media (max-width: 1320px){
  .command-topbar{
    grid-template-columns:1fr;
  }

  .operator-cluster{
    justify-content:start;
  }
}

@media (max-width: 820px){
  .command-status-grid{
    grid-template-columns:1fr;
  }

  .operator-cluster{
    justify-content:space-between;
  }
}
</style>
