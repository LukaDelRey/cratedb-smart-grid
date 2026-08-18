<template>
  <q-card flat bordered class="scada-card root-cause-panel">
    <q-card-section class="root-cause-panel-header row items-center justify-between">
      <div>
        <div class="section-kicker-light">{{ t('dashboard.rootCauseAnalysis') }}</div>
      </div>

      <q-badge
        v-if="rootCause"
        :color="severityColor(rootCause.severity)"
      >
        {{ rootCause.confidence }}% {{ t('dashboard.confidenceLower') }}
      </q-badge>
    </q-card-section>

    <q-card-section v-if="rootCause" class="root-cause-body q-pa-none">
      <div class="root-cause-layout">
        <aside class="root-cause-summary-stack">
          <div class="root-cause-summary-card incident-title-card">
            <span>{{ t('dashboard.incident') }}</span>
            <strong>{{ translateText(rootCause.summary) }}</strong>
          </div>

          <div class="root-cause-summary-card">
            <span>{{ t('dashboard.affected') }}</span>
            <strong>{{ rootCause.affectedAssets.length }} {{ t('dashboard.assetsLower') }}</strong>
            <small>{{ affectedAssetsLabel }}</small>
          </div>

          <div class="root-cause-summary-card">
            <span>{{ t('dashboard.severity') }}</span>
            <strong :class="severityTextClass(rootCause.severity)">
              {{ translateStatus(rootCause.severity) }}
            </strong>
            <small>{{ recommendedAction }}</small>
          </div>
        </aside>

        <section class="root-cause-graph-panel">
          <div class="root-cause-graph-head">
            <div>
              <span>{{ t('dashboard.causalityGraph') }}</span>
              <strong>{{ rootCause.chain.length }} {{ t('dashboard.steps') }}</strong>
            </div>
            <q-badge color="cyan" text-color="black">
              AI RCA
            </q-badge>
          </div>

          <RootCauseGraph :chain="rootCause.chain" />
        </section>
      </div>
    </q-card-section>

    <q-card-section v-else class="root-cause-empty">
      <q-icon name="account_tree" color="blue-grey-3" size="28px" />
      <div>
        <strong>{{ t('dashboard.noActiveIncidentSelected') }}</strong>
        <span>{{ t('dashboard.rootCauseAnalysisWillPopulateWhenTheAlarmCorrelationEngineGroupsAnIncident') }}</span>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'
import RootCauseGraph from './RootCauseGraph.vue'
import { useI18n } from '../../../../i18n'

const { t, translateText, translateStatus } = useI18n()

const props = defineProps({
  rootCause:{
    type:Object,
    default:null
  }
})

const affectedAssetsLabel = computed(() =>
  (props.rootCause?.affectedAssets || []).slice(0, 3).join(', ') || t('dashboard.noImpactedAssets')
)

const recommendedAction = computed(() =>
  translateText(props.rootCause?.chain?.at(-1)?.title || 'Awaiting operator action')
)

function severityColor(severity){
  if(severity === 'CRITICAL') return 'negative'
  if(severity === 'WARNING') return 'warning'
  return 'info'
}

function severityTextClass(severity){
  if(severity === 'CRITICAL') return 'text-negative'
  if(severity === 'WARNING') return 'text-warning'
  return 'text-cyan'
}
</script>

<style scoped>
.root-cause-panel{
  display:flex;
  flex-direction:column;
  height:100%;
  min-height:0;
}

.root-cause-panel-header{
  flex:0 0 auto;
  min-height:36px !important;
  padding:6px 10px !important;
}

.root-cause-body{
  flex:1 1 auto;
  min-height:0;
  max-height:none !important;
  overflow:hidden !important;
  padding:0 !important;
}

.root-cause-layout{
  height:100%;
  min-height:0;
  display:grid;
  grid-template-columns:minmax(210px,.38fr) minmax(0,1fr);
  gap:9px;
  padding:0 10px 10px;
}

.root-cause-summary-stack{
  min-height:0;
  display:grid;
  grid-template-rows:1.15fr 1fr 1fr;
  gap:7px;
}

.root-cause-summary-card{
  min-width:0;
  min-height:0;
  display:flex;
  flex-direction:column;
  justify-content:center;
  padding:8px 9px;
  border:1px solid rgba(255,255,255,.075);
  border-radius:8px;
  background:rgba(255,255,255,.028);
}

.root-cause-summary-card span,
.root-cause-summary-card small{
  overflow:hidden;
  color:#8fa9b8;
  font-size:10px;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.root-cause-summary-card strong{
  display:block;
  margin-top:3px;
  overflow:hidden;
  color:#f5fbff;
  font-size:15px;
  line-height:1.12;
  text-overflow:ellipsis;
}

.incident-title-card strong{
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  white-space:normal;
}

.root-cause-graph-panel{
  min-width:0;
  min-height:0;
  display:grid;
  grid-template-rows:auto minmax(0,1fr);
  overflow:hidden;
  border:1px solid rgba(64,196,255,.13);
  border-radius:8px;
  background:rgba(5,12,22,.52);
}

.root-cause-graph-panel :deep(.root-flow){
  height:100%;
  min-height:0;
  border:0;
  border-radius:0;
}

.root-cause-graph-head{
  min-height:30px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  padding:6px 8px;
  border-bottom:1px solid rgba(255,255,255,.06);
}

.root-cause-graph-head span,
.root-cause-graph-head strong{
  display:block;
}

.root-cause-graph-head span{
  color:#8fa9b8;
  font-size:10px;
}

.root-cause-graph-head strong{
  color:#f5fbff;
  font-size:12px;
}

.root-cause-empty{
  height:100%;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:12px;
  color:#8fa9b8;
}

.root-cause-empty strong,
.root-cause-empty span{
  display:block;
}

.root-cause-empty strong{
  color:#f5fbff;
}
</style>

<style>
.root-cause-body{
  max-height:168px;
  overflow:auto;
  scrollbar-width:thin;
}
</style>
