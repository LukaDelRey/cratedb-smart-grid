<template>
  <q-card flat bordered class="scada-card event-stream-panel">
    <q-card-section class="event-stream-header row items-center justify-between">
      <div>
        <div class="section-kicker-light">{{ t('dashboard.realtimeEventStream') }}</div>
      </div>

      <div class="row items-center q-gutter-xs">
        <q-badge color="negative">
          {{ criticalCount }} {{ t('dashboard.criticalLower') }}
        </q-badge>
        <q-badge color="cyan" text-color="black">
          {{ eventsPerMinute }} / min
        </q-badge>
      </div>
    </q-card-section>

    <q-card-section class="event-stream-tools">
      <q-btn-toggle
        v-model="activeFilter"
        dense
        unelevated
        toggle-color="cyan"
        toggle-text-color="black"
        text-color="blue-grey-2"
        class="event-filter-toggle"
        :options="filterOptions"
      />

      <q-input
        v-model="query"
        dense
        dark
        borderless
        clearable
        debounce="120"
        :placeholder="t('dashboard.searchAssetOrEvent')"
        class="event-search"
      >
        <template #prepend>
          <q-icon name="search" size="16px" />
        </template>
      </q-input>
    </q-card-section>

    <q-card-section class="q-pa-none event-stream-body">
      <div class="event-timeline">
        <button
          v-for="event in filteredEvents"
          :key="event.id"
          type="button"
          class="event-row"
        >
          <span :class="['event-pulse', event.severity.toLowerCase()]" />

          <span class="event-time">{{ formatTime(event.timestamp) }}</span>

          <q-icon
            :name="eventIcon(event.severity)"
            :color="eventColor(event.severity)"
            size="18px"
          />

          <span class="event-main">
            <strong>{{ translateText(event.title) }}</strong>
            <small>{{ translateText(event.description || 'Realtime telemetry event') }}</small>
          </span>

          <span class="event-source">
            <strong>{{ translateStatus(event.source || 'SYSTEM') }}</strong>
            <small>{{ event.assetId || 'grid' }}</small>
          </span>
        </button>

        <div
          v-if="!filteredEvents.length"
          class="event-empty"
        >
          <q-icon name="sensors_off" color="blue-grey-3" size="24px" />
          <span>{{ t('dashboard.noMatchingRealtimeEvents') }}</span>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PropType } from 'vue'
import { useI18n } from '../../../i18n'
import type { AlarmEvent } from '../../../types/dashboard'
import { formatClockTime as formatTime } from '../../../utils/dateTime'

const props = defineProps({
  events:{
    type:Array as PropType<AlarmEvent[]>,
    default:() => []
  }
})

const activeFilter = ref('ALL')
const query = ref('')
const { t, translateText, translateStatus } = useI18n()

const filterOptions = computed(() => [
  { label:t('dashboard.all'), value:'ALL' },
  { label:t('dashboard.critical'), value:'CRITICAL' },
  { label:t('dashboard.warn'), value:'WARNING' },
  { label:t('dashboard.info'), value:'INFO' }
])

const criticalCount = computed(() =>
  props.events.filter(event => event.severity === 'CRITICAL').length
)

const eventsPerMinute = computed(() => {
  const cutoff = Date.now() - 60 * 1000

  return props.events.filter(event => {
    const timestamp = Date.parse(event.timestamp)
    return Number.isFinite(timestamp) && timestamp >= cutoff
  }).length
})

const filteredEvents = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase()

  return props.events.filter(event => {
    const matchesFilter = activeFilter.value === 'ALL' || event.severity === activeFilter.value
    const haystack = [
      event.title,
      event.description,
      event.source,
      event.assetId,
      event.severity
    ].join(' ').toLowerCase()

    return matchesFilter && (!normalizedQuery || haystack.includes(normalizedQuery))
  })
})

function eventColor(severity){
  if(severity === 'CRITICAL') return 'negative'
  if(severity === 'WARNING') return 'warning'
  return 'cyan'
}

function eventIcon(severity){
  if(severity === 'CRITICAL') return 'report'
  if(severity === 'WARNING') return 'warning'
  return 'sensors'
}

</script>

<style scoped>
.event-stream-panel{
  display:flex;
  flex-direction:column;
  height:100%;
  min-height:0;
}

.event-stream-header{
  flex:0 0 auto;
  min-height:40px;
  padding:7px 10px;
}

.event-stream-tools{
  flex:0 0 auto;
  display:grid;
  grid-template-columns:auto minmax(160px,260px);
  gap:8px;
  align-items:center;
  padding:0 10px 8px;
}

.event-filter-toggle{
  min-width:0;
  overflow:hidden;
  border:1px solid rgba(64,196,255,.14);
  border-radius:7px;
  background:rgba(6,16,30,.58);
}

.event-search{
  min-height:28px;
  padding:0 8px;
  border:1px solid rgba(64,196,255,.14);
  border-radius:7px;
  background:rgba(6,16,30,.58);
}

.event-stream-body{
  flex:1 1 auto;
  min-height:0;
}

.event-timeline{
  height:100%;
  min-height:0;
  overflow:auto;
  padding:0 10px 9px;
  scrollbar-width:thin;
}

.event-row{
  width:100%;
  min-height:42px;
  display:grid;
  grid-template-columns:10px 66px 22px minmax(0,1fr) minmax(98px,.28fr);
  align-items:center;
  gap:8px;
  margin-bottom:6px;
  padding:6px 8px;
  border:1px solid rgba(255,255,255,.07);
  border-radius:8px;
  color:#f5fbff;
  background:rgba(255,255,255,.026);
  font:inherit;
  text-align:left;
}

.event-pulse{
  width:8px;
  height:8px;
  border-radius:999px;
  color:#40c4ff;
  background:#40c4ff;
  box-shadow:0 0 10px currentColor;
}

.event-pulse.critical{
  color:#ff4d5e;
  background:#ff4d5e;
}

.event-pulse.warning{
  color:#ffb238;
  background:#ffb238;
}

.event-time{
  color:#8fa9b8;
  font-size:10px;
  font-variant-numeric:tabular-nums;
}

.event-main,
.event-source{
  min-width:0;
  display:grid;
  gap:1px;
}

.event-main strong,
.event-main small,
.event-source strong,
.event-source small{
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.event-main strong,
.event-source strong{
  font-size:12px;
}

.event-main small,
.event-source small{
  color:#8fa9b8;
  font-size:10px;
}

.event-empty{
  height:100%;
  min-height:84px;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  color:#8fa9b8;
}
</style>
