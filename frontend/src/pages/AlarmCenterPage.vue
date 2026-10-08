<template>
  <q-layout view="lHh Lpr lFf">
    <Sidebar />

    <q-page-container>
      <q-page
        class="page-shell operations-page q-pa-md"
        style="grid-template-rows: auto auto auto minmax(0, 1fr)"
      >
        <Topbar
          @open-notifications="refresh"
          @open-topology="topologyOpen = true"
        />

        <header
          class="operations-header row no-wrap items-center justify-between q-gutter-x-md q-ml-none"
        >
          <div>
            <div class="section-kicker text-weight-bold text-uppercase">
              {{ t('dashboard.commandCenter') }}
            </div>

            <h1
              class="q-mt-xs q-mb-none q-mx-none text-h5"
              style="line-height: 1.1"
            >
              {{ t('dashboard.alarmCenter') }}
            </h1>
          </div>

          <q-btn
            color="cyan"
            dense
            icon="refresh"
            outline
            :label="t('dashboard.refresh')"
            :loading="loading"
            @click="refresh"
          />
        </header>

        <section
          class="alarm-stat-grid scada-gap-10"
          style="display: grid"
        >
          <q-card
            v-for="stat in statCards"
            bordered
            class="scada-card alarm-stat-card"
            flat
            :key="stat.label"
          >
            <q-card-section
              class="items-center"
              style="grid-template-columns: auto 1fr"
            >
              <q-icon
                size="22px"
                :color="stat.color"
                :name="stat.icon"
              />

              <span
                class="text-uppercase"
                style="font-size: 11px"
              >
                {{ stat.label }}
              </span>

              <strong
                class="text-h5 text-weight-bold"
                style="grid-column: 2; line-height: 1"
                :class="`text-${stat.color}`"
              >
                {{ stat.value }}
              </strong>
            </q-card-section>
          </q-card>
        </section>

        <q-card
          bordered
          class="scada-card alarm-register-card"
          flat
          style="min-height: 0; grid-template-rows: auto auto minmax(0, 1fr)"
        >
          <q-card-section class="alarm-filter-row row no-wrap">
            <q-input
              v-model="search"
              class="alarm-search"
              clearable
              color="cyan"
              dark
              debounce="150"
              dense
              outlined
              :placeholder="t('dashboard.searchAlarms')"
            >
              <template #prepend><q-icon name="search" /></template>
            </q-input>

            <q-btn-toggle
              v-model="statusFilter"
              class="alarm-filter-toggle"
              dense
              no-caps
              text-color="blue-grey-2"
              toggle-color="cyan"
              unelevated
              :options="statusOptions"
            />

            <q-select
              v-model="severityFilter"
              class="severity-select"
              color="cyan"
              dark
              dense
              emit-value
              map-options
              outlined
              :options="severityOptions"
            />
          </q-card-section>

          <q-banner
            v-if="error"
            class="bg-red-10 text-red-2"
            dense
          >
            {{ t('dashboard.alarmRegisterUnavailable') }}
          </q-banner>

          <div
            class="alarm-center-layout scada-min-height-0"
            style="display: grid"
          >
            <div class="alarm-center-table-wrap scada-min-width-0 overflow-auto">
              <table
                class="alarm-center-table text-caption full-width"
                style="min-width: 760px"
              >
                <thead>
                  <tr>
                    <th
                      class="q-pa-sm text-left text-no-wrap text-uppercase"
                      style="font-size: 10px"
                    >
                      {{ t('dashboard.time') }}
                    </th>

                    <th
                      class="q-pa-sm text-left text-no-wrap text-uppercase"
                      style="font-size: 10px"
                    >
                      {{ t('dashboard.severity') }}
                    </th>

                    <th
                      class="q-pa-sm text-left text-no-wrap text-uppercase"
                      style="font-size: 10px"
                    >
                      {{ t('dashboard.station') }}
                    </th>

                    <th
                      class="q-pa-sm text-left text-no-wrap text-uppercase"
                      style="font-size: 10px"
                    >
                      {{ t('dashboard.alarm') }}
                    </th>

                    <th
                      class="q-pa-sm text-left text-no-wrap text-uppercase"
                      style="font-size: 10px"
                    >
                      {{ t('dashboard.value') }}
                    </th>

                    <th
                      class="q-pa-sm text-left text-no-wrap text-uppercase"
                      style="font-size: 10px"
                    >
                      {{ t('dashboard.status') }}
                    </th>

                    <th
                      class="q-pa-sm text-left text-no-wrap text-uppercase"
                      style="font-size: 10px"
                    >
                      {{ t('dashboard.actions') }}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="alarm in filteredAlarms"
                    class="cursor-pointer"
                    :class="{ selected: selectedAlarm?.id === alarm.id }"
                    :key="alarm.id"
                    @click="selectAlarm(alarm)"
                  >
                    <td class="q-pa-sm text-left text-no-wrap">
                      {{ formatTimestamp(alarm.last_seen) }}
                    </td>

                    <td class="q-pa-sm text-left text-no-wrap">
                      <q-badge :class="['severity-badge', String(alarm.severity).toLowerCase()]">
                        {{ translateStatus(alarm.severity) }}
                      </q-badge>
                    </td>

                    <td
                      class="asset-cell text-weight-bold q-pa-sm text-left text-no-wrap"
                      style="color: #40c4ff"
                    >
                      {{ alarm.station_id }}
                    </td>

                    <td class="q-pa-sm text-left text-no-wrap">{{ translateText(alarm.title) }}</td>

                    <td class="q-pa-sm text-left text-no-wrap">{{ formatValue(alarm) }}</td>

                    <td class="q-pa-sm text-left text-no-wrap">
                      <q-badge :color="statusColor(alarm.status)">
                        {{ translateStatus(alarm.status) }}
                      </q-badge>
                    </td>

                    <td
                      class="alarm-row-actions q-pa-sm text-left text-no-wrap"
                      style="width: 132px"
                    >
                      <q-btn
                        color="blue-grey-2"
                        dense
                        flat
                        icon="visibility"
                        round
                        @click.stop="openAsset(alarm.station_id)"
                      >
                        <q-tooltip>{{ t('dashboard.openDigitalTwin') }}</q-tooltip>
                      </q-btn>

                      <q-btn
                        color="positive"
                        dense
                        flat
                        icon="check"
                        round
                        :disable="alarm.status !== 'ACTIVE'"
                        :loading="actionAlarmId === alarm.id"
                        @click.stop="acknowledge(alarm)"
                      >
                        <q-tooltip>{{ t('dashboard.acknowledge') }}</q-tooltip>
                      </q-btn>

                      <q-btn
                        color="warning"
                        dense
                        flat
                        icon="build"
                        round
                        :disable="alarm.status === 'RESOLVED' || alarm.status === 'WORK_ORDER'"
                        :loading="actionAlarmId === alarm.id"
                        @click.stop="createWorkOrder(alarm)"
                      >
                        <q-tooltip>{{ t('dashboard.createWorkOrder') }}</q-tooltip>
                      </q-btn>

                      <q-btn
                        color="cyan"
                        dense
                        flat
                        icon="done_all"
                        round
                        :disable="alarm.status === 'RESOLVED'"
                        :loading="actionAlarmId === alarm.id"
                        @click.stop="resolve(alarm)"
                      >
                        <q-tooltip>{{ t('dashboard.resolve') }}</q-tooltip>
                      </q-btn>
                    </td>
                  </tr>

                  <tr
                    v-if="!filteredAlarms.length && !loading"
                    class="cursor-pointer"
                  >
                    <td
                      class="empty-alarm-row q-pa-sm text-left text-no-wrap"
                      colspan="7"
                    >
                      {{ t('dashboard.noActiveAlarmsOrEvents') }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <aside
              class="alarm-detail-panel scada-min-width-0 q-pa-md overflow-auto"
              style="background: rgba(4, 10, 18, 0.52)"
            >
              <template v-if="selectedAlarm">
                <div class="section-kicker text-weight-bold text-uppercase">
                  {{ t('dashboard.incident') }}
                </div>

                <h2 class="q-my-xs q-mx-none text-h6">{{ translateText(selectedAlarm.title) }}</h2>

                <div
                  class="alarm-detail-id scada-text-muted"
                  style="font-size: 11px"
                >
                  {{ selectedAlarm.station_id }} · {{ selectedAlarm.alarm_type }}
                </div>

                <div
                  class="alarm-detail-grid scada-gap-8 q-mt-md"
                  style="grid-template-columns: 1fr 1fr"
                >
                  <div
                    class="q-pa-sm"
                    style="min-width: 0"
                  >
                    <span
                      class="block text-uppercase"
                      style="font-size: 10px"
                    >
                      {{ t('dashboard.status') }}
                    </span>

                    <strong class="block q-mt-xs text-caption">
                      {{ translateStatus(selectedAlarm.status) }}
                    </strong>
                  </div>

                  <div
                    class="q-pa-sm"
                    style="min-width: 0"
                  >
                    <span
                      class="block text-uppercase"
                      style="font-size: 10px"
                    >
                      {{ t('dashboard.created') }}
                    </span>

                    <strong class="block q-mt-xs text-caption">
                      {{ formatTimestamp(selectedAlarm.first_seen) }}
                    </strong>
                  </div>

                  <div
                    class="q-pa-sm"
                    style="min-width: 0"
                  >
                    <span
                      class="block text-uppercase"
                      style="font-size: 10px"
                    >
                      {{ t('dashboard.events') }}
                    </span>

                    <strong class="block q-mt-xs text-caption">
                      {{ selectedAlarm.occurrence_count }}
                    </strong>
                  </div>

                  <div
                    class="q-pa-sm"
                    style="min-width: 0"
                  >
                    <span
                      class="block text-uppercase"
                      style="font-size: 10px"
                    >
                      {{ t('dashboard.workOrder') }}
                    </span>

                    <strong class="block q-mt-xs text-caption">
                      {{ selectedAlarm.work_order_id || '-' }}
                    </strong>
                  </div>
                </div>

                <div class="section-kicker audit-title q-mt-md text-weight-bold text-uppercase">
                  {{ t('dashboard.lifecycle') }}
                </div>

                <div
                  class="alarm-audit-list scada-gap-10 q-mt-sm"
                  style="display: grid"
                >
                  <div
                    v-for="entry in audit"
                    class="alarm-audit-entry items-start q-gutter-x-sm q-ml-none row no-wrap"
                    :key="entry.id"
                  >
                    <q-icon
                      color="cyan"
                      name="radio_button_checked"
                      size="12px"
                    />

                    <div>
                      <strong
                        class="block"
                        style="font-size: 11px"
                      >
                        {{ translateStatus(entry.action) }}
                      </strong>

                      <span
                        class="block q-mt-xs"
                        style="font-size: 11px"
                      >
                        {{ entry.actor }} · {{ formatTimestamp(entry.timestamp) }}
                      </span>
                    </div>
                  </div>

                  <div
                    v-if="!audit.length"
                    class="text-blue-grey-4"
                  >
                    {{ t('dashboard.noEvents') }}
                  </div>
                </div>
              </template>

              <div
                v-else
                class="alarm-detail-empty full-height scada-gap-8 scada-text-muted text-caption column no-wrap items-center justify-center"
              >
                <q-icon
                  color="blue-grey-6"
                  name="manage_search"
                  size="42px"
                />

                <span>{{ t('dashboard.selectAsset') }}</span>
              </div>
            </aside>
          </div>
        </q-card>

        <SystemTopologyDialog
          v-model="topologyOpen"
          :connection="store.connection"
          :last-error="store.error"
          :topology="store.topology"
        />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
// Keep component selector isolation for the shared stylesheet.
defineOptions({ __scopeId: 'data-v-ui-3b846659' });

import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import Sidebar from '../components/layout/Sidebar.vue';
import Topbar from '../components/layout/Topbar.vue';
import SystemTopologyDialog from '../components/system/SystemTopologyDialog.vue';
import { useAlarmCenter } from '../composables/useAlarmCenter';
import { useI18n } from '../i18n';
import { useSensorStore } from '../stores/sensorStore';
import type { PersistentAlarm } from '../types/dashboard';

const store = useSensorStore();

const router = useRouter();

const { t, translateStatus, translateText } = useI18n();

const topologyOpen = ref(false);

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
  statusFilter,
} = useAlarmCenter();

const statCards = computed(() => [
  {
    label: t('dashboard.activeAlarms'),
    value: stats.value.active,
    icon: 'warning',
    color: 'negative',
  },
  {
    label: t('dashboard.critical'),
    value: stats.value.critical,
    icon: 'crisis_alert',
    color: 'negative',
  },
  {
    label: t('dashboard.warning'),
    value: stats.value.warning,
    icon: 'report_problem',
    color: 'warning',
  },
  {
    label: t('dashboard.ack'),
    value: stats.value.acknowledged,
    icon: 'check_circle',
    color: 'positive',
  },
  {
    label: t('dashboard.openWorkOrders'),
    value: stats.value.workOrders,
    icon: 'build',
    color: 'cyan',
  },
  {
    label: t('dashboard.resolved'),
    value: stats.value.resolved,
    icon: 'done_all',
    color: 'blue-grey-3',
  },
]);

const statusOptions = computed(() => [
  { label: t('dashboard.statusOpen'), value: 'OPEN' },
  { label: t('dashboard.active'), value: 'ACTIVE' },
  { label: t('dashboard.ack'), value: 'ACK' },
  { label: t('dashboard.workOrder'), value: 'WORK_ORDER' },
  { label: t('dashboard.resolved'), value: 'RESOLVED' },
  { label: t('dashboard.all'), value: 'ALL' },
]);

const severityOptions = computed(() => [
  { label: t('dashboard.all'), value: 'ALL' },
  { label: t('dashboard.critical'), value: 'CRITICAL' },
  { label: t('dashboard.warning'), value: 'WARNING' },
]);

function formatTimestamp(value: string | number) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleString([], {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
}

function formatValue(alarm: PersistentAlarm) {
  if (alarm.value === null || alarm.value === undefined) return '-';

  return `${alarm.value}${alarm.unit ? ` ${alarm.unit}` : ''}`;
}

function openAsset(stationId: string) {
  void router.push(`/substations/${stationId}`);
}

watch(statusFilter, () => void refresh());

onMounted(() => {
  if (!store.stations.length) {
    void store.start();
  }
});
</script>
