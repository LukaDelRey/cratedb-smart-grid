<template>
  <div class="grid-health-stack">
    <q-card flat bordered class="health-card grid-health-card text-white">
      <q-card-section class="grid-health-section">
        <div class="section-kicker-light">{{ t('dashboard.gridHealth') }}</div>

        <div class="grid-health-gauge">
          <q-circular-progress
            show-value
            size="112px"
            :thickness="0.12"
            :value="healthScore"
            :color="healthColor"
            track-color="blue-grey-10"
            class="text-white text-weight-bold grid-health-progress"
          >
            <div class="grid-health-score">
              <strong>{{ healthScore }}</strong>
              <span :class="`text-${healthColor}`">{{ healthLabel }}</span>
            </div>
          </q-circular-progress>
        </div>

        <div class="grid-health-stats">
          <div
            v-for="item in statusRows"
            :key="item.label"
            class="grid-health-stat"
          >
            <span>{{ item.label }}</span>
            <div :class="`text-${item.color}`">{{ item.value }}</div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="health-card system-health-card text-white">
      <q-card-section class="system-health-section">
        <q-icon name="monitor_heart" color="cyan" size="28px" />

        <div>
          <div class="section-kicker-light">{{ t('dashboard.systemHealth') }}</div>
          <strong :class="`text-${systemColor}`">{{ systemLabel }}</strong>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'
import { useI18n } from '../../../i18n'

const { t } = useI18n()

const props = defineProps({
  summary:{
    type:Object as PropType<Record<string, any>>,
    required:true
  },
  stations:{
    type:Array as PropType<any[]>,
    default:() => []
  },
  connection:{
    type:Object as PropType<Record<string, any>>,
    required:true
  }
})

const healthScore = computed(() =>
  Math.max(0, Math.min(100, Math.round(Number(props.summary.gridHealth) || 0)))
)

const totalStations = computed(() =>
  Number(props.summary.stations) || props.stations.length
)

const offlineCount = computed(() => {
  const fromStations = props.stations.filter(station =>
    station.alarms?.offline ||
    station.alarms?.sensor_failure
  ).length

  if(fromStations){
    return fromStations
  }

  return Math.max(0, Math.round(totalStations.value * ((100 - healthScore.value) / 100) * 0.45))
})

const maintenanceCount = computed(() => {
  const warningStations = props.stations.filter(station =>
    station.alarms?.overload ||
    station.alarms?.overheating ||
    station.alarms?.voltage_drop
  ).length

  if(warningStations){
    return warningStations
  }

  return Math.max(0, Number(props.summary.activeAlarms) || Math.round(totalStations.value * 0.015))
})

const onlineCount = computed(() =>
  Math.max(0, totalStations.value - offlineCount.value - maintenanceCount.value)
)

const healthColor = computed(() => {
  if(healthScore.value >= 80) return 'positive'
  if(healthScore.value >= 60) return 'warning'
  return 'negative'
})

const healthLabel = computed(() => {
  if(healthScore.value >= 80) return t('dashboard.good')
  if(healthScore.value >= 60) return t('dashboard.watch')
  return t('dashboard.critical')
})

const statusRows = computed(() => [
  {
    label:t('dashboard.totalSubstations'),
    value:formatNumber(totalStations.value),
    color:'white'
  },
  {
    label:t('dashboard.onlineLabel'),
    value:formatNumber(onlineCount.value),
    color:'positive'
  },
  {
    label:t('dashboard.offlineLabel'),
    value:formatNumber(offlineCount.value),
    color:'deep-orange'
  },
  {
    label:t('dashboard.maintenance'),
    value:formatNumber(maintenanceCount.value),
    color:'warning'
  }
])

const systemColor = computed(() => {
  if(!props.connection.websocketConnected && !props.connection.crateConnected) return 'negative'
  if(props.connection.quality === 'degraded') return 'warning'
  return 'positive'
})

const systemLabel = computed(() => {
  if(systemColor.value === 'negative') return t('dashboard.telemetryOffline')
  if(systemColor.value === 'warning') return t('dashboard.degradedOperations')
  return t('dashboard.allSystemsOperational')
})

function formatNumber(value){
  return Math.round(Number(value) || 0).toLocaleString()
}
</script>

<style scoped>
.grid-health-stack{
  display:grid;
  gap:10px;
}

.grid-health-card,
.system-health-card{
  background:linear-gradient(180deg,rgba(9,20,32,.94),rgba(5,12,22,.98));
}

.grid-health-section{
  padding:12px 14px 13px;
}

.grid-health-gauge{
  display:grid;
  place-items:center;
  padding:12px 0 10px;
}

.grid-health-progress{
  filter:drop-shadow(0 0 12px rgba(113,242,63,.18));
}

.grid-health-score{
  display:grid;
  place-items:center;
  line-height:1;
}

.grid-health-score strong{
  font-size:32px;
  line-height:1;
  font-weight:800;
  font-variant-numeric:tabular-nums;
}

.grid-health-score span{
  margin-top:7px;
  font-size:11px;
  font-weight:700;
}

.grid-health-stats{
  display:grid;
}

.grid-health-stat{
  min-height:30px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  border-top:1px solid rgba(255,255,255,.075);
  font-size:12px;
}

.grid-health-stat span{
  color:#a8bdc9;
}

.grid-health-stat strong{
  font-size:13px;
  font-weight:800;
  font-variant-numeric:tabular-nums;
}

.system-health-section{
  min-height:70px;
  display:grid;
  grid-template-columns:30px 1fr;
  align-items:center;
  gap:10px;
  padding:12px 14px;
}

.system-health-section strong{
  display:block;
  margin-top:3px;
  font-size:11px;
  line-height:1.25;
}
</style>

<style>
.health-card{
  background:rgba(255,255,255,.035);
  border-color:rgba(0,229,255,.18);
  border-radius:8px;
}
</style>
