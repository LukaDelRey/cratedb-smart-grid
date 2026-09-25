<template>
  <q-card flat bordered class="scada-card alarm-events-card active-alarm-events-card">
    <q-card-section class="alarm-events-header row items-center justify-between q-pb-xs">
      <div>
        <div class="section-kicker-light">{{ t('dashboard.activeAlarmsEvents') }}</div>
      </div>

      <div class="row items-center q-gutter-xs">
        <q-badge color="negative" class="alarm-count-badge">
          {{ activeCount }} {{ t('dashboard.activeLower') }}
        </q-badge>

        <q-btn
          dense
          outline
          color="cyan"
          icon="open_in_full"
          :label="t('dashboard.viewAll')"
          size="9px"
          padding="6px"
          class="compact-action-btn q-ml-sm"
          @click="viewAllOpen = true"
        />
      </div>
    </q-card-section>

    <q-card-section class="q-pa-none alarm-table-frame">
      <table class="alarm-events-table active-alarm-events-table alarm-events-header-table">
        <colgroup>
          <col class="alarm-col-time">
          <col class="alarm-col-severity">
          <col class="alarm-col-station">
          <col class="alarm-col-title">
          <col class="alarm-col-value">
          <col class="alarm-col-status">
          <col class="alarm-col-actions">
        </colgroup>
        <thead>
          <tr>
            <th>{{ t('dashboard.time') }}</th>
            <th>{{ t('dashboard.severity') }}</th>
            <th>{{ t('dashboard.station') }}</th>
            <th>{{ t('dashboard.alarm') }}</th>
            <th>{{ t('dashboard.value') }}</th>
            <th>{{ t('dashboard.status') }}</th>
            <th>{{ t('dashboard.actions') }}</th>
          </tr>
        </thead>
      </table>

      <div class="alarm-table-scroll">
        <table class="alarm-events-table active-alarm-events-table alarm-events-body-table">
          <colgroup>
            <col class="alarm-col-time">
            <col class="alarm-col-severity">
            <col class="alarm-col-station">
            <col class="alarm-col-title">
            <col class="alarm-col-value">
            <col class="alarm-col-status">
            <col class="alarm-col-actions">
          </colgroup>
          <tbody>
            <tr
              v-for="row in visibleRows"
              :key="row.id"
            >
              <td>{{ row.time }}</td>
              <td>
                <q-badge :class="['severity-badge', row.severity.toLowerCase()]">
                  {{ translateStatus(row.severity) }}
                </q-badge>
              </td>
              <td>{{ row.asset }}</td>
              <td class="alarm-title-cell">{{ translateText(row.title) }}</td>
              <td>{{ row.value }}</td>
              <td>
                <q-badge :color="statusColor(row)">
                  {{ translateStatus(displayStatus(row)) }}
                </q-badge>
              </td>
              <td class="alarm-actions-cell">
                <q-btn
                  flat
                  round
                  size="13px"
                  dense
                  icon="visibility"
                  color="blue-grey-2"
                  @click.stop="openAsset(row)"
                >
                  <q-tooltip>
                    {{ assetRoute(row) ? t('dashboard.openDigitalTwin') : t('dashboard.showOnGisMap') }}
                  </q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  round
                  size="13px"
                  dense
                  icon="push_pin"
                  color="cyan"
                  :disable="!mapStationId(row)"
                  @click.stop="pinStation(row)"
                >
                  <q-tooltip>{{ t('dashboard.showStationOnMap') }}</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  round
                  size="13px"
                  dense
                  icon="check"
                  :color="acknowledgedIds.has(row.id) ? 'blue-grey-4' : 'positive'"
                  @click.stop="acknowledge(row)"
                >
                  <q-tooltip>{{ t('dashboard.acknowledge') }}</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  round
                  size="13px"
                  dense
                  icon="build"
                  :color="workOrderIds.has(row.id) ? 'warning' : 'cyan'"
                  @click.stop="createWorkOrder(row)"
                >
                  <q-tooltip>{{ t('dashboard.createWorkOrder') }}</q-tooltip>
                </q-btn>
              </td>
            </tr>

            <tr v-if="!visibleRows.length">
              <td colspan="7" class="empty-alarm-row">
                {{ t('dashboard.noActiveAlarmsOrEvents') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </q-card-section>

    <q-dialog v-model="viewAllOpen">
      <q-card class="scada-card alarm-events-dialog">
        <q-card-section class="row items-center justify-between">
          <div>
            <div class="section-kicker-light">{{ t('dashboard.activeAlarmsEvents') }}</div>
            <div class="section-title">{{ t('dashboard.alarmEventRegister') }}</div>
          </div>

          <q-btn flat round dense icon="close" color="blue-grey-2" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-none dialog-alarm-table-frame">
          <table class="alarm-events-table active-alarm-events-table alarm-events-header-table">
            <colgroup>
              <col class="alarm-col-time">
              <col class="alarm-col-severity">
              <col class="alarm-col-station">
              <col class="alarm-col-title">
              <col class="alarm-col-value">
              <col class="alarm-col-status">
              <col class="alarm-col-actions">
            </colgroup>
            <thead>
              <tr>
                <th>{{ t('dashboard.time') }}</th>
                <th>{{ t('dashboard.severity') }}</th>
                <th>{{ t('dashboard.station') }}</th>
                <th>{{ t('dashboard.alarm') }}</th>
                <th>{{ t('dashboard.value') }}</th>
                <th>{{ t('dashboard.status') }}</th>
                <th>{{ t('dashboard.actions') }}</th>
              </tr>
            </thead>
          </table>

          <div class="dialog-alarm-table-scroll">
            <table class="alarm-events-table active-alarm-events-table alarm-events-body-table">
              <colgroup>
                <col class="alarm-col-time">
                <col class="alarm-col-severity">
                <col class="alarm-col-station">
                <col class="alarm-col-title">
                <col class="alarm-col-value">
                <col class="alarm-col-status">
                <col class="alarm-col-actions">
              </colgroup>
              <tbody>
                <tr
                  v-for="row in rows"
                  :key="`dialog-${row.id}`"
                >
                  <td>{{ row.time }}</td>
                  <td>
                    <q-badge :class="['severity-badge', row.severity.toLowerCase()]">
                      {{ translateStatus(row.severity) }}
                    </q-badge>
                  </td>
                  <td>{{ row.asset }}</td>
                  <td class="alarm-title-cell">{{ translateText(row.title) }}</td>
                  <td>{{ row.value }}</td>
                  <td>
                    <q-badge :color="statusColor(row)">
                      {{ translateStatus(displayStatus(row)) }}
                    </q-badge>
                  </td>
                  <td class="alarm-actions-cell">
                    <q-btn
                      flat
                      round
                      dense
                      icon="visibility"
                      color="blue-grey-2"
                      @click.stop="openAsset(row)"
                    >
                      <q-tooltip>
                    {{ assetRoute(row) ? t('dashboard.openDigitalTwin') : t('dashboard.showOnGisMap') }}
                  </q-tooltip>
                </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="push_pin"
                      color="cyan"
                      :disable="!mapStationId(row)"
                      @click.stop="pinStation(row)"
                    >
                      <q-tooltip>{{ t('dashboard.showStationOnMap') }}</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="check"
                      :color="acknowledgedIds.has(row.id) ? 'blue-grey-4' : 'positive'"
                      @click.stop="acknowledge(row)"
                    >
                      <q-tooltip>{{ t('dashboard.acknowledge') }}</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="build"
                      :color="workOrderIds.has(row.id) ? 'warning' : 'cyan'"
                      @click.stop="createWorkOrder(row)"
                    >
                      <q-tooltip>{{ t('dashboard.createWorkOrder') }}</q-tooltip>
                    </q-btn>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import type { PropType } from 'vue'
import { useAlarmRegister } from '../../../../composables/useAlarmRegister'
import { useI18n } from '../../../../i18n'
import type { AlarmEvent, TopRiskSubstation } from '../../../../types/dashboard'

const { t, translateText, translateStatus } = useI18n()

const props = defineProps({
  events:{
    type:Array as PropType<AlarmEvent[]>,
    default:() => []
  },
  topRiskSubstations:{
    type:Array as PropType<TopRiskSubstation[]>,
    default:() => []
  },
  maxVisible:{
    type:Number,
    default:24
  },
  openRegisterSignal:{
    type:Number,
    default:0
  }
})

const emit = defineEmits<{
  'focus-station': [stationId:string]
}>()

const {
  acknowledge,
  acknowledgedIds,
  activeCount,
  assetRoute,
  createWorkOrder,
  displayStatus,
  mapStationId,
  openAsset,
  openRegister,
  pinStation,
  rows,
  statusColor,
  viewAllOpen,
  visibleRows,
  workOrderIds
} = useAlarmRegister({
  getEvents:() => props.events,
  getTopRiskSubstations:() => props.topRiskSubstations,
  getMaxVisible:() => props.maxVisible,
  onFocusStation:stationId => emit('focus-station', stationId)
})

defineExpose({
  openRegister
})

watch(
  () => props.openRegisterSignal,
  signal => {
    if(signal){
      openRegister()
    }
  },
  { immediate:true }
)

</script>

<style scoped>
.active-alarm-events-card{
  display:flex;
  flex-direction:column;
  height:100%;
  min-height:0;
}

.alarm-events-header{
  flex: 0 0 auto;
  min-height:42px;
  padding-bottom: 0px !important;
}

.alarm-count-badge{
  min-height:20px;
}

.alarm-table-frame{
  flex:1 1 auto;
  min-height:0;
  display:grid;
  grid-template-rows:auto minmax(0,1fr);
}

.alarm-table-scroll{
  min-height:0;
  overflow:auto;
  scrollbar-width:thin;
}

.dialog-alarm-table-frame{
  display:grid;
  grid-template-rows:auto minmax(0,1fr);
}

.active-alarm-events-table{
  table-layout:fixed;
  min-width:760px;
}

.active-alarm-events-table th,
.active-alarm-events-table td{
  padding:5px 7px;
  line-height:1.12;
  overflow:hidden;
  text-overflow:ellipsis;
}

.active-alarm-events-table th{
  background:#07111f;
}

.alarm-events-header-table{
  flex:0 0 auto;
  width:calc(100% - 10px);
  border-bottom:1px solid rgba(255,255,255,.085);
}

.alarm-events-header-table th{
  border-bottom:0;
}

.alarm-events-body-table td{
  height:30px;
}

.alarm-col-time{ width:12%; }
.alarm-col-severity{ width:12%; }
.alarm-col-station{ width:13%; }
.alarm-col-title{ width:23%; }
.alarm-col-value{ width:10%; }
.alarm-col-status{ width:13%; }
.alarm-col-actions{ width:17%; }

.alarm-title-cell{
  max-width:none;
}

.alarm-actions-cell{
  white-space:nowrap;
}

.alarm-actions-cell .q-btn{
  width:25px;
  height:25px;
  min-height:25px;
}

.empty-alarm-row{
  color:#8fa9b8;
  text-align:center;
}

.alarm-action-status{
  flex:0 0 auto;
  padding:4px 10px 7px;
  color:#8fa9b8;
  font-size:10px;
  border-top:1px solid rgba(255,255,255,.06);
}

.alarm-events-dialog{
  width:min(1040px, calc(100vw - 32px));
  max-width:1040px;
}

.dialog-alarm-table-scroll{
  max-height:70vh;
  overflow:auto;
  padding-bottom:8px;
  scrollbar-width:thin;
}
</style>

<style>
.alarm-events-card .q-card__section{
  padding:10px 12px;
}

.alarm-events-table{
  width:100%;
  border-collapse:collapse;
  color:#dbe9f0;
  font-size:12px;
}

.alarm-events-table th,
.alarm-events-table td{
  padding:8px 8px;
  border-bottom:1px solid rgba(255,255,255,.07);
  text-align:left;
  white-space:nowrap;
}

.alarm-events-table th{
  color:#8fa9b8;
  font-size:10px;
  font-weight:800;
  text-transform:uppercase;
}

.severity-badge{
  min-width:66px;
  justify-content:center;
  border:1px solid rgba(255,255,255,.09);
}

.severity-badge.critical{
  color:#ff7c7c;
  background:rgba(244,67,54,.18);
}

.severity-badge.warning{
  color:#ffc266;
  background:rgba(255,152,0,.18);
}

.severity-badge.info{
  color:#4bd8ff;
  background:rgba(64,196,255,.16);
}

@media (max-width: 820px){
.alarm-events-table{
    min-width:720px;
  }
}

@media (max-width: 820px){
.alarm-events-card .q-card__section:last-child{
    overflow:auto;
  }
}

.compact-action-btn{
  min-height:20px;
  padding:2px 8px;
  font-size:10px;
}

.alarm-events-table th,
.alarm-events-table td{
  padding:5px 7px;
}
</style>
