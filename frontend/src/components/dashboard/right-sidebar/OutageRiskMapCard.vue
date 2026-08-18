<template>
  <q-card flat bordered class="scada-card outage-risk-card" style="height: 250px">
    <q-card-section class="outage-risk-header">
      <div>
        <div class="section-kicker-light">{{ t('dashboard.outageRiskMap') }}</div>
      </div>

      <q-badge outline :color="badgeColor" class="outage-risk-badge">
        {{ riskState }}
      </q-badge>
    </q-card-section>

    <q-card-section class="outage-risk-body">
      <div class="outage-risk-summary">
        <div>
          <span>{{ t('dashboard.source') }}</span>
          <strong>{{ primaryStation?.id || '--' }}</strong>
        </div>
        <div>
          <span>{{ t('dashboard.cascade') }}</span>
          <strong>{{ cascadeRisk }}%</strong>
        </div>
        <div>
          <span>{{ t('dashboard.watch') }}</span>
          <strong>{{ exposedCount }}</strong>
        </div>
      </div>

      <div class="outage-risk-map">
        <div v-if="!mapStations.length" class="outage-empty-state">
          {{ t('dashboard.waitingForLiveStationRisk') }}
        </div>

        <span
          v-for="zone in heatZones"
          :key="zone.id"
          :class="['risk-heat-zone', zone.level]"
          :style="zone.style"
        />

        <span
          v-for="line in lines"
          :key="line.id"
          :class="['outage-line', line.level]"
          :style="line.style"
        />

        <span
          v-for="node in nodes"
          :key="node.id"
          :class="['outage-node', node.level]"
          :style="node.style"
        >
          <i />
        </span>

        <span
          v-for="station in mapStations"
          :key="`label-${station.id}`"
          :class="['map-label', station.level]"
          :style="station.labelStyle"
        >
          {{ station.id }}
        </span>

        <div class="risk-scale">
          <span>{{ t('dashboard.high') }}</span>
          <i />
          <span>{{ t('dashboard.low') }}</span>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../../../i18n'

const { t } = useI18n()

const props = defineProps({
  stations:{
    type:Array,
    default:() => []
  }
})

const positions = [
  { left:18, top:52, labelX:8, labelY:37 },
  { left:34, top:32, labelX:27, labelY:17 },
  { left:50, top:57, labelX:43, labelY:64 },
  { left:66, top:36, labelX:59, labelY:21 },
  { left:82, top:58, labelX:75, labelY:65 },
  { left:46, top:78, labelX:39, labelY:84 }
]

const mapStations = computed(() =>
  props.stations
    .filter(station => Number.isFinite(station.risk))
    .slice(0, 6)
    .map((station,index) => ({
      ...station,
      position:positions[index % positions.length],
      labelStyle:{
        left:`${positions[index % positions.length].labelX}%`,
        top:`${positions[index % positions.length].labelY}%`
      },
      level:riskLevel(station.risk)
    }))
)

const primaryStation = computed(() => mapStations.value[0] || null)

const exposedCount = computed(() =>
  mapStations.value.filter(station => station.risk >= 40).length
)

const cascadeRisk = computed(() => {
  const risky = mapStations.value.slice(0, 3)

  if(!risky.length) return 0

  return Math.round(
    risky.reduce((sum,station) => sum + station.risk, 0) / risky.length
  )
})

const riskState = computed(() => {
  if(cascadeRisk.value >= 70) return t('dashboard.critical')
  if(cascadeRisk.value >= 40) return t('dashboard.watch')
  return t('dashboard.normal')
})

const badgeColor = computed(() => {
  if(cascadeRisk.value >= 70) return 'negative'
  if(cascadeRisk.value >= 40) return 'warning'
  return 'positive'
})

const nodes = computed(() =>
  mapStations.value.map(station => ({
    id:station.id,
    level:station.level,
    style:{
      left:`${station.position.left}%`,
      top:`${station.position.top}%`
    }
  }))
)

const lines = computed(() =>
  mapStations.value.slice(0, -1).map((station,index) => {
    const next = mapStations.value[index + 1]
    const dx = next.position.left - station.position.left
    const dy = next.position.top - station.position.top
    const width = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx) * 180 / Math.PI

    return {
      id:`${station.id}-${next.id}`,
      level:riskLevel(Math.max(station.risk, next.risk)),
      style:{
        left:`${station.position.left}%`,
        top:`${station.position.top}%`,
        width:`${width}%`,
        transform:`rotate(${angle}deg)`
      }
    }
  })
)

const heatZones = computed(() =>
  mapStations.value
    .filter(station => station.risk >= 40)
    .slice(0, 4)
    .map(station => ({
      id:`zone-${station.id}`,
      level:station.level,
      style:{
        left:`${station.position.left}%`,
        top:`${station.position.top}%`,
        '--risk-size':`${Math.max(54, Math.min(96, station.risk + 20))}px`
      }
    }))
)

function riskLevel(risk){
  if(risk >= 70) return 'critical'
  if(risk >= 40) return 'warning'
  return 'normal'
}
</script>

<style scoped>
.outage-risk-card{
  background:
    linear-gradient(180deg,rgba(9,20,32,.96),rgba(5,12,22,.98));
}

.outage-risk-header{
  min-height:52px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:10px 12px 8px;
}

.outage-risk-badge{
  font-size:10px;
}

.outage-risk-body{
  display:grid;
  gap:8px;
  padding:0 12px 12px;
}

.outage-risk-summary{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:6px;
}

.outage-risk-summary div{
  min-width:0;
  padding:6px 7px;
  border:1px solid rgba(255,255,255,.07);
  border-radius:6px;
  background:rgba(255,255,255,.03);
}

.outage-risk-summary span,
.outage-risk-summary strong{
  display:block;
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.outage-risk-summary span{
  color:#8fa9b8;
  font-size:9px;
  line-height:1.1;
  text-transform:uppercase;
}

.outage-risk-summary strong{
  margin-top:2px;
  color:#f5fbff;
  font-size:11px;
  line-height:1.1;
  font-variant-numeric:tabular-nums;
}

.outage-risk-map{
  height:132px;
  position:relative;
  overflow:hidden;
  border:1px solid rgba(64,196,255,.16);
  border-radius:8px;
  background:
    linear-gradient(90deg, rgba(64,196,255,.08) 1px, transparent 1px),
    linear-gradient(0deg, rgba(64,196,255,.07) 1px, transparent 1px),
    radial-gradient(circle at 50% 54%, rgba(64,196,255,.11), transparent 42%),
    #06101b;
  background-size:24px 24px,24px 24px,auto,auto;
}

.outage-empty-state{
  position:absolute;
  inset:0;
  display:grid;
  place-items:center;
  color:#8fa9b8;
  font-size:11px;
  z-index:2;
}

.outage-risk-map::before,
.outage-risk-map::after{
  content:"";
  position:absolute;
  inset:9px 38px 13px 8px;
  border-radius:50%;
  border:1px solid rgba(64,196,255,.08);
  transform:rotate(-14deg);
}

.outage-risk-map::after{
  inset:28px 72px 34px 28px;
  border-color:rgba(255,178,56,.11);
  transform:rotate(18deg);
}

.risk-heat-zone{
  --risk-size:72px;
  position:absolute;
  width:var(--risk-size);
  height:var(--risk-size);
  margin:calc(var(--risk-size) / -2) 0 0 calc(var(--risk-size) / -2);
  border-radius:50%;
  pointer-events:none;
  opacity:.72;
  filter:blur(2px);
}

.risk-heat-zone.normal{
  background:radial-gradient(circle,rgba(97,232,107,.26),transparent 66%);
}

.risk-heat-zone.warning{
  background:radial-gradient(circle,rgba(255,178,56,.34),transparent 68%);
}

.risk-heat-zone.critical{
  background:radial-gradient(circle,rgba(255,77,94,.42),transparent 70%);
}

.outage-line{
  position:absolute;
  height:2px;
  border-radius:999px;
  transform-origin:left center;
  opacity:.9;
}

.outage-line.normal{
  background:linear-gradient(90deg,#37bbff,#61e86b);
  box-shadow:0 0 8px rgba(55,187,255,.55);
}

.outage-line.warning{
  background:linear-gradient(90deg,#37bbff,#ffb238);
  box-shadow:0 0 9px rgba(255,178,56,.62);
}

.outage-line.critical{
  background:linear-gradient(90deg,#ff4d5e,#ffb238,#37bbff);
  box-shadow:0 0 11px rgba(255,77,94,.72);
}

.outage-node{
  position:absolute;
  width:18px;
  height:18px;
  margin:-9px 0 0 -9px;
  display:grid;
  place-items:center;
  border:2px solid currentColor;
  border-radius:50%;
  background:#07111f;
  box-shadow:0 0 16px currentColor;
}

.outage-node i{
  width:6px;
  height:6px;
  border-radius:50%;
  background:currentColor;
}

.outage-node.normal{ color:#61e86b; }
.outage-node.warning{ color:#ffb238; }
.outage-node.critical{ color:#ff4d5e; }

.map-label{
  position:absolute;
  color:rgba(235,248,255,.84);
  font-size:9px;
  font-weight:700;
  line-height:1;
  text-shadow:0 1px 6px #02060c;
  z-index:2;
}

.map-label.normal{ color:#c6f6cd; }
.map-label.warning{ color:#ffe2a8; }
.map-label.critical{ color:#ffb8be; }

.risk-scale{
  position:absolute;
  right:9px;
  top:14px;
  bottom:13px;
  display:grid;
  grid-template-rows:auto 1fr auto;
  gap:6px;
  align-items:center;
  color:#d6e7ee;
  font-size:10px;
  z-index:2;
}

.risk-scale i{
  width:8px;
  height:100%;
  justify-self:center;
  border-radius:999px;
  background:linear-gradient(180deg,#ff4d5e,#ffb238,#61e86b);
  box-shadow:0 0 10px rgba(255,178,56,.35);
}
</style>

<style>
.outage-risk-card .q-card__section{
  padding:12px;
}

.outage-risk-map{
  height:166px;
  position:relative;
  overflow:hidden;
  border:1px solid rgba(64,196,255,.14);
  border-radius:8px;
  background:
    radial-gradient(circle at 48% 52%, rgba(244,67,54,.22), transparent 24%),
    radial-gradient(circle at 24% 24%, rgba(255,152,0,.16), transparent 20%),
    linear-gradient(90deg, rgba(64,196,255,.08) 1px, transparent 1px),
    linear-gradient(0deg, rgba(64,196,255,.07) 1px, transparent 1px),
    #06101b;
  background-size:auto,auto,28px 28px,28px 28px,auto;
}

.outage-line{
  position:absolute;
  height:2px;
  border-radius:999px;
  background:linear-gradient(90deg,transparent,#24b9ff,#8df25c,transparent);
  transform-origin:left center;
  opacity:.72;
}

.outage-node{
  position:absolute;
  width:14px;
  height:14px;
  margin:-7px 0 0 -7px;
  border:2px solid currentColor;
  border-radius:50%;
  background:#07111f;
  box-shadow:0 0 14px currentColor;
}

.outage-node.normal{ color:#78e85d; }

.outage-node.warning{ color:#ffae38; }

.outage-node.critical{ color:#ff4e42; }

.risk-scale{
  position:absolute;
  right:10px;
  top:16px;
  bottom:12px;
  display:grid;
  grid-template-rows:auto 1fr auto;
  gap:6px;
  align-items:center;
  color:#d6e7ee;
  font-size:10px;
}

.risk-scale i{
  width:8px;
  height:100%;
  justify-self:center;
  border-radius:999px;
  background:linear-gradient(180deg,#ff4545,#ffd449,#67e85c);
}
</style>
