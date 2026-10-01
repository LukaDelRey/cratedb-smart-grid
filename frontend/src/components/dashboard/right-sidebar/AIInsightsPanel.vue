<template>
  <q-card flat bordered class="scada-card insights-panel">
    <q-card-section class="row items-center justify-between q-pb-sm">
      <div>
        <div class="section-kicker-light">{{ t('dashboard.predictiveGridInsights') }}</div>
      </div>

      <q-btn dense flat color="cyan" :label="expanded ? t('dashboard.showLess') : t('dashboard.viewAll')"
        :disable="!hasHiddenInsights" class="insights-action" @click.stop="expanded = !expanded" />
    </q-card-section>

    <q-list dense class="q-px-sm q-pb-sm panel-scroll-list" :class="{ 'panel-scroll-list--expanded': expanded }">
      <q-item
        v-for="item in displayInsights"
        :key="item.id"
        class="scada-list-item"
      >
        <q-item-section avatar class="insight-icon-section">
          <div :class="['insight-icon', insightTone(item.type)]">
            <q-icon :name="severityIcon(item.type)" size="19px" />
          </div>
        </q-item-section>

        <q-item-section class="insight-main">
          <q-item-label class="text-weight-bold">
            {{ translateText(item.title) }}
          </q-item-label>
          <q-item-label caption class="text-blue-grey-3">
            {{ item.assetId }} - {{ translateText(item.impact) }}
          </q-item-label>
          <q-item-label caption class="text-blue-grey-4">
            {{ translateText(item.recommendation) }}
          </q-item-label>
        </q-item-section>

        <q-item-section side>
          <q-circular-progress
            v-if="item.confidence != null"
            show-value
            size="42px"
            :value="item.confidence"
            color="cyan"
            track-color="blue-grey-10"
            class="text-cyan text-caption"
          >
            {{ item.confidence }}%
          </q-circular-progress>
          <span v-else class="insight-confidence">{{ t('dashboard.confidenceUnavailable') }}
            <q-tooltip>{{ t('dashboard.heuristicEstimate') }}</q-tooltip>
          </span>
        </q-item-section>
      </q-item>
      <div v-if="!insights.length" class="insights-empty">{{ t('dashboard.noThresholdInsights') }}</div>
    </q-list>
  </q-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PropType } from 'vue'
import { useI18n } from '../../../i18n'

const { t, translateText } = useI18n()

const props = defineProps({
  insights:{
    type:Array as PropType<any[]>,
    default:() => []
  }
})

const expanded = ref(false)
const collapsedLimit = 3
const hasHiddenInsights = computed(() => props.insights.length > collapsedLimit)
const displayInsights = computed(() => expanded.value ? props.insights : props.insights.slice(0, collapsedLimit))

function insightTone(type:string){
  if(type === 'cooling') return 'thermal'
  if(type === 'maintenance') return 'maintenance'
  return 'electrical'
}

function severityIcon(type){
  if(type === 'cooling') return 'device_thermostat'
  if(type === 'maintenance') return 'build'
  return 'bolt'
}
</script>

<style scoped>
.insights-panel{
  height:385px; min-width:0; display:flex; flex-direction:column; overflow:hidden;
  background:linear-gradient(180deg,rgba(9,20,32,.96),rgba(5,12,22,.98));
}
.insights-panel > .q-card__section{flex:0 0 auto; padding:10px 12px 8px; min-height:44px; gap:8px}
.insights-action{min-height:24px; padding:2px 6px; font-size:10px; flex-shrink:0}
.panel-scroll-list{flex:1 1 auto; min-height:0; overflow:hidden; scrollbar-width:thin}
.panel-scroll-list--expanded{overflow:auto; overscroll-behavior:contain}
.scada-list-item{padding:10px 6px; align-items:center; min-height:0; border-bottom:1px solid rgba(255,255,255,.065)}
.scada-list-item:last-of-type{border-bottom:0}
.insight-main{min-width:0}
.insight-main .q-item__label{overflow-wrap:anywhere; line-height:1.35 !important; font-size:11px}
.insight-main .text-weight-bold{font-size:12px; color:#edf7ff}
.insights-panel :deep(.insight-icon-section){
  align-self:stretch; justify-content:center; align-items:center;
  flex:0 0 56px; min-width:56px; padding:0 12px 0 5px;
}
.insight-icon{
  width:32px; height:32px; display:grid; place-items:center;
  border:1px solid currentColor; border-radius:50%;
  background:rgba(255,255,255,.035); box-shadow:0 0 10px color-mix(in srgb,currentColor 35%,transparent);
}
.insight-icon :deep(.q-icon){filter:drop-shadow(0 0 4px currentColor)}
.insight-icon.thermal{color:#ffb238}
.insight-icon.maintenance{color:#bd91ff}
.insight-icon.electrical{color:#41c9ff}
.insights-panel :deep(.q-item__section--side:not(.insight-icon-section)){
  flex:0 0 0px; min-width:36px; padding-left:8px; align-self:top;
}
.insight-confidence{font-size:11px; white-space:nowrap; color:#8fa9b8}
.insights-empty{padding:12px; color:#8fa9b8; font-size:12px}
</style>
