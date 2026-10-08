<template>
  <q-card
    bordered
    class="scada-card alarm-events-card active-alarm-events-card full-height no-wrap column"
    flat
    style="min-height: 0"
  >
    <q-card-section
      class="alarm-events-header row items-center justify-between q-pb-xs col-auto"
      style="min-height: 42px"
    >
      <div>
        <div class="section-kicker-light text-caption text-weight-bold text-uppercase">
          {{ t('dashboard.activeAlarmsEvents') }}
        </div>
      </div>

      <div class="row items-center q-gutter-xs">
        <q-badge
          class="alarm-count-badge"
          color="negative"
          style="min-height: 20px"
        >
          {{ activeCount }} {{ t('dashboard.activeLower') }}
        </q-badge>

        <q-btn
          dense
          flat
          icon="sort"
          round
          size="11px"
          style="width: 28px; height: 28px"
          :aria-label="
            severitySortEnabled ? t('dashboard.sortByTime') : t('dashboard.sortBySeverity')
          "
          :class="['alarm-sort-btn', { active: severitySortEnabled }]"
          :color="severitySortEnabled ? 'cyan' : 'blue-grey-3'"
          @click="toggleSeveritySort"
        >
          <q-tooltip>
            {{ severitySortEnabled ? t('dashboard.sortByTime') : t('dashboard.sortBySeverity') }}
          </q-tooltip>
        </q-btn>

        <q-btn
          dense
          flat
          icon="filter_alt"
          round
          size="11px"
          :aria-label="
            mapFilterEnabled ? t('dashboard.restoreMapPins') : t('dashboard.mapTableStations')
          "
          :aria-pressed="mapFilterEnabled"
          :class="['alarm-map-filter-btn', { active: mapFilterEnabled }]"
          :color="mapFilterEnabled ? 'cyan' : 'blue-grey-3'"
          @click="emit('update:mapFilterEnabled', !mapFilterEnabled)"
        >
          <q-tooltip>
            {{ mapFilterEnabled ? t('dashboard.restoreMapPins') : t('dashboard.mapTableStations') }}
          </q-tooltip>
        </q-btn>

        <q-btn
          class="compact-action-btn q-ml-sm q-py-xs q-px-sm"
          color="cyan"
          dense
          icon="open_in_full"
          outline
          padding="6px"
          size="9px"
          style="min-height: 20px; font-size: 10px"
          :label="t('dashboard.viewAll')"
          @click="viewAllOpen = true"
        />
      </div>
    </q-card-section>

    <q-card-section
      class="q-pa-none alarm-table-frame"
      style="min-height: 0; grid-template-rows: auto minmax(0, 1fr)"
    >
      <table
        class="alarm-events-table active-alarm-events-table alarm-events-header-table text-caption col-auto"
      >
        <colgroup>
          <col
            class="alarm-col-time"
            style="width: 12%"
          />

          <col
            class="alarm-col-severity"
            style="width: 12%"
          />

          <col
            class="alarm-col-station"
            style="width: 13%"
          />

          <col
            class="alarm-col-title"
            style="width: 23%"
          />

          <col
            class="alarm-col-value"
            style="width: 10%"
          />

          <col
            class="alarm-col-status"
            style="width: 13%"
          />

          <col
            class="alarm-col-actions"
            style="width: 17%"
          />
        </colgroup>

        <thead>
          <tr>
            <th
              class="q-py-xs q-px-sm overflow-hidden text-left text-no-wrap text-weight-bold text-uppercase"
              style="line-height: 1.12; font-size: 10px"
            >
              {{ t('dashboard.time') }}
            </th>

            <th
              class="q-py-xs q-px-sm overflow-hidden text-left text-no-wrap text-weight-bold text-uppercase"
              style="line-height: 1.12; font-size: 10px"
            >
              {{ t('dashboard.severity') }}
            </th>

            <th
              class="q-py-xs q-px-sm overflow-hidden text-left text-no-wrap text-weight-bold text-uppercase"
              style="line-height: 1.12; font-size: 10px"
            >
              {{ t('dashboard.station') }}
            </th>

            <th
              class="q-py-xs q-px-sm overflow-hidden text-left text-no-wrap text-weight-bold text-uppercase"
              style="line-height: 1.12; font-size: 10px"
            >
              {{ t('dashboard.alarm') }}
            </th>

            <th
              class="q-py-xs q-px-sm overflow-hidden text-left text-no-wrap text-weight-bold text-uppercase"
              style="line-height: 1.12; font-size: 10px"
            >
              {{ t('dashboard.value') }}
            </th>

            <th
              class="q-py-xs q-px-sm overflow-hidden text-left text-no-wrap text-weight-bold text-uppercase"
              style="line-height: 1.12; font-size: 10px"
            >
              {{ t('dashboard.status') }}
            </th>

            <th
              class="q-py-xs q-px-sm overflow-hidden text-left text-no-wrap text-weight-bold text-uppercase"
              style="line-height: 1.12; font-size: 10px"
            >
              {{ t('dashboard.actions') }}
            </th>
          </tr>
        </thead>
      </table>

      <div
        class="alarm-table-scroll scada-min-height-0 overflow-auto"
        ref="tableViewport"
        style="scrollbar-width: thin"
        :style="{ '--alarm-row-height': `${tableRowHeight}px` }"
      >
        <table
          class="alarm-events-table active-alarm-events-table alarm-events-body-table text-caption"
        >
          <colgroup>
            <col
              class="alarm-col-time"
              style="width: 12%"
            />

            <col
              class="alarm-col-severity"
              style="width: 12%"
            />

            <col
              class="alarm-col-station"
              style="width: 13%"
            />

            <col
              class="alarm-col-title"
              style="width: 23%"
            />

            <col
              class="alarm-col-value"
              style="width: 10%"
            />

            <col
              class="alarm-col-status"
              style="width: 13%"
            />

            <col
              class="alarm-col-actions"
              style="width: 17%"
            />
          </colgroup>

          <tbody>
            <tr
              v-for="row in visibleRows"
              :key="row.id"
            >
              <td
                class="q-py-none q-px-sm overflow-hidden text-left text-no-wrap"
                style="line-height: 1.12"
              >
                {{ row.time }}
              </td>

              <td
                class="q-py-none q-px-sm overflow-hidden text-left text-no-wrap"
                style="line-height: 1.12"
              >
                <q-badge
                  class="justify-center"
                  style="min-width: 66px"
                  :class="['severity-badge', row.severity.toLowerCase()]"
                >
                  {{ translateStatus(row.severity) }}
                </q-badge>
              </td>

              <td
                class="q-py-none q-px-sm overflow-hidden text-left text-no-wrap"
                style="line-height: 1.12"
              >
                {{ row.asset }}
              </td>

              <td
                class="alarm-title-cell q-py-none q-px-sm overflow-hidden text-left text-no-wrap"
                style="line-height: 1.12; max-width: none"
              >
                {{ translateText(row.title) }}
              </td>

              <td
                class="q-py-none q-px-sm overflow-hidden text-left text-no-wrap"
                style="line-height: 1.12"
              >
                {{ row.value }}
              </td>

              <td
                class="q-py-none q-px-sm overflow-hidden text-left text-no-wrap"
                style="line-height: 1.12"
              >
                <q-badge
                  class="justify-center"
                  style="min-width: 66px"
                  :class="['severity-badge', 'status-badge', statusBadgeClass(row)]"
                >
                  {{ translateStatus(displayStatus(row)) }}
                </q-badge>
              </td>

              <td
                class="alarm-actions-cell text-no-wrap q-py-none q-px-sm overflow-hidden text-left"
                style="line-height: 1.12"
              >
                <q-btn
                  color="blue-grey-2"
                  dense
                  flat
                  icon="visibility"
                  round
                  size="13px"
                  @click.stop="openAsset(row)"
                >
                  <q-tooltip>
                    {{
                      assetRoute(row) ? t('dashboard.openDigitalTwin') : t('dashboard.showOnGisMap')
                    }}
                  </q-tooltip>
                </q-btn>

                <q-btn
                  color="cyan"
                  dense
                  flat
                  icon="push_pin"
                  round
                  size="13px"
                  :disable="!mapStationId(row)"
                  @click.stop="pinStation(row)"
                >
                  <q-tooltip>{{ t('dashboard.showStationOnMap') }}</q-tooltip>
                </q-btn>

                <q-btn
                  dense
                  flat
                  icon="check"
                  round
                  size="13px"
                  :color="acknowledgedIds.has(row.id) ? 'blue-grey-4' : 'positive'"
                  @click.stop="acknowledge(row)"
                >
                  <q-tooltip>{{ t('dashboard.acknowledge') }}</q-tooltip>
                </q-btn>

                <q-btn
                  dense
                  flat
                  icon="build"
                  round
                  size="13px"
                  :color="workOrderIds.has(row.id) ? 'warning' : 'cyan'"
                  @click.stop="createWorkOrder(row)"
                >
                  <q-tooltip>{{ t('dashboard.createWorkOrder') }}</q-tooltip>
                </q-btn>
              </td>
            </tr>

            <tr v-if="!visibleRows.length">
              <td
                class="empty-alarm-row scada-text-muted text-center q-py-none q-px-sm overflow-hidden text-left text-no-wrap"
                colspan="7"
                style="line-height: 1.12"
              >
                {{ t('dashboard.noActiveAlarmsOrEvents') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </q-card-section>

    <q-dialog v-model="viewAllOpen">
      <q-card
        class="scada-card alarm-events-dialog"
        style="width: min(1040px, calc(100vw - 32px)); max-width: 1040px"
      >
        <q-card-section class="row items-center justify-between">
          <div>
            <div class="section-kicker-light text-caption text-weight-bold text-uppercase">
              {{ t('dashboard.activeAlarmsEvents') }}
            </div>

            <div class="section-title text-subtitle1 text-weight-bold">
              {{ t('dashboard.alarmEventRegister') }}
            </div>
          </div>

          <div class="row items-center q-gutter-xs">
            <q-btn
              dense
              flat
              icon="sort"
              round
              style="width: 28px; height: 28px"
              :aria-label="
                severitySortEnabled ? t('dashboard.sortByTime') : t('dashboard.sortBySeverity')
              "
              :class="['alarm-sort-btn', { active: severitySortEnabled }]"
              :color="severitySortEnabled ? 'cyan' : 'blue-grey-3'"
              @click="toggleSeveritySort"
            >
              <q-tooltip>
                {{
                  severitySortEnabled ? t('dashboard.sortByTime') : t('dashboard.sortBySeverity')
                }}
              </q-tooltip>
            </q-btn>

            <q-btn
              dense
              flat
              icon="filter_alt"
              round
              :aria-label="
                mapFilterEnabled ? t('dashboard.restoreMapPins') : t('dashboard.mapTableStations')
              "
              :aria-pressed="mapFilterEnabled"
              :color="mapFilterEnabled ? 'cyan' : 'blue-grey-3'"
              @click="emit('update:mapFilterEnabled', !mapFilterEnabled)"
            >
              <q-tooltip>
                {{
                  mapFilterEnabled ? t('dashboard.restoreMapPins') : t('dashboard.mapTableStations')
                }}
              </q-tooltip>
            </q-btn>

            <q-btn
              v-close-popup
              color="blue-grey-2"
              dense
              flat
              icon="close"
              round
            />
          </div>
        </q-card-section>

        <q-card-section
          class="q-pa-none dialog-alarm-table-frame"
          style="grid-template-rows: auto minmax(0, 1fr)"
        >
          <table
            class="alarm-events-table active-alarm-events-table alarm-events-header-table text-caption col-auto"
          >
            <colgroup>
              <col
                class="alarm-col-time"
                style="width: 12%"
              />

              <col
                class="alarm-col-severity"
                style="width: 12%"
              />

              <col
                class="alarm-col-station"
                style="width: 13%"
              />

              <col
                class="alarm-col-title"
                style="width: 23%"
              />

              <col
                class="alarm-col-value"
                style="width: 10%"
              />

              <col
                class="alarm-col-status"
                style="width: 13%"
              />

              <col
                class="alarm-col-actions"
                style="width: 17%"
              />
            </colgroup>

            <thead>
              <tr>
                <th
                  class="q-py-xs q-px-sm overflow-hidden text-left text-no-wrap text-weight-bold text-uppercase"
                  style="line-height: 1.12; font-size: 10px"
                >
                  {{ t('dashboard.time') }}
                </th>

                <th
                  class="q-py-xs q-px-sm overflow-hidden text-left text-no-wrap text-weight-bold text-uppercase"
                  style="line-height: 1.12; font-size: 10px"
                >
                  {{ t('dashboard.severity') }}
                </th>

                <th
                  class="q-py-xs q-px-sm overflow-hidden text-left text-no-wrap text-weight-bold text-uppercase"
                  style="line-height: 1.12; font-size: 10px"
                >
                  {{ t('dashboard.station') }}
                </th>

                <th
                  class="q-py-xs q-px-sm overflow-hidden text-left text-no-wrap text-weight-bold text-uppercase"
                  style="line-height: 1.12; font-size: 10px"
                >
                  {{ t('dashboard.alarm') }}
                </th>

                <th
                  class="q-py-xs q-px-sm overflow-hidden text-left text-no-wrap text-weight-bold text-uppercase"
                  style="line-height: 1.12; font-size: 10px"
                >
                  {{ t('dashboard.value') }}
                </th>

                <th
                  class="q-py-xs q-px-sm overflow-hidden text-left text-no-wrap text-weight-bold text-uppercase"
                  style="line-height: 1.12; font-size: 10px"
                >
                  {{ t('dashboard.status') }}
                </th>

                <th
                  class="q-py-xs q-px-sm overflow-hidden text-left text-no-wrap text-weight-bold text-uppercase"
                  style="line-height: 1.12; font-size: 10px"
                >
                  {{ t('dashboard.actions') }}
                </th>
              </tr>
            </thead>
          </table>

          <div
            class="dialog-alarm-table-scroll overflow-auto q-pb-sm"
            style="max-height: 70vh; scrollbar-width: thin"
          >
            <table
              class="alarm-events-table active-alarm-events-table alarm-events-body-table text-caption"
            >
              <colgroup>
                <col
                  class="alarm-col-time"
                  style="width: 12%"
                />

                <col
                  class="alarm-col-severity"
                  style="width: 12%"
                />

                <col
                  class="alarm-col-station"
                  style="width: 13%"
                />

                <col
                  class="alarm-col-title"
                  style="width: 23%"
                />

                <col
                  class="alarm-col-value"
                  style="width: 10%"
                />

                <col
                  class="alarm-col-status"
                  style="width: 13%"
                />

                <col
                  class="alarm-col-actions"
                  style="width: 17%"
                />
              </colgroup>

              <tbody>
                <tr
                  v-for="row in displayRows"
                  :key="`dialog-${row.id}`"
                >
                  <td
                    class="q-py-none q-px-sm overflow-hidden text-left text-no-wrap"
                    style="line-height: 1.12"
                  >
                    {{ row.time }}
                  </td>

                  <td
                    class="q-py-none q-px-sm overflow-hidden text-left text-no-wrap"
                    style="line-height: 1.12"
                  >
                    <q-badge
                      class="justify-center"
                      style="min-width: 66px"
                      :class="['severity-badge', row.severity.toLowerCase()]"
                    >
                      {{ translateStatus(row.severity) }}
                    </q-badge>
                  </td>

                  <td
                    class="q-py-none q-px-sm overflow-hidden text-left text-no-wrap"
                    style="line-height: 1.12"
                  >
                    {{ row.asset }}
                  </td>

                  <td
                    class="alarm-title-cell q-py-none q-px-sm overflow-hidden text-left text-no-wrap"
                    style="line-height: 1.12; max-width: none"
                  >
                    {{ translateText(row.title) }}
                  </td>

                  <td
                    class="q-py-none q-px-sm overflow-hidden text-left text-no-wrap"
                    style="line-height: 1.12"
                  >
                    {{ row.value }}
                  </td>

                  <td
                    class="q-py-none q-px-sm overflow-hidden text-left text-no-wrap"
                    style="line-height: 1.12"
                  >
                    <q-badge
                      class="justify-center"
                      style="min-width: 66px"
                      :class="['severity-badge', 'status-badge', statusBadgeClass(row)]"
                    >
                      {{ translateStatus(displayStatus(row)) }}
                    </q-badge>
                  </td>

                  <td
                    class="alarm-actions-cell text-no-wrap q-py-none q-px-sm overflow-hidden text-left"
                    style="line-height: 1.12"
                  >
                    <q-btn
                      color="blue-grey-2"
                      dense
                      flat
                      icon="visibility"
                      round
                      @click.stop="openAsset(row)"
                    >
                      <q-tooltip>
                        {{
                          assetRoute(row)
                            ? t('dashboard.openDigitalTwin')
                            : t('dashboard.showOnGisMap')
                        }}
                      </q-tooltip>
                    </q-btn>

                    <q-btn
                      color="cyan"
                      dense
                      flat
                      icon="push_pin"
                      round
                      :disable="!mapStationId(row)"
                      @click.stop="pinStation(row)"
                    >
                      <q-tooltip>{{ t('dashboard.showStationOnMap') }}</q-tooltip>
                    </q-btn>

                    <q-btn
                      dense
                      flat
                      icon="check"
                      round
                      :color="acknowledgedIds.has(row.id) ? 'blue-grey-4' : 'positive'"
                      @click.stop="acknowledge(row)"
                    >
                      <q-tooltip>{{ t('dashboard.acknowledge') }}</q-tooltip>
                    </q-btn>

                    <q-btn
                      dense
                      flat
                      icon="build"
                      round
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
// Keep component selector isolation for the shared stylesheet.
defineOptions({ __scopeId: 'data-v-ui-744a5a12' });

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { PropType } from 'vue';
import { useAlarmRegister } from '../../../../composables/useAlarmRegister';
import { useI18n } from '../../../../i18n';
import type { TopRiskSubstation } from '../../../../types/dashboard';

const tableViewport = ref<HTMLElement | null>(null);

const tableRowHeight = ref(36);

let tableResizeObserver: ResizeObserver | undefined;

onMounted(() => {
  const viewport = tableViewport.value;

  if (!viewport) return;

  const fitRows = () => {
    // Keep compact rows and distribute the remaining pixels so the bottom row
    // is fully visible at any panel height. The remaining alarms still scroll.
    const available = viewport.clientHeight;

    const rowCount = Math.floor(available / 36);

    tableRowHeight.value = rowCount > 0 ? available / rowCount : 36;
  };

  tableResizeObserver = new ResizeObserver(fitRows);
  tableResizeObserver.observe(viewport);
  fitRows();
});

onBeforeUnmount(() => tableResizeObserver?.disconnect());

const { t, translateText, translateStatus } = useI18n();

const props = defineProps({
  mapFilterEnabled: { type: Boolean, default: false },
  events: {
    type: Array as PropType<unknown[]>,
    default: () => [],
  },
  topRiskSubstations: {
    type: Array as PropType<TopRiskSubstation[]>,
    default: () => [],
  },
  maxVisible: {
    type: Number,
    default: 24,
  },
  openRegisterSignal: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits<{
  'focus-station': [stationId: string];
  'update:mapFilterEnabled': [enabled: boolean];
  'table-stations': [stationIds: string[]];
}>();

const {
  acknowledge,
  acknowledgedIds,
  activeCount,
  assetRoute,
  createWorkOrder,
  displayRows,
  displayStatus,
  mapStationId,
  openAsset,
  openRegister,
  pinStation,
  severitySortEnabled,
  statusBadgeClass,
  toggleSeveritySort,
  viewAllOpen,
  visibleRows,
  workOrderIds,
} = useAlarmRegister({
  getTopRiskSubstations: () => props.topRiskSubstations,
  getMaxVisible: () => props.maxVisible,
  onFocusStation: (stationId) => emit('focus-station', stationId),
});

defineExpose({
  openRegister,
});

const tableStationIds = computed(() => [
  ...new Set(
    (viewAllOpen.value ? displayRows.value : visibleRows.value)
      .map(mapStationId)
      .filter((id): id is string => Boolean(id)),
  ),
]);

watch(tableStationIds, (ids) => emit('table-stations', ids), { immediate: true });

watch(
  () => props.openRegisterSignal,
  (signal) => {
    if (signal) {
      openRegister();
    }
  },
  { immediate: true },
);
</script>
