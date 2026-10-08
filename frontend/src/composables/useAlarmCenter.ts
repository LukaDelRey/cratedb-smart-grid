import { computed, onMounted, onUnmounted, ref } from 'vue';

import {
  acknowledgePersistentAlarm,
  createPersistentAlarmWorkOrder,
  fetchAlarmAudit,
  fetchAlarmStats,
  fetchPersistentAlarms,
  resolvePersistentAlarm,
} from '../services/gridApi';
import type {
  AlarmAuditEntry,
  AlarmLifecycleStatus,
  AlarmStats,
  PersistentAlarm,
} from '../types/dashboard';

const EMPTY_STATS: AlarmStats = {
  active: 0,
  acknowledged: 0,
  workOrders: 0,
  resolved: 0,
  critical: 0,
  warning: 0,
};

export function useAlarmCenter(autoRefresh = true) {
  const alarms = ref<PersistentAlarm[]>([]);

  const stats = ref<AlarmStats>({ ...EMPTY_STATS });

  const audit = ref<AlarmAuditEntry[]>([]);

  const selectedAlarm = ref<PersistentAlarm | null>(null);

  const statusFilter = ref('OPEN');

  const severityFilter = ref('ALL');

  const search = ref('');

  const loading = ref(false);

  const actionAlarmId = ref<string | null>(null);

  const error = ref<string | null>(null);

  let refreshTimer: ReturnType<typeof setInterval> | null = null;

  const queryStatus = computed(() => {
    if (statusFilter.value === 'OPEN') return 'ACTIVE,ACK,WORK_ORDER';

    if (statusFilter.value === 'ALL') return undefined;

    return statusFilter.value;
  });

  const filteredAlarms = computed(() => {
    const term = search.value.trim().toLowerCase();

    return alarms.value.filter((alarm) => {
      if (severityFilter.value !== 'ALL' && alarm.severity !== severityFilter.value) {
        return false;
      }

      if (!term) {
        return true;
      }

      return [alarm.station_id, alarm.title, alarm.alarm_type, alarm.work_order_id].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(term),
      );
    });
  });

  async function refresh() {
    loading.value = true;

    try {
      const [alarmRows, totals] = await Promise.all([
        fetchPersistentAlarms({ status: queryStatus.value, limit: 500 }),
        fetchAlarmStats(),
      ]);

      alarms.value = alarmRows;
      stats.value = totals;
      error.value = null;

      if (selectedAlarm.value) {
        selectedAlarm.value =
          alarmRows.find((item) => item.id === selectedAlarm.value?.id) || selectedAlarm.value;
      }
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : 'Alarm register unavailable';
    } finally {
      loading.value = false;
    }
  }

  async function selectAlarm(alarm: PersistentAlarm) {
    selectedAlarm.value = alarm;

    try {
      audit.value = await fetchAlarmAudit(alarm.id);
    } catch {
      audit.value = [];
    }
  }

  async function runAction(
    alarm: PersistentAlarm,
    action: (alarmId: string) => Promise<PersistentAlarm>,
  ) {
    actionAlarmId.value = alarm.id;

    try {
      const updated = await action(alarm.id);

      const index = alarms.value.findIndex((item) => item.id === updated.id);

      if (index >= 0) {
        alarms.value[index] = updated;
      }

      await refresh();
      await selectAlarm(updated);
    } finally {
      actionAlarmId.value = null;
    }
  }

  function acknowledge(alarm: PersistentAlarm) {
    return runAction(alarm, (alarmId) => acknowledgePersistentAlarm(alarmId));
  }

  function createWorkOrder(alarm: PersistentAlarm) {
    return runAction(alarm, (alarmId) => createPersistentAlarmWorkOrder(alarmId));
  }

  function resolve(alarm: PersistentAlarm) {
    return runAction(alarm, (alarmId) => resolvePersistentAlarm(alarmId));
  }

  function statusColor(status: AlarmLifecycleStatus) {
    if (status === 'ACTIVE') return 'negative';

    if (status === 'ACK') return 'positive';

    if (status === 'WORK_ORDER') return 'warning';

    return 'blue-grey';
  }

  onMounted(() => {
    void refresh();

    if (autoRefresh) {
      refreshTimer = setInterval(refresh, 15000);
    }
  });

  onUnmounted(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
  });

  return {
    acknowledge,
    actionAlarmId,
    alarms,
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
  };
}
