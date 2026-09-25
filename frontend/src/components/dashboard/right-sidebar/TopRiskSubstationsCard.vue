<template>
  <q-card
    flat
    bordered
    class="scada-card top-risk-card"
    style="height: 316px"
    :style="{ paddingRight: !expanded ? '10px' : '' }"
  >
    <q-card-section class="top-risk-header">
      <div>
        <div class="section-kicker-light">{{ t('dashboard.topRiskSubstations') }}</div>
      </div>

      <q-btn
        dense
        flat
        color="cyan"
        :label="actionLabel"
        :disable="!hasHiddenStations"
        class="top-risk-action"
        @click.stop="expanded = !expanded"
      />
    </q-card-section>

    <q-card-section
      class="top-risk-body"
      :class="{ 'top-risk-body--expanded': expanded }"
    >
      <div
        v-for="station in displayStations"
        :key="station.id"
        class="top-risk-row cursor-pointer"
        role="button"
        tabindex="0"
        @click="selectStation(station.id)"
        @keydown.enter.prevent="selectStation(station.id)"
        @keydown.space.prevent="selectStation(station.id)"
      >
        <div :class="['risk-rank', station.level]">
          <q-icon :name="station.icon" size="13px" />
        </div>

        <div class="risk-asset q-pl-sm">
          <strong>{{ station.id }}</strong>
          <span>{{ station.name }}</span>
        </div>

        <div class="risk-progress">
          <span :style="{ width: `${station.risk}%` }" />
        </div>

        <b class="text-weight-medium">{{ station.risk }}%</b>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PropType } from 'vue'
import { useI18n } from '../../../i18n'

const emit = defineEmits(['select-station'])
const { t } = useI18n()

const props = defineProps({
  stations:{
    type:Array as PropType<any[]>,
    default:() => []
  }
})

const expanded = ref(false)

const enrichedStations = computed(() =>
  props.stations
    .map(station => {
      const level = station.risk >= 70
        ? 'critical'
        : station.risk >= 40
          ? 'warning'
          : 'normal'

      return {
        ...station,
        level,
        icon:level === 'critical'
          ? 'priority_high'
          : level === 'warning'
            ? 'bolt'
            : 'check'
      }
    })
)

const collapsedLimit = 6

const hasHiddenStations = computed(() => enrichedStations.value.length > collapsedLimit)

const displayStations = computed(() =>
  expanded.value
    ? enrichedStations.value
    : enrichedStations.value.slice(0, collapsedLimit)
)

const actionLabel = computed(() =>
  expanded.value ? t('dashboard.showLess') : t('dashboard.viewAll')
)

function selectStation(stationId){
  emit('select-station', stationId)
}
</script>

<style scoped>
.top-risk-card{
  display:flex;
  flex-direction:column;
  background:
    linear-gradient(180deg,rgba(9,20,32,.96),rgba(5,12,22,.98));
  transition:height .18s ease;
}

.top-risk-header{
  min-height:52px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:10px 12px 8px;
}

.top-risk-action{
  min-height:24px;
  padding:2px 6px;
  font-size:10px;
}

.top-risk-body{
  flex:1 1 auto;
  min-height:0;
  display:grid;
  grid-auto-rows:min-content;
  gap:6px;
  padding:0 12px 11px;
  overflow:hidden;
}

.top-risk-body--expanded{
  overflow:auto;
}

.top-risk-row{
  min-height:28px;
  display:grid;
  grid-template-columns:22px minmax(92px,1fr) minmax(68px,.8fr) 34px;
  align-items:center;
  gap:8px;
  padding:4px 0;
  border-bottom:1px solid rgba(255,255,255,.065);
  outline:0;
  transition:background .16s ease, border-color .16s ease;
}

.top-risk-row:last-child{
  border-bottom:0;
}

.top-risk-row:hover,
.top-risk-row:focus-visible{
  border-color:rgba(64,196,255,.28);
  background:rgba(64,196,255,.075);
}

.risk-rank{
  width:18px;
  height:18px;
  display:grid;
  place-items:center;
  border:1px solid currentColor;
  border-radius:50%;
  background:rgba(255,255,255,.045);
  box-shadow:0 0 10px currentColor;
}

.risk-rank.normal{ color:#61e86b; }
.risk-rank.warning{ color:#ffb238; }
.risk-rank.critical{ color:#ff4d5e; }

.risk-asset{
  min-width:0;
}

.risk-asset strong,
.risk-asset span{
  display:block;
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.risk-asset strong{
  color:#f5fbff;
  font-size:12px;
  line-height:1.12;
}

.risk-asset span{
  margin-top:2px;
  color:#8fa9b8;
  font-size:10px;
  line-height:1.1;
}

.risk-progress{
  height:5px;
  overflow:hidden;
  border-radius:999px;
  background:rgba(142,169,184,.18);
}

.risk-progress span{
  display:block;
  height:100%;
  border-radius:inherit;
  background:linear-gradient(90deg,#38bfff 0%,#54e7ff 32%,#ffb238 68%,#ff4d5e 100%);
  box-shadow:0 0 10px rgba(56,191,255,.28);
}

.top-risk-row b{
  color:#f5fbff;
  font-size:12px;
  text-align:right;
  font-variant-numeric:tabular-nums;
}

.top-risk-row b.normal{ color:#61e86b; }
.top-risk-row b.warning{ color:#ffb238; }
.top-risk-row b.critical{ color:#ff6b74; }
</style>

<style>
.top-risk-card .q-card__section{
  padding:10px 12px;
}
</style>
