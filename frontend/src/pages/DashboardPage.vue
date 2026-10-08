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
            :style="{ gridTemplateRows: primaryRows }"
          >
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
              <div class="ops-drawer-content scada-min-height-0 scada-min-width-0 overflow-hidden">
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

const primaryRows = computed(() => {
  const rows: string[] = [];

  const hasMap = workspacePreferences.showMap;

  const hasOps = opsPanels.value.length > 0;

  if (hasMap) rows.push('var(--dashboard-map-row, minmax(0, 2fr))');

  if (workspacePreferences.showMetrics) rows.push('auto');

  if (hasOps) rows.push('var(--dashboard-ops-row, minmax(230px, 1fr))');

  return rows.join(' ') || 'minmax(0,1fr)';
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
