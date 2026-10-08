<template>
  <q-layout view="lHh Lpr lFf">
    <Sidebar />

    <q-page-container>
      <q-page class="dashboard-page dashboard-noc">
        <Topbar
          @open-notifications="openNotifications"
          @open-topology="topologyOpen = true"
        />

        <!-- <q-banner
          v-if="store.error"
          rounded
          class="bg-red-10 text-red-2"
        >
          {{ store.error }}
        </q-banner> -->

        <!-- <RealtimeMetricsTicker
          :summary="store.summary"
          :connection="store.connection"
          :total-load="store.totalLoadMW"
          :blackout="store.blackout"
        /> -->

        <div
          class="dashboard-workspace noc-workspace"
          :class="{ 'workspace-no-rail': !showRightRail, 'workspace-no-primary': !showPrimary }"
        >
          <main
            v-if="showPrimary"
            class="primary-ops-column"
            style="min-width: 0"
            :class="{ 'metrics-hidden': !workspacePreferences.showMetrics }"
          >
            <q-splitter
              v-model="mapSplitRatio"
              class="dashboard-map-splitter"
              horizontal
              emit-immediately
              :disable="!canResizeMap"
              :limits="canResizeMap ? [25, 80] : [0, 100]"
              :separator-style="{ height: canResizeMap ? '16px' : '0' }"
              before-class="overflow-hidden"
              after-class="overflow-hidden"
            >
              <template #before>
                <section
                  v-if="workspacePreferences.showMap"
                  class="map-zone scada-min-height-0"
                >
                  <DashboardMap
                    :focus-station="stationFocusRequest"
                    :show-controls="workspacePreferences.showMapControls"
                    :station-filter-ids="alarmMapOnly ? alarmTableStationIds : null"
                  />
                </section>
              </template>
              <template #separator>
                <button
                  v-if="canResizeMap"
                  class="map-resize-handle"
                  type="button"
                  role="separator"
                  aria-orientation="horizontal"
                  :aria-label="t('dashboard.resizeMap')"
                  :aria-valuenow="Math.round(mapSplitRatio)"
                  :aria-valuemin="25"
                  :aria-valuemax="80"
                  @keydown.up.prevent="mapSplitRatio -= 2"
                  @keydown.down.prevent="mapSplitRatio += 2"
                  @keydown.home.prevent="mapSplitRatio = 25"
                  @keydown.end.prevent="mapSplitRatio = 80"
                  @dblclick="mapSplitRatio = 60"
                >
                  <svg
                    class="map-resize-grip"
                    width="40"
                    height="14"
                    viewBox="0 0 40 14"
                    aria-hidden="true"
                    fill="none"
                  >
                    <path d="M17 4 20 1 23 4M17 10 20 13 23 10M8 7h24" />
                  </svg>
                  <q-tooltip>{{ t('dashboard.resizeMapHint') }}</q-tooltip>
                </button>
              </template>
              <template #after>
                <div
                  class="dashboard-lower-panels"
                  :class="{ 'has-operations': opsPanels.length > 0 }"
                >
                  <OperatorMetricsRow
                    v-if="workspacePreferences.showMetrics"
                    :metrics="operatorMetrics"
                  />

                  <section
                    v-if="opsPanels.length"
                    class="ops-drawer-layout overflow-hidden"
                    style="min-height: 0"
                    :class="{ 'ops-single-panel': opsPanels.length === 1 }"
                  >
                    <div
                      class="ops-drawer-content scada-min-height-0 scada-min-width-0 overflow-hidden"
                    >
                      <q-banner
                        v-if="rootCauseError"
                        class="bg-blue-grey-10 text-warning"
                        dense
                      >
                        {{ rootCauseError }}
                      </q-banner>

                      <transition
                        mode="out-in"
                        name="ops-expand"
                      >
                        <ActiveAlarmsEventsPanel
                          v-if="activeOpsPanel === 'alarms'"
                          v-model:map-filter-enabled="alarmMapOnly"
                          class="ops-panel-card no-wrap column"
                          key="alarms"
                          :events="store.eventStream"
                          :open-register-signal="notificationOpenSignal"
                          :top-risk-substations="store.topRiskSubstations"
                          @focus-station="focusStationOnMap"
                          @table-stations="alarmTableStationIds = $event"
                        />

                        <AlarmCorrelationPanel
                          v-else-if="activeOpsPanel === 'correlation'"
                          class="ops-panel-card no-wrap column"
                          key="correlation"
                          :allow-root-cause="workspacePreferences.showRootCause"
                          :correlations="store.correlations"
                          @select="openCorrelation"
                        />

                        <AlarmRootCausePanel
                          v-else-if="activeOpsPanel === 'rootCause'"
                          class="ops-panel-card no-wrap column"
                          key="rootCause"
                          :root-cause="store.activeRootCause"
                        />

                        <RealtimeEventStream
                          v-else-if="activeOpsPanel === 'events'"
                          class="ops-panel-card no-wrap column"
                          key="events"
                          :events="store.eventStream"
                        />
                      </transition>
                    </div>

                    <div
                      v-if="opsPanels.length > 1"
                      class="ops-icon-rail scada-min-height-0 items-center q-py-sm q-px-xs q-gutter-y-sm q-mt-none row no-wrap"
                      style="
                        box-sizing: border-box;
                        border: 1px solid rgba(64, 196, 255, 0.14);
                        border-radius: 8px;
                        background: rgba(5, 12, 22, 0.78);
                      "
                    >
                      <q-btn
                        v-for="panel in opsPanels"
                        dense
                        flat
                        round
                        size="11px"
                        style="width: 30px; height: 30px"
                        :aria-label="panel.label"
                        :class="['ops-rail-btn', { active: activeOpsPanel === panel.key }]"
                        :color="activeOpsPanel === panel.key ? 'cyan' : 'blue-grey-3'"
                        :icon="panel.icon"
                        :key="panel.key"
                        @click="activeOpsPanel = panel.key"
                      >
                        <q-tooltip
                          anchor="center left"
                          self="center right"
                        >
                          {{ panel.label }}
                        </q-tooltip>
                      </q-btn>
                    </div>
                  </section>
                </div>
              </template>
            </q-splitter>
          </main>

          <aside
            v-if="showRightRail"
            class="right-rail noc-right-rail scada-gap-10 content-start hide-scrollbar scroll-y"
            style="display: grid"
          >
            <LoadForecastCard
              v-if="workspacePreferences.showForecast"
              :points="store.forecast"
            />

            <BlackoutPredictionCard
              v-if="workspacePreferences.showBlackout"
              :prediction="store.blackout"
              :top-risk="store.topRiskSubstations"
            />

            <TopRiskSubstationsCard
              v-if="workspacePreferences.showTopRisk"
              :stations="store.topRiskSubstations"
              @select-station="focusStationOnMap"
            />

            <AIInsightsPanel
              v-if="workspacePreferences.showInsights"
              :insights="store.insights"
              @focus-station="focusStationOnMap"
            />

            <OutageRiskMapCard
              v-if="workspacePreferences.showRiskMap"
              :stations="store.topRiskSubstations"
            />
          </aside>

          <div
            v-if="!showPrimary && !showRightRail"
            class="dashboard-empty column no-wrap items-center justify-center"
            style="color: #92aabd"
          >
            <q-icon
              color="cyan"
              name="dashboard_customize"
              size="36px"
            />

            <p>{{ t('dashboard.noVisibleComponents') }}</p>

            <q-btn
              color="cyan"
              flat
              to="/settings"
              :label="t('settings.title')"
            />
          </div>
        </div>

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
import { computed, onMounted, ref, watch } from 'vue';
import { useSensorStore } from '../stores/sensorStore';
import { selectedCountry } from '../stores/regionPreferences';
import { workspacePreferences } from '../stores/workspacePreferences';
import Sidebar from '../components/layout/Sidebar.vue';
import Topbar from '../components/layout/Topbar.vue';
import DashboardMap from '../components/dashboard/map/DashboardMap.vue';
import BlackoutPredictionCard from '../components/dashboard/right-sidebar/BlackoutPredictionCard.vue';
import TopRiskSubstationsCard from '../components/dashboard/right-sidebar/TopRiskSubstationsCard.vue';
import AIInsightsPanel from '../components/dashboard/right-sidebar/AIInsightsPanel.vue';
import LoadForecastCard from '../components/dashboard/right-sidebar/LoadForecastCard.vue';
import OutageRiskMapCard from '../components/dashboard/right-sidebar/OutageRiskMapCard.vue';
import ActiveAlarmsEventsPanel from '../components/dashboard/operations/alarms/ActiveAlarmsEventsPanel.vue';
import AlarmCorrelationPanel from '../components/dashboard/operations/alarms/AlarmCorrelationPanel.vue';
import AlarmRootCausePanel from '../components/dashboard/operations/alarms/AlarmRootCausePanel.vue';
import RealtimeEventStream from '../components/dashboard/operations/RealtimeEventStream.vue';
import SystemTopologyDialog from '../components/system/SystemTopologyDialog.vue';
import OperatorMetricsRow from '../components/dashboard/operations/OperatorMetricsRow.vue';
import { useOperatorMetrics } from '../composables/useOperatorMetrics';
import { useI18n } from '../i18n';
import type { FocusStationRequest } from '../types/dashboard';

const store = useSensorStore();

const { t } = useI18n();

const topologyOpen = ref(false);

const activeOpsPanel = ref('alarms');

const alarmMapOnly = ref(false);

const alarmTableStationIds = ref<string[]>([]);

watch(activeOpsPanel, (panel) => {
  if (panel !== 'alarms') alarmMapOnly.value = false;
});

const rootCauseError = ref<string | null>(null);

const stationFocusRequest = ref<FocusStationRequest | null>(null);
watch(selectedCountry, () => {
  stationFocusRequest.value = null;
  alarmTableStationIds.value = [];
});

const notificationOpenSignal = ref(0);

const { operatorMetrics } = useOperatorMetrics(store, t);

const opsPanels = computed(() =>
  [
    {
      key: 'alarms',
      label: t('dashboard.activeAlarmsEvents'),
      icon: 'table_rows',
      enabled: workspacePreferences.showAlarms,
    },
    {
      key: 'correlation',
      label: t('dashboard.alarmCorrelation'),
      icon: 'hub',
      enabled: workspacePreferences.showCorrelation,
    },
    {
      key: 'rootCause',
      label: t('dashboard.rootCauseAnalysis'),
      icon: 'account_tree',
      enabled: workspacePreferences.showRootCause,
    },
    {
      key: 'events',
      label: t('dashboard.realtimeEventStream'),
      icon: 'stream',
      enabled: workspacePreferences.showEvents,
    },
  ].filter((panel) => panel.enabled),
);

const showRightRail = computed(() =>
  [
    workspacePreferences.showForecast,
    workspacePreferences.showBlackout,
    workspacePreferences.showTopRisk,
    workspacePreferences.showInsights,
    workspacePreferences.showRiskMap,
  ].some(Boolean),
);

const showPrimary = computed(
  () =>
    workspacePreferences.showMap || workspacePreferences.showMetrics || opsPanels.value.length > 0,
);

const canResizeMap = computed(
  () =>
    workspacePreferences.showMap &&
    (workspacePreferences.showMetrics || opsPanels.value.length > 0),
);

const splitStorageKey = 'cratedb-dashboard-map-split';
const savedMapRatio = ref(60);
try {
  const stored = Number(window.localStorage.getItem(splitStorageKey));
  if (Number.isFinite(stored) && stored >= 25 && stored <= 80) savedMapRatio.value = stored;
} catch {
  /* Use the default when browser storage is unavailable. */
}

const mapSplitRatio = computed({
  get: () => (!workspacePreferences.showMap ? 0 : !canResizeMap.value ? 100 : savedMapRatio.value),
  set: (value: number) => {
    savedMapRatio.value = Math.min(80, Math.max(25, value));
  },
});
watch(savedMapRatio, (value) => {
  try {
    window.localStorage.setItem(splitStorageKey, String(value));
  } catch {
    /* Keep session state. */
  }
});

watch(
  opsPanels,
  (panels) => {
    if (!panels.some((panel) => panel.key === activeOpsPanel.value))
      activeOpsPanel.value = panels[0]?.key || '';
  },
  { immediate: true },
);

function focusStationOnMap(stationId: string) {
  workspacePreferences.showMap = true;
  stationFocusRequest.value = {
    id: stationId,
    requestedAt: Date.now(),
  };
}

function openNotifications() {
  workspacePreferences.showAlarms = true;
  activeOpsPanel.value = 'alarms';
  notificationOpenSignal.value += 1;
}

async function openCorrelation(correlationId: string) {
  if (!workspacePreferences.showRootCause) return;

  rootCauseError.value = null;

  try {
    await store.openRootCause(correlationId);

    if (workspacePreferences.showRootCause) activeOpsPanel.value = 'rootCause';
  } catch {
    rootCauseError.value = t('dashboard.incidentUnavailable');
  }
}

onMounted(() => {
  store.start();
});
</script>

<style scoped>
.primary-ops-column {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.dashboard-map-splitter {
  flex: 1;
  min-height: 0;
  width: 100%;
}
.dashboard-lower-panels {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: auto;
}
.dashboard-lower-panels > :first-child:not(.ops-drawer-layout) {
  flex: 0 0 auto;
}
.dashboard-lower-panels > .ops-drawer-layout {
  flex: 1 0 200px;
}
.map-resize-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 16px;
  padding: 0;
  border: 0;
  background: #07121d;
  cursor: ns-resize;
  touch-action: none;
}
.map-resize-grip {
  color: #96adbd;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  pointer-events: none;
  transition: color 0.15s;
}
.map-resize-handle:hover .map-resize-grip,
.map-resize-handle:focus-visible .map-resize-grip {
  color: #42c8ff;
}
.map-resize-handle:focus-visible {
  outline: 1px solid #42c8ff;
  outline-offset: -1px;
}
@media (max-width: 1320px) {
  .primary-ops-column {
    height: 950px;
  }
}
@media (max-width: 820px) {
  .primary-ops-column {
    height: 900px;
  }
}
</style>
