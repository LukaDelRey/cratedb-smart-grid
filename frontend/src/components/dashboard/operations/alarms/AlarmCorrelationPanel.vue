<template>
  <q-card flat bordered class="scada-card correlation-panel">
    <q-card-section class="correlation-header row items-center justify-between">
      <div>
        <div class="section-kicker-light">{{ t('dashboard.alarmCorrelation') }}</div>
      </div>

      <div class="row items-center q-gutter-xs">
        <q-badge color="negative">
          {{ criticalCount }} {{ t('dashboard.criticalLower') }}
        </q-badge>
        <q-badge color="cyan" text-color="black">
          {{ correlations.length }} {{ t('dashboard.groups') }}
        </q-badge>
      </div>
    </q-card-section>

    <q-card-section class="correlation-body q-pa-none">
      <div class="correlation-summary-strip">
        <div>
          <span>{{ t('dashboard.avgConfidence') }}</span>
          <strong>{{ averageConfidence }}%</strong>
        </div>
        <div>
          <span>{{ t('dashboard.relatedAlarms') }}</span>
          <strong>{{ totalRelatedAlarms }}</strong>
        </div>
        <div>
          <span>{{ t('dashboard.affectedAssets') }}</span>
          <strong>{{ totalAffectedAssets }}</strong>
        </div>
      </div>

      <div class="correlation-list">
        <button
          v-for="incident in correlations"
          :key="incident.id"
          type="button"
          class="correlation-incident"
          @click="$emit('select', incident.id)"
        >
          <span :class="['incident-severity-dot', incident.severity.toLowerCase()]" />

          <span class="incident-main">
            <strong>{{ translateText(incident.title) }}</strong>
            <small>{{ translateText(incident.nextAction) }}</small>
          </span>

          <span class="incident-meta">
            <q-badge :color="severityColor(incident.severity)">
              {{ translateStatus(incident.severity) }}
            </q-badge>
            <small>{{ incident.relatedAlarmCount }} {{ t('dashboard.alarmsLower') }} / {{ incident.affectedAssets.length }} {{ t('dashboard.assetsLower') }}</small>
          </span>

          <q-circular-progress
            show-value
            size="38px"
            :value="incident.confidence"
            color="cyan"
            track-color="blue-grey-10"
            class="text-cyan incident-confidence"
          >
            {{ incident.confidence }}%
          </q-circular-progress>

          <q-icon name="chevron_right" class="incident-open-icon" />
        </button>

        <div
          v-if="!correlations.length"
          class="correlation-empty"
        >
          <q-icon name="check_circle" color="positive" size="24px" />
          <div>
            <strong>{{ t('dashboard.noActiveAlarmClusters') }}</strong>
            <span>{{ t('dashboard.theAlarmEngineHasNoGroupedIncidentsRightNow') }}</span>
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'
import { useI18n } from '../../../../i18n'

defineEmits(['select'])
const { t, translateText, translateStatus } = useI18n()

const props = defineProps({
  correlations:{
    type:Array as PropType<any[]>,
    default:() => []
  }
})

const criticalCount = computed(() =>
  props.correlations.filter(item => item.severity === 'CRITICAL').length
)

const totalRelatedAlarms = computed(() =>
  props.correlations.reduce((sum,item) => sum + (item.relatedAlarmCount || 0), 0)
)

const totalAffectedAssets = computed(() =>
  new Set(props.correlations.flatMap(item => item.affectedAssets || [])).size
)

const averageConfidence = computed(() => {
  if(!props.correlations.length){
    return 0
  }

  return Math.round(
    props.correlations.reduce((sum,item) => sum + (item.confidence || 0), 0) /
    props.correlations.length
  )
})

function severityColor(severity){
  if(severity === 'CRITICAL') return 'negative'
  if(severity === 'WARNING') return 'warning'
  return 'info'
}
</script>

<style scoped>
.correlation-panel{
  display:flex;
  flex-direction:column;
  height:100%;
  min-height:0;
}

.correlation-header{
  flex:0 0 auto;
  min-height:42px;
  padding:7px 10px;
}

.correlation-body{
  flex:1 1 auto;
  min-height:0;
  display:grid;
  grid-template-rows:auto minmax(0,1fr);
}

.correlation-summary-strip{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:7px;
  padding:0 10px 8px;
}

.correlation-summary-strip div{
  min-width:0;
  padding:7px 8px;
  border:1px solid rgba(255,255,255,.07);
  border-radius:7px;
  background:rgba(255,255,255,.026);
}

.correlation-summary-strip span{
  display:block;
  overflow:hidden;
  color:#8fa9b8;
  font-size:10px;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.correlation-summary-strip strong{
  display:block;
  margin-top:2px;
  color:#f5fbff;
  font-size:14px;
}

.correlation-list{
  min-height:0;
  overflow:auto;
  padding:0 10px 9px;
  scrollbar-width:thin;
}

.correlation-incident{
  width:100%;
  min-height:54px;
  display:grid;
  grid-template-columns:13px minmax(0,1fr) minmax(160px,.55fr) 42px 18px;
  align-items:center;
  gap:9px;
  margin-bottom:7px;
  padding:7px 8px;
  border:1px solid rgba(255,255,255,.075);
  border-radius:8px;
  color:#f5fbff;
  background:rgba(255,255,255,.026);
  cursor:pointer;
  font:inherit;
  text-align:left;
}

.correlation-incident:hover{
  border-color:rgba(64,196,255,.3);
  background:rgba(64,196,255,.07);
}

.incident-severity-dot{
  width:10px;
  height:10px;
  border-radius:999px;
  background:#40c4ff;
  box-shadow:0 0 10px currentColor;
}

.incident-severity-dot.critical{
  color:#ff4d5e;
  background:#ff4d5e;
}

.incident-severity-dot.warning{
  color:#ffb238;
  background:#ffb238;
}

.incident-main,
.incident-meta{
  min-width:0;
  display:grid;
  gap:2px;
}

.incident-main strong,
.incident-main small,
.incident-meta small{
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.incident-main strong{
  font-size:12px;
}

.incident-main small,
.incident-meta small{
  color:#8fa9b8;
  font-size:10px;
}

.incident-confidence{
  font-size:10px;
}

.incident-open-icon{
  color:#8fa9b8;
}

.correlation-empty{
  display:flex;
  align-items:center;
  gap:10px;
  min-height:72px;
  padding:12px;
  border:1px solid rgba(255,255,255,.07);
  border-radius:8px;
  background:rgba(255,255,255,.026);
}

.correlation-empty strong,
.correlation-empty span{
  display:block;
}

.correlation-empty span{
  color:#8fa9b8;
  font-size:11px;
}
</style>
