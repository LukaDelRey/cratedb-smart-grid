<template>
  <q-card flat bordered class="scada-card insights-panel">
    <q-card-section class="row items-center justify-between q-pb-sm">
      <div>
        <div class="section-kicker-light">{{ t('dashboard.predictiveGridInsights') }}</div>
      </div>

      <q-btn dense flat color="cyan" :label="expanded ? t('dashboard.showLess') : t('dashboard.viewAll')"
        :disable="!hasHiddenInsights" class="insights-action" @click.stop="expanded = !expanded" />
    </q-card-section>

    <q-list class="panel-scroll-list">
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
          <q-btn
            flat
            round
            dense
            size="13px"
            icon="push_pin"
            color="cyan"
            :aria-label="t('dashboard.showStationOnMap')"
            :disable="!item.assetId"
            @click.stop="emit('focus-station', item.assetId)"
          >
            <q-tooltip>{{ t('dashboard.showStationOnMap') }}</q-tooltip>
          </q-btn>
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
const emit = defineEmits<{
  'focus-station': [stationId:string]
}>()

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
  if(['voltage', 'frequency', 'harmonics', 'insulation', 'oil', 'discharge'].includes(type)) return type
  return 'electrical'
}

function severityIcon(type:string){
  const icons:Record<string, string> = {
    overload:'bolt', cooling:'device_thermostat', maintenance:'build',
    voltage:'electric_meter', frequency:'speed', harmonics:'waves',
    insulation:'shield', oil:'water_drop', discharge:'flash_on'
  }
  return icons[type] || 'bolt'
}
</script>

<style scoped>
.insights-panel{
  height:412px; min-width:0; display:flex; flex-direction:column; overflow:hidden;
  background:linear-gradient(180deg,rgba(9,20,32,.96),rgba(5,12,22,.98));
}
.insights-panel > .q-card__section{flex:0 0 auto; padding:10px 12px 8px; min-height:44px; gap:8px}
.insights-action{min-height:24px; padding:2px 6px; font-size:10px; flex-shrink:0}
.panel-scroll-list{
  flex:1 1 auto; min-height:0; padding:8px 8px 12px;
  display:grid; grid-auto-rows:min-content; align-content:start; gap:8px;
  overflow:auto; scrollbar-width:thin; scrollbar-gutter:stable; overscroll-behavior:contain;
}
.insights-panel .scada-list-item{
  padding:12px 6px; margin:0; align-items:center; min-height:0;
  border:1px solid rgba(255,255,255,.07);
}
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
.insight-icon.voltage{color:#54e7ff}
.insight-icon.frequency{color:#6cddb3}
.insight-icon.harmonics{color:#91a7ff}
.insight-icon.insulation{color:#d39bef}
.insight-icon.oil{color:#f2cb78}
.insight-icon.discharge{color:#ff6b74}
.insights-panel :deep(.q-item__section--side:not(.insight-icon-section)){
  flex:0 0 auto; min-width:0; padding-left:8px; align-self:center;
}
.insights-empty{padding:12px; color:#8fa9b8; font-size:12px}
</style>
