<template>
  <q-layout view="lHh Lpr lFf">
    <Sidebar />

    <q-page-container>
      <q-page class="page-shell operations-page">
        <Topbar
          @open-topology="topologyOpen = true"
          @open-notifications="refresh"
        />

        <header class="operations-header">
          <div>
            <div class="section-kicker">{{ t('dashboard.commandCenter') }}</div>
            <h1>{{ t('dashboard.alarmCenter') }}</h1>
          </div>

          <q-btn
            dense
            outline
            color="cyan"
            icon="refresh"
            :label="t('dashboard.refresh')"
            :loading="loading"
            @click="refresh"
          />
        </header>

        <section class="alarm-stat-grid">
          <q-card
            v-for="stat in statCards"
            :key="stat.label"
            flat
            bordered
            class="scada-card alarm-stat-card"
          >
            <q-card-section>
              <q-icon :name="stat.icon" :color="stat.color" size="22px" />
              <span>{{ stat.label }}</span>
              <strong :class="`text-${stat.color}`">{{ stat.value }}</strong>
            </q-card-section>
          </q-card>
        </section>

        <q-card flat bordered class="scada-card alarm-register-card">
          <q-card-section class="alarm-filter-row">
            <q-input
              v-model="search"
              dense
              outlined
              dark
              clearable
              debounce="150"
              color="cyan"
              :placeholder="t('dashboard.searchAlarms')"
              class="alarm-search"
            >
              <template #prepend><q-icon name="search" /></template>
            </q-input>

            <q-btn-toggle
              v-model="statusFilter"
              dense
              unelevated
              no-caps
              toggle-color="cyan"
              text-color="blue-grey-2"
              class="alarm-filter-toggle"
              :options="statusOptions"
            />

            <q-select
              v-model="severityFilter"
              dense
              outlined
              dark
              emit-value
              map-options
              color="cyan"
              :options="severityOptions"
              class="severity-select"
            />
          </q-card-section>

          <q-banner v-if="error" dense class="bg-red-10 text-red-2">
            {{ t('dashboard.alarmRegisterUnavailable') }}
          </q-banner>

          <div class="alarm-center-layout">
            <div class="alarm-center-table-wrap">
              <table class="alarm-center-table">
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
                <tbody>
                  <tr
                    v-for="alarm in filteredAlarms"
                    :key="alarm.id"
                    :class="{ selected:selectedAlarm?.id === alarm.id }"
                    @click="selectAlarm(alarm)"
                  >
                    <td>{{ formatTimestamp(alarm.last_seen) }}</td>
                    <td>
                      <q-badge :class="['severity-badge', String(alarm.severity).toLowerCase()]">
                        {{ translateStatus(alarm.severity) }}
                      </q-badge>
                    </td>
                    <td class="asset-cell">{{ alarm.station_id }}</td>
                    <td>{{ translateText(alarm.title) }}</td>
                    <td>{{ formatValue(alarm) }}</td>
                    <td><q-badge :color="statusColor(alarm.status)">{{ translateStatus(alarm.status) }}</q-badge></td>
                    <td class="alarm-row-actions">
                      <q-btn flat round dense icon="visibility" color="blue-grey-2" @click.stop="openAsset(alarm.station_id)">
                        <q-tooltip>{{ t('dashboard.openDigitalTwin') }}</q-tooltip>
                      </q-btn>
                      <q-btn
                        flat
                        round
                        dense
                        icon="check"
                        color="positive"
                        :disable="alarm.status !== 'ACTIVE'"
                        :loading="actionAlarmId === alarm.id"
                        @click.stop="acknowledge(alarm)"
                      >
                        <q-tooltip>{{ t('dashboard.acknowledge') }}</q-tooltip>
                      </q-btn>
                      <q-btn
                        flat
                        round
                        dense
                        icon="build"
                        color="warning"
                        :disable="alarm.status === 'RESOLVED' || alarm.status === 'WORK_ORDER'"
                        :loading="actionAlarmId === alarm.id"
                        @click.stop="createWorkOrder(alarm)"
                      >
                        <q-tooltip>{{ t('dashboard.createWorkOrder') }}</q-tooltip>
                      </q-btn>
                      <q-btn
                        flat
                        round
                        dense
                        icon="done_all"
                        color="cyan"
                        :disable="alarm.status === 'RESOLVED'"
                        :loading="actionAlarmId === alarm.id"
                        @click.stop="resolve(alarm)"
                      >
                        <q-tooltip>{{ t('dashboard.resolve') }}</q-tooltip>
                      </q-btn>
                    </td>
                  </tr>
                  <tr v-if="!filteredAlarms.length && !loading">
                    <td colspan="7" class="empty-alarm-row">{{ t('dashboard.noActiveAlarmsOrEvents') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <aside class="alarm-detail-panel">
              <template v-if="selectedAlarm">
                <div class="section-kicker">{{ t('dashboard.incident') }}</div>
                <h2>{{ translateText(selectedAlarm.title) }}</h2>
                <div class="alarm-detail-id">{{ selectedAlarm.station_id }} · {{ selectedAlarm.alarm_type }}</div>

                <div class="alarm-detail-grid">
                  <div><span>{{ t('dashboard.status') }}</span><strong>{{ translateStatus(selectedAlarm.status) }}</strong></div>
                  <div><span>{{ t('dashboard.created') }}</span><strong>{{ formatTimestamp(selectedAlarm.first_seen) }}</strong></div>
                  <div><span>{{ t('dashboard.events') }}</span><strong>{{ selectedAlarm.occurrence_count }}</strong></div>
                  <div><span>{{ t('dashboard.workOrder') }}</span><strong>{{ selectedAlarm.work_order_id || '-' }}</strong></div>
                </div>

                <div class="section-kicker audit-title">{{ t('dashboard.lifecycle') }}</div>
                <div class="alarm-audit-list">
                  <div v-for="entry in audit" :key="entry.id" class="alarm-audit-entry">
                    <q-icon name="radio_button_checked" color="cyan" size="12px" />
                    <div>
                      <strong>{{ translateStatus(entry.action) }}</strong>
                      <span>{{ entry.actor }} · {{ formatTimestamp(entry.timestamp) }}</span>
                    </div>
                  </div>
                  <div v-if="!audit.length" class="text-blue-grey-4">{{ t('dashboard.noEvents') }}</div>
                </div>
              </template>

              <div v-else class="alarm-detail-empty">
                <q-icon name="manage_search" size="42px" color="blue-grey-6" />
                <span>{{ t('dashboard.selectAsset') }}</span>
              </div>
            </aside>
          </div>
        </q-card>

        <SystemTopologyDialog
          v-model="topologyOpen"
          :topology="store.topology"
          :connection="store.connection"
          :last-error="store.error"
        />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import Sidebar from '../components/dashboard/layout/Sidebar.vue'
import Topbar from '../components/dashboard/layout/Topbar.vue'
import SystemTopologyDialog from '../components/dashboard/system/SystemTopologyDialog.vue'
import { useAlarmCenter } from '../composables/useAlarmCenter'
import { useI18n } from '../i18n'
import { useSensorStore } from '../stores/sensorStore'
import type { PersistentAlarm } from '../types/dashboard'

const store = useSensorStore()
const router = useRouter()
const { t, translateStatus, translateText } = useI18n()
const topologyOpen = ref(false)
const {
  acknowledge,
  actionAlarmId,
  audit,
  createWorkOrder,
  error,
  filteredAlarms,
  loading,
  refresh,
  resolve,
  search,
  selectedAlarm,
  selectAlarm,
  severityFilter,
  stats,
  statusColor,
  statusFilter
} = useAlarmCenter()

const statCards = computed(() => [
  { label:t('dashboard.activeAlarms'), value:stats.value.active, icon:'warning', color:'negative' },
  { label:t('dashboard.critical'), value:stats.value.critical, icon:'crisis_alert', color:'negative' },
  { label:t('dashboard.warning'), value:stats.value.warning, icon:'report_problem', color:'warning' },
  { label:t('dashboard.ack'), value:stats.value.acknowledged, icon:'check_circle', color:'positive' },
  { label:t('dashboard.openWorkOrders'), value:stats.value.workOrders, icon:'build', color:'cyan' },
  { label:t('dashboard.resolved'), value:stats.value.resolved, icon:'done_all', color:'blue-grey-3' }
])

const statusOptions = computed(() => [
  { label:t('dashboard.statusOpen'), value:'OPEN' },
  { label:t('dashboard.active'), value:'ACTIVE' },
  { label:t('dashboard.ack'), value:'ACK' },
  { label:t('dashboard.workOrder'), value:'WORK_ORDER' },
  { label:t('dashboard.resolved'), value:'RESOLVED' },
  { label:t('dashboard.all'), value:'ALL' }
])

const severityOptions = computed(() => [
  { label:t('dashboard.all'), value:'ALL' },
  { label:t('dashboard.critical'), value:'CRITICAL' },
  { label:t('dashboard.warning'), value:'WARNING' }
])

function formatTimestamp(value:string | number){
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleString([], { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' })
}

function formatValue(alarm:PersistentAlarm){
  if(alarm.value === null || alarm.value === undefined) return '-'
  return `${alarm.value}${alarm.unit ? ` ${alarm.unit}` : ''}`
}

function openAsset(stationId:string){
  void router.push(`/substations/${stationId}`)
}

watch(statusFilter, () => void refresh())

onMounted(() => {
  if(!store.stations.length){
    void store.start()
  }
})
</script>

<style scoped>
.operations-page{
  display:grid;
  grid-template-rows:auto auto auto minmax(0,1fr);
  gap:12px;
  overflow:hidden;
}

.operations-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
}

.operations-header h1{
  margin:2px 0 0;
  font-size:25px;
  line-height:1.1;
}

.alarm-stat-grid{
  display:grid;
  grid-template-columns:repeat(6,minmax(0,1fr));
  gap:10px;
}

.alarm-stat-card .q-card__section{
  display:grid;
  grid-template-columns:auto 1fr;
  align-items:center;
  gap:4px 9px;
}

.alarm-stat-card span{
  color:#8fa9b8;
  font-size:11px;
  text-transform:uppercase;
}

.alarm-stat-card strong{
  grid-column:2;
  font-size:23px;
  line-height:1;
}

.alarm-register-card{
  min-height:0;
  display:grid;
  grid-template-rows:auto auto minmax(0,1fr);
}

.alarm-filter-row{
  display:flex;
  align-items:center;
  gap:10px;
  border-bottom:1px solid rgba(255,255,255,.07);
}

.alarm-search{ width:min(360px,100%); }
.severity-select{ width:150px; }
.alarm-filter-toggle{ margin-left:auto; border:1px solid rgba(64,196,255,.18); }

.alarm-center-layout{
  min-height:0;
  display:grid;
  grid-template-columns:minmax(0,1fr) 270px;
}

.alarm-center-table-wrap{
  min-width:0;
  overflow:auto;
}

.alarm-center-table{
  width:100%;
  min-width:760px;
  border-collapse:collapse;
  color:#dbe9f0;
  font-size:12px;
}

.alarm-center-table th,
.alarm-center-table td{
  padding:9px 10px;
  border-bottom:1px solid rgba(255,255,255,.065);
  text-align:left;
  white-space:nowrap;
}

.alarm-center-table th{
  position:sticky;
  top:0;
  z-index:1;
  color:#8fa9b8;
  background:#07111f;
  font-size:10px;
  text-transform:uppercase;
}

.alarm-center-table tbody tr{ cursor:pointer; }
.alarm-center-table tbody tr:hover,
.alarm-center-table tbody tr.selected{ background:rgba(64,196,255,.08); }
.asset-cell{ color:#40c4ff; font-weight:700; }
.alarm-row-actions{ width:132px; }

.alarm-detail-panel{
  min-width:0;
  padding:16px;
  border-left:1px solid rgba(64,196,255,.14);
  background:rgba(4,10,18,.52);
  overflow:auto;
}

.alarm-detail-panel h2{
  margin:4px 0;
  font-size:18px;
}

.alarm-detail-id{ color:#8fa9b8; font-size:11px; }

.alarm-detail-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:8px;
  margin-top:16px;
}

.alarm-detail-grid div{
  min-width:0;
  padding:9px;
  border:1px solid rgba(255,255,255,.07);
  border-radius:6px;
  background:rgba(255,255,255,.025);
}

.alarm-detail-grid span,
.alarm-detail-grid strong{ display:block; }
.alarm-detail-grid span{ color:#8fa9b8; font-size:10px; text-transform:uppercase; }
.alarm-detail-grid strong{ margin-top:4px; overflow-wrap:anywhere; font-size:12px; }
.audit-title{ margin-top:18px; }
.alarm-audit-list{ display:grid; gap:10px; margin-top:10px; }
.alarm-audit-entry{ display:flex; gap:8px; align-items:flex-start; }
.alarm-audit-entry strong,
.alarm-audit-entry span{ display:block; font-size:11px; }
.alarm-audit-entry span{ margin-top:2px; color:#8fa9b8; }

.alarm-detail-empty{
  height:100%;
  display:grid;
  place-content:center;
  justify-items:center;
  gap:8px;
  color:#8fa9b8;
  font-size:12px;
}

@media (max-width:1050px){
  .alarm-stat-grid{ grid-template-columns:repeat(3,minmax(0,1fr)); }
  .alarm-center-layout{ grid-template-columns:1fr; }
  .alarm-detail-panel{ min-height:260px; border-left:0; border-top:1px solid rgba(64,196,255,.14); }
  .operations-page{ overflow:auto; }
}

@media (max-width:820px){
  .alarm-stat-grid{ grid-template-columns:repeat(2,minmax(0,1fr)); }
  .alarm-filter-row{ align-items:stretch; flex-direction:column; }
  .alarm-filter-toggle{ width:100%; margin-left:0; overflow:auto; }
  .alarm-search,.severity-select{ width:100%; }
}
</style>
