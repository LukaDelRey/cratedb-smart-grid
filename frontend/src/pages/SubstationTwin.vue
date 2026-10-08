<template>
  <q-layout
    class="sst-layout"
    view="lHh Lpr lFf"
  >
    <Sidebar />

    <q-page-container>
      <q-page class="sst-page relative-position no-wrap column">
        <q-banner
          v-if="!station"
          class="bg-blue-grey-10 text-white"
        >
          {{ t('dashboard.noAssetTelemetry') }}
        </q-banner>

        <header
          class="sst-topbar row no-wrap justify-between q-gutter-x-md q-ml-none"
          style="
            min-height: 58px;
            border-bottom: 1px solid rgba(91, 136, 174, 0.18);
            background: linear-gradient(180deg, rgba(5, 13, 24, 0.92), rgba(5, 13, 24, 0.78));
            box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
            backdrop-filter: blur(16px);
          "
        >
          <div
            class="breadcrumbs items-center text-body2 row no-wrap"
            style="min-width: 0"
          >
            <span>Grid Digital Twin</span>

            <q-icon
              name="chevron_right"
              size="18px"
            />

            <span>{{ stationId }}</span>

            <q-icon
              name="chevron_right"
              size="18px"
            />

            <strong class="text-weight-bold text-subtitle1">{{ activeTabLabel }}</strong>
          </div>

          <div
            class="topbar-actions items-center row no-wrap"
            style="min-width: 0"
          >
            <span
              class="online-pill items-center q-py-xs q-px-md text-weight-bold row inline no-wrap"
              :class="{ waiting: !station }"
            >
              <i style="width: 7px; height: 7px" />
              {{ station ? 'Online' : 'Waiting data' }}
            </span>

            <span class="clock q-py-none q-px-md">{{ lastUpdate }}</span>

            <q-btn
              color="blue-grey-3"
              dense
              flat
              icon="notifications"
              round
            >
              <q-badge
                v-if="activeAlarmCount"
                color="negative"
                floating
              >
                {{ activeAlarmCount }}
              </q-badge>
            </q-btn>

            <q-btn
              color="cyan"
              dense
              flat
              icon="science"
              round
              :aria-label="t('dashboard.runScenario')"
              @click="scenarioOpen = true"
            >
              <q-tooltip>{{ t('dashboard.runScenario') }}</q-tooltip>
            </q-btn>

            <q-btn
              color="blue-grey-3"
              dense
              flat
              icon="account_tree"
              round
              @click="runStationContingency"
            />

            <span class="admin">dispatcher</span>
          </div>
        </header>

        <main
          class="sst-scroll scada-min-height-0"
          style="flex: 1"
        >
          <section
            class="sst-content"
            style="min-width: 0"
            :class="`tab-${activeTab}`"
          >
            <div
              class="title-row justify-between q-mb-sm row no-wrap"
              style="min-height: 54px"
            >
              <div>
                <h1
                  class="q-ma-none text-weight-bold text-h5"
                  style="line-height: 1.15; letter-spacing: 0"
                >
                  {{ pageTitle }}
                </h1>

                <div class="asset-meta q-mt-sm text-caption row no-wrap">
                  {{ stationName }} - 110/20 kV - {{ installedCapacity }} MVA -
                  {{ feeders.length }} feeders
                  <span
                    class="online-badge items-center q-py-xs q-px-sm text-weight-bold text-uppercase row inline no-wrap rounded-borders"
                    style="min-height: 22px; font-size: 10px; line-height: 1"
                  >
                    {{ operatingMode }}
                  </span>
                </div>
              </div>

              <div class="time-controls items-center row no-wrap">
                <button
                  class="q-py-none q-px-md cursor-pointer rounded-borders"
                  style="min-height: 32px"
                  type="button"
                >
                  <span class="range-long">
                    {{ activeTab === 'analytics' ? 'Last 7 days' : 'Last 5 minutes' }}
                  </span>

                  <span class="range-short">
                    {{ activeTab === 'analytics' ? '7 days' : '5 min' }}
                  </span>
                </button>

                <button
                  class="active q-py-none q-px-md cursor-pointer rounded-borders"
                  style="min-height: 32px"
                  type="button"
                >
                  Live Data
                </button>

                <button
                  aria-label="Refresh"
                  class="q-py-none q-px-md cursor-pointer rounded-borders"
                  style="min-height: 32px"
                  type="button"
                  @click="store.refreshAll"
                >
                  <q-icon
                    name="refresh"
                    size="17px"
                  />
                </button>
              </div>
            </div>

            <div class="tab-row q-mb-sm overflow-hidden">
              <button
                v-for="tab in tabs"
                class="text-weight-bold text-uppercase cursor-pointer text-caption no-border transparent"
                style="min-width: 0; letter-spacing: 0"
                type="button"
                :class="{ active: activeTab === tab.key }"
                :key="tab.key"
                @click="activeTab = tab.key"
              >
                {{ tab.label }}
              </button>
            </div>

            <template v-if="activeTab === 'overview'">
              <section class="overview-kpi-grid q-mb-sm">
                <KpiCard
                  v-for="metric in overviewKpis"
                  :key="metric.label"
                  :metric="metric"
                />
              </section>

              <section
                class="overview-main-grid scada-gap-10 q-mb-sm"
                style="display: grid"
              >
                <div
                  class="sst-card measurements-card overflow-hidden"
                  style="min-width: 0"
                >
                  <h2
                    class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-caption"
                    style="line-height: 1.2; letter-spacing: 0"
                  >
                    Realtime Measurements
                  </h2>

                  <div class="measurement-list q-pt-none q-pb-md q-px-md">
                    <div
                      v-for="item in measurementRows"
                      class="items-center text-caption"
                      style="
                        grid-template-columns: 20px minmax(0, 1fr) 54px 56px 32px;
                        min-height: 38px;
                      "
                      :key="item.label"
                    >
                      <q-icon
                        size="18px"
                        :class="item.tone"
                        :name="item.icon"
                      />

                      <span>{{ item.label }}</span>

                      <SparkLine
                        class="measurement-spark"
                        :seed="item.spark"
                        :tone="item.tone"
                      />

                      <strong class="text-weight-bold text-right text-subtitle1">
                        {{ item.value }}
                      </strong>

                      <em style="font-size: 11px">{{ item.unit }}</em>
                    </div>
                  </div>
                </div>

                <div
                  class="sst-card topology-card overflow-hidden"
                  style="min-width: 0"
                >
                  <div
                    class="card-header items-center justify-between q-pr-md row no-wrap"
                    style="min-height: 42px"
                  >
                    <h2
                      class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase q-pr-none text-caption"
                      style="line-height: 1.2; letter-spacing: 0"
                    >
                      Substation One-Line Twin
                    </h2>

                    <span
                      class="state-chip items-center q-py-xs q-px-sm text-weight-bold text-uppercase row inline no-wrap rounded-borders"
                      style="min-height: 22px; font-size: 10px; line-height: 1"
                      :class="riskTone"
                    >
                      {{ gridState }}
                    </span>
                  </div>

                  <SubstationDiagram
                    :feeders="feeders"
                    :load="loadPct"
                    :risk="risk"
                    :voltage="voltage"
                  />

                  <div class="diagram-footer q-pt-none q-pb-md q-px-md">
                    <span class="block">
                      Health
                      <strong class="green block text-body2">{{ health }} /100</strong>
                    </span>

                    <span class="block">
                      Load
                      <strong class="block text-body2">{{ loadPct }}%</strong>
                    </span>

                    <span class="block">
                      Last Update
                      <strong class="block text-body2">{{ lastUpdate }}</strong>
                    </span>
                  </div>
                </div>

                <aside class="right-stack content-start">
                  <div
                    class="sst-card risk-card overflow-hidden text-center q-pb-md"
                    style="min-width: 0"
                  >
                    <h2
                      class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-caption"
                      style="line-height: 1.2; letter-spacing: 0"
                    >
                      Outage Prediction
                    </h2>

                    <div
                      class="risk-gauge"
                      style="width: 132px"
                      :style="{ '--risk': `${risk}%` }"
                    >
                      <strong
                        class="text-h4 text-weight-bold"
                        style="line-height: 1"
                      >
                        {{ risk }}
                      </strong>

                      <span class="text-body2">%</span>

                      <em
                        class="text-weight-bold text-uppercase"
                        style="font-size: 11px"
                      >
                        {{ riskBand }}
                      </em>
                    </div>

                    <p
                      class="q-mt-xs q-mb-md q-mx-md text-caption"
                      style="min-height: 42px; line-height: 1.35"
                    >
                      {{ riskMessage }}
                    </p>

                    <q-btn
                      class="primary-action text-weight-bold text-caption rounded-borders"
                      icon="account_tree"
                      label="Run N-1"
                      style="min-height: 34px"
                      unelevated
                      @click="runStationContingency"
                    />
                  </div>

                  <div
                    class="sst-card active-alarms-card overflow-hidden"
                    style="min-width: 0"
                  >
                    <div
                      class="card-header items-center justify-between q-pr-md row no-wrap"
                      style="min-height: 42px"
                    >
                      <h2
                        class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase q-pr-none text-caption"
                        style="line-height: 1.2; letter-spacing: 0"
                      >
                        Active Alarms
                      </h2>

                      <span
                        class="alarm-count text-weight-bold text-caption rounded-borders text-white"
                        style="min-width: 26px; min-height: 22px"
                      >
                        {{ activeAlarmCount }}
                      </span>
                    </div>

                    <div class="compact-alarm-list q-pt-none q-pb-md q-px-md">
                      <div
                        v-for="alarm in alarmRows"
                        class="items-center text-caption"
                        style="min-height: 35px; grid-template-columns: 22px minmax(0, 1fr) 46px"
                        :key="alarm.label"
                      >
                        <q-icon
                          :class="alarm.severity"
                          :name="alarm.icon"
                        />

                        <span>{{ alarm.label }}</span>

                        <small class="text-right">{{ alarm.time }}</small>
                      </div>
                    </div>
                  </div>
                </aside>
              </section>

              <section class="overview-chart-grid q-mb-sm">
                <TrendPanel
                  legend-a="Load (%)"
                  legend-b="Voltage Stability"
                  title="Load & Voltage"
                  :footer="[
                    ['Load', `${loadPct}%`],
                    ['Voltage', `${voltage} kV`],
                    ['Current', `${current} A`],
                    ['PF', powerFactor],
                  ]"
                  :seed="loadPct + 8"
                  :values="historyLoadSeries"
                />

                <TrendPanel
                  legend-a="Busbar Temp"
                  legend-b="THD"
                  title="Thermal & Power Quality"
                  :footer="[
                    ['Busbar', `${busbarTemp} C`],
                    ['Ambient', `${ambientTemp} C`],
                    ['THD', `${harmonics} %`],
                    ['Frequency', `${frequency} Hz`],
                  ]"
                  :seed="busbarTemp + 12"
                  :values="historyThermalSeries"
                />

                <TrendPanel
                  legend-a="Measured"
                  legend-b="Forecast"
                  title="AI Forecast (24h)"
                  :seed="loadPct + 18"
                  :side-stats="[
                    ['Peak', `${forecastPeak}%`],
                    ['Confidence', `${forecastConfidence}%`],
                  ]"
                />
              </section>

              <section class="overview-bottom-grid">
                <FeederTable
                  class="overflow-auto"
                  :rows="feeders"
                />

                <ProtectionPanel :rows="protectionRows" />

                <ContingencyPanel
                  :contingency="store.contingency"
                  :fallback="fallbackContingency"
                />
              </section>
            </template>

            <template v-else-if="activeTab === 'digital'">
              <section class="digital-grid q-mb-sm">
                <aside class="left-column content-start">
                  <LiveStatePanel :items="liveState" />

                  <BreakerPanel :rows="breakerRows" />
                </aside>

                <div
                  class="sst-card center-diagram-card overflow-hidden"
                  style="min-width: 0"
                >
                  <div
                    class="card-header items-center justify-between q-pr-md row no-wrap"
                    style="min-height: 42px"
                  >
                    <h2
                      class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase q-pr-none text-caption"
                      style="line-height: 1.2; letter-spacing: 0"
                    >
                      Live Substation Model
                    </h2>

                    <div
                      class="legend row no-wrap"
                      style="font-size: 10px"
                    >
                      <span class="items-center row no-wrap">
                        <i
                          class="actual block"
                          style="width: 15px; height: 4px"
                        />
                        Energized
                      </span>

                      <span class="items-center row no-wrap">
                        <i
                          class="forecast block"
                          style="width: 15px; height: 4px"
                        />
                        Transfer path
                      </span>
                    </div>
                  </div>

                  <SubstationDiagram
                    large
                    :feeders="feeders"
                    :load="loadPct"
                    :risk="risk"
                    :voltage="voltage"
                  />
                </div>

                <aside class="right-column content-start">
                  <ThermalMapPanel
                    :ambient-temp="ambientTemp"
                    :busbar-temp="busbarTemp"
                    :risk="risk"
                  />

                  <SwitchingPanel :steps="switchingSteps" />

                  <EnvironmentPanel :items="environment" />
                </aside>
              </section>

              <section class="digital-bottom-grid">
                <MetricCard
                  title="Digital Twin Core"
                  :metrics="twinCoreMetrics"
                />

                <MetricCard
                  title="Simulation & Prediction"
                  :metrics="simulationMetrics"
                />
              </section>
            </template>

            <template v-else-if="activeTab === 'topology'">
              <section
                class="topology-view-grid scada-gap-10 q-mb-sm"
                style="display: grid"
              >
                <div
                  class="sst-card topology-large-card overflow-hidden"
                  style="min-width: 0"
                >
                  <div
                    class="card-header items-center justify-between q-pr-md row no-wrap"
                    style="min-height: 42px"
                  >
                    <h2
                      class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase q-pr-none text-caption"
                      style="line-height: 1.2; letter-spacing: 0"
                    >
                      Busbar, Transformer & Feeder Topology
                    </h2>

                    <span
                      class="state-chip cyan items-center q-py-xs q-px-sm text-weight-bold text-uppercase row inline no-wrap rounded-borders"
                      style="min-height: 22px; font-size: 10px; line-height: 1"
                    >
                      Generated from SCADA model
                    </span>
                  </div>

                  <SubstationDiagram
                    dense
                    large
                    :feeders="feeders"
                    :load="loadPct"
                    :risk="risk"
                    :voltage="voltage"
                  />
                </div>

                <aside class="topology-side content-start">
                  <MetricCard
                    compact
                    title="Topology State"
                    :metrics="topologyMetrics"
                  />

                  <CustomerPanel :rows="customerClusters" />
                </aside>
              </section>

              <section
                class="feeder-card-grid scada-gap-10"
                style="display: grid"
              >
                <div
                  v-for="feeder in feeders"
                  class="sst-card feeder-card q-pa-md overflow-hidden"
                  style="min-height: 108px; min-width: 0"
                  :key="feeder.id"
                >
                  <div
                    class="feeder-head scada-gap-10 items-start"
                    style="grid-template-columns: 26px minmax(0, 1fr) auto"
                  >
                    <q-icon
                      name="electrical_services"
                      :class="feeder.tone"
                    />

                    <div>
                      <strong class="block text-body2 text-weight-bold">{{ feeder.name }}</strong>

                      <span
                        class="block"
                        style="font-size: 11px"
                      >
                        {{ feeder.id }} - {{ feeder.customers }} customers
                      </span>
                    </div>

                    <em
                      class="text-weight-bold text-uppercase"
                      style="font-size: 10px"
                      :class="feeder.tone"
                    >
                      {{ feeder.status }}
                    </em>
                  </div>

                  <div
                    class="feeder-load items-center scada-gap-10 q-mt-md"
                    style="grid-template-columns: minmax(0, 1fr) 48px"
                  >
                    <span
                      class="overflow-hidden"
                      style="height: 8px"
                    >
                      <i
                        class="block full-height border-radius-inherit"
                        :style="{ width: `${feeder.load}%` }"
                      />
                    </span>

                    <strong class="text-right text-body2 text-weight-bold">
                      {{ feeder.load }}%
                    </strong>
                  </div>
                </div>
              </section>
            </template>

            <template v-else-if="activeTab === 'analytics'">
              <section class="analytics-kpi-grid q-mb-sm">
                <KpiCard
                  v-for="metric in analyticsKpis"
                  :key="metric.label"
                  :metric="metric"
                />
              </section>

              <section class="analytics-chart-grid q-mb-sm">
                <TrendPanel
                  legend-a="Actual"
                  legend-b="Forecast"
                  title="Substation Load Forecast"
                  :seed="forecastPeak"
                />

                <TrendPanel
                  legend-a="RMS Voltage"
                  legend-b="Limit"
                  title="Voltage Deviation"
                  :seed="voltageStability"
                />

                <TrendPanel
                  legend-a="Observed"
                  legend-b="AI Score"
                  title="Alarm Probability"
                  :seed="risk + 22"
                />
              </section>

              <section class="analytics-bottom-grid">
                <AnomalyTable
                  class="overflow-auto"
                  :rows="anomalyRows"
                />

                <InsightsPanel :items="insightRows" />
              </section>
            </template>

            <template v-else-if="activeTab === 'maintenance'">
              <section class="maintenance-grid q-mb-sm">
                <MaintenanceForecast
                  :health="health"
                  :maintenance="maintenance"
                  :risk="risk"
                />

                <AssetHealthPanel :rows="assetHealthRows" />

                <WorkOrderPanel :rows="workOrderRows" />
              </section>

              <section
                class="inspection-grid scada-gap-10"
                style="display: grid"
              >
                <InspectionPanel :rows="inspectionRows" />

                <TrendPanel
                  legend-a="Observed stress"
                  legend-b="Projected stress"
                  title="Degradation Projection"
                  :seed="Math.max(30, 100 - health + 35)"
                  :side-stats="[
                    ['RUL', `${remainingLife} years`],
                    ['Priority', maintenance.priority],
                  ]"
                />
              </section>
            </template>

            <template v-else>
              <section class="events-grid">
                <EventTimeline :rows="eventRows" />

                <ProtectionPanel :rows="protectionRows" />

                <InsightsPanel :items="eventInsightRows" />
              </section>
            </template>
          </section>
        </main>
      </q-page>
    </q-page-container>

    <ScenarioControlDialog
      v-model="scenarioOpen"
      default-type="voltage_drop"
      :station-id="stationId"
    />
  </q-layout>
</template>

<script setup lang="ts">
import { healthThreshold } from '../stores/thresholdSettings';
import { computed, defineComponent, h, onMounted, ref } from 'vue';
import type { PropType } from 'vue';
import { useRoute } from 'vue-router';
import { useSensorStore } from '../stores/sensorStore';
import { humanizeAssetKey as alarmLabel } from '../utils/assets';
import { clamp, round1, round2 } from '../utils/numbers';
import Sidebar from '../components/layout/Sidebar.vue';
import ScenarioControlDialog from '../components/scenarios/ScenarioControlDialog.vue';
import TransformerTwinMiniChart from '../components/transformer-twin/TransformerTwinMiniChart.vue';
import { useI18n } from '../i18n';
import { useStationHistory } from '../composables/useStationHistory';

const route = useRoute();

const store = useSensorStore();

const activeTab = ref('overview');

const scenarioOpen = ref(false);

const { t } = useI18n();

onMounted(() => {
  if (!store.stations.length) {
    store.start();
  }
});

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'digital', label: 'Digital Twin' },
  { key: 'topology', label: 'Topology' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'events', label: 'Events' },
];

const routeStationId = computed(() => {
  const id = route.params.id;

  return Array.isArray(id) ? id[0] : id;
});

const station = computed(() => store.getSubstationById(routeStationId.value));

const transformers = computed(() =>
  store.transformers.filter((transformer) => transformer.substation === station.value?.station_id),
);

const stationId = computed(() => station.value?.station_id || routeStationId.value || 'TS-001');

const stationName = computed(() => station.value?.station_name || `Substation ${stationId.value}`);

const stationHistory = useStationHistory(() => stationId.value);

const historyLoadSeries = stationHistory.series((point) => {
  const current = point.electrical?.current_a;

  return Number.isFinite(current) ? clamp(Number(current) / 5.7, 0, 100) : null;
});

const historyThermalSeries = stationHistory.series((point) => point.thermal?.oil_temp_c);

const activeTabLabel = computed(
  () => tabs.find((tab) => tab.key === activeTab.value)?.label || 'Overview',
);

const pageTitle = computed(() =>
  activeTab.value === 'digital'
    ? `Digital Twin - ${stationName.value}`
    : activeTab.value === 'analytics'
      ? `Analytics - ${stationName.value}`
      : stationName.value,
);

const lastUpdate = computed(() =>
  new Date().toLocaleTimeString('hr-HR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }),
);

const health = computed(() => (station.value ? store.getStationHealth(station.value) : 91));

const risk = computed(() => (station.value ? store.getStationRisk(station.value) : 12));

const activeAlarmCount = computed(() =>
  station.value?.alarms ? Object.values(station.value.alarms).filter(Boolean).length : 0,
);

const voltage = computed(() => round1(station.value?.electrical?.voltage_kv ?? 0));

const current = computed(() => Math.round(station.value?.electrical?.current_a ?? 0));

const frequency = computed(() => round2(station.value?.electrical?.frequency_hz ?? 0));

const activePowerKw = computed(() => Math.round(station.value?.electrical?.active_power_kw ?? 0));

const reactivePower = computed(() =>
  Math.round(station.value?.electrical?.reactive_power_kvar ?? 0),
);

const harmonics = computed(() => round1(station.value?.electrical?.harmonics_thd ?? 0));

const busbarTemp = computed(() => round1(station.value?.thermal?.busbar_temp_c ?? 0));

const oilTemp = computed(() => round1(station.value?.thermal?.oil_temp_c ?? 0));

const windingTemp = computed(() => round1(station.value?.thermal?.winding_temp_c ?? 0));

const ambientTemp = computed(() =>
  round1(station.value?.thermal?.ambient_temp_c ?? store.weather?.temperatureC ?? 0),
);

const hydrogen = computed(() => round1(station.value?.oil_gas?.hydrogen_ppm ?? 0));

const activePowerMw = computed(() => round1(activePowerKw.value / 1000));

const transformerCount = computed(() => Math.max(transformers.value.length, 2));

const installedCapacity = computed(() => transformerCount.value * 40);

const loadPct = computed(() =>
  Math.round(
    clamp(
      Math.max(
        current.value / 5.7,
        (activePowerMw.value / Math.max(installedCapacity.value * 0.72, 1)) * 100,
      ),
      18,
      96,
    ),
  ),
);

const powerFactor = computed(() =>
  round2(
    activePowerKw.value / Math.max(Math.hypot(activePowerKw.value, reactivePower.value), 1),
  ).toFixed(2),
);

const voltageStability = computed(() =>
  Math.round(
    clamp(
      100 - Math.abs(voltage.value - 20.4) * 3.4 - harmonics.value * 0.55 - risk.value * 0.05,
      88,
      99,
    ),
  ),
);

const forecastPeak = computed(() =>
  Math.round(clamp(loadPct.value + 11 + risk.value * 0.08, 38, 98)),
);

const forecastConfidence = computed(() => Math.round(clamp(94 - risk.value * 0.18, 76, 96)));

const remainingLife = computed(() => Math.max(1, Math.round((health.value / 100) * 24)));

const operatingMode = computed(() =>
  risk.value > 70 ? 'Contingency Watch' : risk.value > 40 ? 'Load Watch' : 'Normal Supply',
);

const gridState = computed(() =>
  risk.value > 70 ? 'Critical' : risk.value > 40 ? 'Watch' : 'Stable',
);

const riskBand = computed(() => (risk.value > 70 ? 'High' : risk.value > 40 ? 'Medium' : 'Low'));

const riskTone = computed(() => (risk.value > 70 ? 'red' : risk.value > 40 ? 'yellow' : 'green'));

const riskMessage = computed(() =>
  risk.value > 70
    ? 'Cascade exposure is high. Transfer load and inspect protection coordination.'
    : risk.value > 40
      ? 'Thermal and voltage margins are narrowing. Keep feeder transfer plan armed.'
      : 'Substation is operating inside the expected realtime envelope.',
);

const measurementRows = computed(() => [
  {
    label: 'Busbar Voltage',
    value: voltage.value,
    unit: 'kV',
    icon: 'bolt',
    tone: 'green',
    spark: 67,
  },
  {
    label: 'Incoming Current',
    value: current.value,
    unit: 'A',
    icon: 'electrical_services',
    tone: riskTone.value,
    spark: 82,
  },
  {
    label: 'Active Power',
    value: activePowerMw.value,
    unit: 'MW',
    icon: 'offline_bolt',
    tone: 'cyan',
    spark: 48,
  },
  {
    label: 'Reactive Power',
    value: round1(reactivePower.value / 1000),
    unit: 'MVAr',
    icon: 'data_usage',
    tone: 'white',
    spark: 38,
  },
  {
    label: 'Frequency',
    value: frequency.value,
    unit: 'Hz',
    icon: 'settings_input_component',
    tone: 'green',
    spark: 22,
  },
  {
    label: 'Busbar Temp',
    value: busbarTemp.value,
    unit: 'C',
    icon: 'device_thermostat',
    tone: busbarTemp.value > 70 ? 'yellow' : 'green',
    spark: 71,
  },
  {
    label: 'Power Quality THD',
    value: harmonics.value,
    unit: '%',
    icon: 'show_chart',
    tone: harmonics.value > 4.5 ? 'yellow' : 'cyan',
    spark: 57,
  },
]);

const overviewKpis = computed(() => [
  {
    label: 'Grid Health',
    value: health.value,
    unit: '%',
    icon: 'health_and_safety',
    tone: riskTone.value === 'green' ? 'green' : riskTone.value,
  },
  {
    label: 'Outage Risk',
    value: risk.value,
    unit: '%',
    icon: 'crisis_alert',
    tone: riskTone.value,
  },
  {
    label: 'Station Load',
    value: loadPct.value,
    unit: '%',
    icon: 'speed',
    tone: loadPct.value > 82 ? 'yellow' : 'cyan',
  },
  {
    label: 'Voltage Stability',
    value: voltageStability.value,
    unit: '%',
    icon: 'ssid_chart',
    tone: 'green',
  },
  { label: 'Power Flow', value: activePowerMw.value, unit: 'MW', icon: 'schema', tone: 'cyan' },
  {
    label: 'Active Alarms',
    value: activeAlarmCount.value,
    unit: '',
    icon: 'notifications_active',
    tone: activeAlarmCount.value ? 'yellow' : 'green',
  },
]);

const analyticsKpis = computed(() => [
  {
    label: 'Anomaly Score',
    value: Math.round(clamp(risk.value * 1.08 + harmonics.value * 4, 0, 99)),
    unit: '%',
    icon: 'radar',
    tone: riskTone.value,
  },
  {
    label: 'Forecast Peak',
    value: forecastPeak.value,
    unit: '%',
    icon: 'trending_up',
    tone: forecastPeak.value > 82 ? 'yellow' : 'cyan',
  },
  {
    label: 'AI Confidence',
    value: forecastConfidence.value,
    unit: '%',
    icon: 'psychology',
    tone: 'green',
  },
  {
    label: 'Thermal Margin',
    value: Math.round(clamp(100 - busbarTemp.value, 15, 74)),
    unit: 'C',
    icon: 'thermostat',
    tone: busbarTemp.value > 70 ? 'yellow' : 'green',
  },
  {
    label: 'THD',
    value: harmonics.value,
    unit: '%',
    icon: 'waves',
    tone: harmonics.value > 4.5 ? 'yellow' : 'cyan',
  },
  { label: 'RUL', value: remainingLife.value, unit: 'yr', icon: 'event_available', tone: 'green' },
]);

const feeders = computed(() => {
  const names = [
    ['F-01', 'City Center', 'hospital'],
    ['F-02', 'Industrial Ring', 'factory'],
    ['F-03', 'North Residential', 'home'],
    ['F-04', 'East Commercial', 'storefront'],
    ['F-05', 'West Backup Tie', 'swap_horiz'],
    ['F-06', 'Critical Services', 'local_hospital'],
  ];

  return names.map(([id, name, icon], index) => {
    const swing = Math.sin((index + 1) * 1.17 + loadPct.value * 0.04) * 7;

    const load = Math.round(clamp(loadPct.value + swing + index * 2 - 4, 22, 99));

    const status =
      load > 88 || (risk.value > 68 && index < 2)
        ? 'Critical'
        : load > 76 || (risk.value > 42 && index === 1)
          ? 'Watch'
          : 'Normal';

    const tone = status === 'Critical' ? 'red' : status === 'Watch' ? 'yellow' : 'green';

    return {
      id,
      name,
      icon,
      load,
      status,
      tone,
      current: Math.round(current.value * (0.14 + index * 0.015)),
      customers: 860 + index * 410 + assetSeed.value * 9,
      breaker: index === 4 && risk.value < 42 ? 'Standby' : 'Closed',
    };
  });
});

const protectionRows = computed(() => [
  {
    zone: 'Incoming 110 kV',
    relay: 'Distance + UV',
    pickup: '0.82 pu',
    latency: '42 ms',
    status: risk.value > 70 ? 'Armed' : 'Healthy',
    tone: risk.value > 70 ? 'yellow' : 'green',
  },
  {
    zone: 'T1 bay',
    relay: 'Differential 87T',
    pickup: '2.1 In',
    latency: '31 ms',
    status: 'Healthy',
    tone: 'green',
  },
  {
    zone: 'T2 bay',
    relay: 'Overcurrent 50/51',
    pickup: '1.35 In',
    latency: '58 ms',
    status: loadPct.value > 82 ? 'Watch' : 'Healthy',
    tone: loadPct.value > 82 ? 'yellow' : 'green',
  },
  {
    zone: '20 kV busbar',
    relay: 'Arc flash + REF',
    pickup: 'Instant',
    latency: '18 ms',
    status: 'Healthy',
    tone: 'green',
  },
  {
    zone: 'Feeder group',
    relay: 'Earth fault 51N',
    pickup: '0.18 In',
    latency: '66 ms',
    status: activeAlarmCount.value ? 'Armed' : 'Healthy',
    tone: activeAlarmCount.value ? 'yellow' : 'green',
  },
]);

const breakerRows = computed(() => [
  { id: 'CB-110-A', label: 'Incoming A', state: 'Closed', tone: 'green' },
  {
    id: 'CB-110-B',
    label: 'Incoming B',
    state: risk.value > 65 ? 'Ready' : 'Open',
    tone: risk.value > 65 ? 'yellow' : 'white',
  },
  {
    id: 'BC-20-1',
    label: 'Bus Coupler',
    state: loadPct.value > 80 ? 'Closed' : 'Auto',
    tone: loadPct.value > 80 ? 'yellow' : 'cyan',
  },
  { id: 'TR-01', label: 'Transformer Bay 1', state: 'Closed', tone: 'green' },
  {
    id: 'TR-02',
    label: 'Transformer Bay 2',
    state: transformerCount.value > 1 ? 'Closed' : 'Standby',
    tone: 'green',
  },
]);

const liveState = computed(() => [
  {
    label: 'Realtime State Engine',
    value: store.connection?.websocketConnected ? 'Streaming' : 'Polling',
    icon: 'sync_alt',
    tone: store.connection?.websocketConnected ? 'green' : 'yellow',
  },
  {
    label: 'CrateDB Twin Store',
    value: store.connection?.crateConnected ? 'Connected' : 'Degraded',
    icon: 'database',
    tone: store.connection?.crateConnected ? 'green' : 'yellow',
  },
  {
    label: 'N-1 Mode',
    value: risk.value > 40 ? 'Armed' : 'Passive',
    icon: 'account_tree',
    tone: risk.value > 40 ? 'yellow' : 'cyan',
  },
  {
    label: 'AI Forecast',
    value: `${forecastConfidence.value}%`,
    icon: 'psychology',
    tone: 'green',
  },
  {
    label: 'Protection',
    value: activeAlarmCount.value ? 'Armed' : 'Healthy',
    icon: 'shield',
    tone: activeAlarmCount.value ? 'yellow' : 'green',
  },
  {
    label: 'Power Quality',
    value: `THD ${harmonics.value}%`,
    icon: 'waves',
    tone: harmonics.value > 4.5 ? 'yellow' : 'cyan',
  },
]);

const switchingSteps = computed(() => [
  { step: '01', label: 'Validate busbar voltage', value: `${voltage.value} kV`, tone: 'green' },
  {
    step: '02',
    label: 'Shift non-critical feeders',
    value: `${feeders.value[4]?.id || 'F-05'} tie`,
    tone: loadPct.value > 78 ? 'yellow' : 'cyan',
  },
  {
    step: '03',
    label: 'Reserve transformer margin',
    value: `${Math.max(4, installedCapacity.value - activePowerMw.value)} MVA`,
    tone: 'green',
  },
  {
    step: '04',
    label: 'Recalculate cascade exposure',
    value: `${Math.max(2, risk.value - 11)}%`,
    tone: riskTone.value,
  },
]);

const environment = computed(() => [
  { label: 'Ambient', value: `${ambientTemp.value} C`, icon: 'device_thermostat' },
  { label: 'Storm Risk', value: `${store.weather?.stormRisk || 3}%`, icon: 'thunderstorm' },
  { label: 'Wind', value: `${store.weather?.windRisk || 8}%`, icon: 'air' },
  {
    label: 'Grid Impact',
    value: `${store.weather?.gridImpact || Math.round(risk.value * 0.28)}%`,
    icon: 'cell_tower',
  },
]);

const twinCoreMetrics = computed(() => [
  { label: 'State Sync', value: store.connection?.websocketConnected ? 99 : 86, unit: '%' },
  { label: 'Health', value: health.value, unit: '%' },
  { label: 'Lifetime', value: remainingLife.value, unit: 'yr' },
  {
    label: 'Thermal Stress',
    value: Math.round(clamp(busbarTemp.value + oilTemp.value * 0.18, 18, 96)),
    unit: '%',
  },
  { label: 'DGA Stress', value: Math.round(clamp(hydrogen.value * 3.2, 4, 92)), unit: '%' },
  { label: 'Load Model', value: forecastConfidence.value, unit: '%' },
  { label: 'SCADA Quality', value: voltageStability.value, unit: '%' },
]);

const simulationMetrics = computed(() => [
  {
    label: 'N-1 Risk',
    value: Math.round(clamp(risk.value + 9, 0, 99)),
    unit: '%',
    danger: risk.value > 50,
  },
  {
    label: 'Cascade',
    value: Math.round(clamp(risk.value * 0.62, 2, 88)),
    unit: '%',
    danger: risk.value > 65,
  },
  { label: 'Affected Feeders', value: risk.value > 70 ? 4 : risk.value > 40 ? 2 : 1, unit: '' },
  { label: 'Customers', value: customerImpact.value, unit: '' },
  {
    label: 'Transfer Margin',
    value: Math.round(clamp(100 - loadPct.value + 18, 8, 88)),
    unit: '%',
  },
  { label: 'Peak +24h', value: forecastPeak.value, unit: '%' },
  { label: 'Confidence', value: forecastConfidence.value, unit: '%' },
]);

const topologyMetrics = computed(() => [
  { label: '110 kV Bays', value: 2, unit: '' },
  { label: '20 kV Feeders', value: feeders.value.length, unit: '' },
  { label: 'Tie Capacity', value: Math.round(installedCapacity.value * 0.34), unit: 'MVA' },
  { label: 'Reserve', value: Math.round(clamp(100 - loadPct.value, 4, 82)), unit: '%' },
  { label: 'Voltage Stability', value: voltageStability.value, unit: '%' },
  { label: 'Breaker Ops', value: (assetSeed.value % 7) + 3, unit: '/24h' },
]);

const customerClusters = computed(() =>
  feeders.value.slice(0, 4).map((feeder, index) => ({
    name: feeder.name,
    type: ['Critical', 'Industrial', 'Residential', 'Commercial'][index],
    customers: feeder.customers,
    risk: Math.round(clamp(risk.value + feeder.load * 0.16 - 9, 2, 96)),
    tone: feeder.tone,
  })),
);

const anomalyRows = computed(() => {
  const maxFeederLoad = Math.max(...feeders.value.map((item) => item.load));

  return [
    {
      parameter: 'Voltage deviation',
      current: `${round2(voltage.value - 20.0)} kV`,
      expected: '19.6 - 20.8 kV',
      deviation: `${Math.abs(round1((voltage.value - 20.4) * 4.9))}%`,
      status: voltageStability.value < 93 ? 'Watch' : 'Normal',
      tone: voltageStability.value < 93 ? 'yellow' : 'green',
    },
    {
      parameter: 'Feeder load skew',
      current: `${maxFeederLoad}%`,
      expected: '< 86%',
      deviation: `${Math.max(0, maxFeederLoad - 86)}%`,
      status: maxFeederLoad > 86 ? 'Watch' : 'Normal',
      tone: maxFeederLoad > 86 ? 'yellow' : 'green',
    },
    {
      parameter: 'Busbar temperature',
      current: `${busbarTemp.value} C`,
      expected: '< 75 C',
      deviation: `${Math.max(0, round1(busbarTemp.value - 75))} C`,
      status: busbarTemp.value > 75 ? 'Critical' : 'Normal',
      tone: busbarTemp.value > 75 ? 'red' : 'green',
    },
    {
      parameter: 'Harmonics THD',
      current: `${harmonics.value}%`,
      expected: '< 4.5%',
      deviation: `${Math.max(0, round1(harmonics.value - 4.5))}%`,
      status: harmonics.value > 4.5 ? 'Watch' : 'Normal',
      tone: harmonics.value > 4.5 ? 'yellow' : 'green',
    },
  ];
});

const insightRows = computed(() => [
  {
    title: 'AI load forecast',
    body: `Expected peak reaches ${forecastPeak.value}% during the next 24h window.`,
    icon: 'trending_up',
    tone: forecastPeak.value > 82 ? 'yellow' : 'cyan',
    time: 'Now',
  },
  {
    title: 'Topology recommendation',
    body: `Keep ${feeders.value[4]?.id || 'F-05'} prepared as transfer path for the highest loaded feeder.`,
    icon: 'swap_horiz',
    tone: 'cyan',
    time: '2 min',
  },
  {
    title: 'Protection coordination',
    body: `Relay latency remains below target; ${activeAlarmCount.value ? 'alarm path is armed' : 'no immediate relay action required'}.`,
    icon: 'shield',
    tone: activeAlarmCount.value ? 'yellow' : 'green',
    time: '4 min',
  },
  {
    title: 'Predictive maintenance',
    body: `Remaining useful life is estimated at ${remainingLife.value} years based on thermal and DGA stress.`,
    icon: 'event_available',
    tone: 'green',
    time: '8 min',
  },
]);

const eventInsightRows = computed(() => [
  {
    title: 'Event correlation',
    body: 'Alarm engine groups voltage, thermal and feeder symptoms into one operator sequence.',
    icon: 'hub',
    tone: 'cyan',
    time: 'Live',
  },
  {
    title: 'Suggested action',
    body:
      risk.value > 40
        ? 'Run switching scenario before peak window.'
        : 'Keep automatic monitoring active.',
    icon: 'task_alt',
    tone: risk.value > 40 ? 'yellow' : 'green',
    time: 'Now',
  },
]);

const alarmRows = computed(() => {
  const alarms = Object.entries(station.value?.alarms || {})
    .filter(([, enabled]) => enabled)
    .map(([key], index) => ({
      label: alarmLabel(key),
      icon:
        key.includes('temp') || key.includes('overheating')
          ? 'device_thermostat'
          : key.includes('voltage')
            ? 'bolt'
            : 'warning',
      severity: risk.value > 70 ? 'red' : 'yellow',
      time: index ? `${index + 2} min` : 'Now',
    }));

  return alarms.length
    ? alarms
    : [
        { label: 'No active SCADA alarms', icon: 'check_circle', severity: 'green', time: 'Now' },
        {
          label: 'Voltage and thermal drift monitor armed',
          icon: 'radar',
          severity: 'cyan',
          time: '1 min',
        },
      ];
});

const eventRows = computed(() => {
  const stationEvents = store.eventStream
    .filter((event) => !event.assetId || event.assetId === stationId.value)
    .slice(0, 8)
    .map((event) => ({
      time: new Date(event.timestamp).toLocaleTimeString('hr-HR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      source: event.source || 'SCADA',
      event: event.title || 'Realtime event',
      detail: event.description || stationName.value,
      severity: event.severity || 'INFO',
      tone: (event.severity || '').toLowerCase().includes('critical')
        ? 'red'
        : (event.severity || '').toLowerCase().includes('warning')
          ? 'yellow'
          : 'cyan',
    }));

  return stationEvents.length
    ? stationEvents
    : [
        {
          time: lastUpdate.value.slice(0, 5),
          source: 'SYSTEM',
          event: 'Twin state refreshed',
          detail: 'CrateDB latest state loaded into substation model.',
          severity: 'INFO',
          tone: 'cyan',
        },
        {
          time: '14:22',
          source: 'AI',
          event: 'Load forecast updated',
          detail: `Peak estimate ${forecastPeak.value}% with ${forecastConfidence.value}% confidence.`,
          severity: 'INFO',
          tone: 'green',
        },
        {
          time: '14:18',
          source: 'SCADA',
          event: 'Protection heartbeat',
          detail: 'All relay groups responded within target latency.',
          severity: 'INFO',
          tone: 'green',
        },
      ];
});

const maintenance = computed(() => ({
  open: risk.value > 70 ? 5 : risk.value > 40 ? 3 : 1,
  next: risk.value > 70 ? '24h' : risk.value > 40 ? '7 days' : '30 days',
  priority: risk.value > 70 ? 'Critical' : risk.value > 40 ? 'High' : 'Normal',
}));

const assetHealthRows = computed(() => [
  {
    asset: 'T1 Power Transformer',
    health: Math.max(54, health.value - 2),
    stress: Math.round(clamp(oilTemp.value, 22, 96)),
    tone: health.value < healthThreshold('health_warning') ? 'yellow' : 'green',
  },
  {
    asset: 'T2 Power Transformer',
    health: Math.max(58, health.value + 3),
    stress: Math.round(clamp(windingTemp.value - 6, 22, 96)),
    tone: 'green',
  },
  {
    asset: '20 kV Busbar A',
    health: voltageStability.value,
    stress: Math.round(clamp(busbarTemp.value, 18, 92)),
    tone: busbarTemp.value > 70 ? 'yellow' : 'green',
  },
  {
    asset: 'Protection IED Group',
    health: Math.round(clamp(97 - activeAlarmCount.value * 4, 72, 99)),
    stress: activeAlarmCount.value ? 41 : 18,
    tone: activeAlarmCount.value ? 'yellow' : 'green',
  },
  { asset: 'Battery & DC System', health: 95, stress: 22, tone: 'green' },
]);

const workOrderRows = computed(() => [
  {
    id: 'WO-2418',
    title: 'Thermography inspection',
    owner: 'Field crew A',
    due: maintenance.value.next,
    status: risk.value > 40 ? 'Open' : 'Planned',
    tone: risk.value > 40 ? 'yellow' : 'cyan',
  },
  {
    id: 'WO-2421',
    title: 'Protection settings audit',
    owner: 'Relay engineer',
    due: '7 days',
    status: activeAlarmCount.value ? 'Open' : 'Ready',
    tone: activeAlarmCount.value ? 'yellow' : 'green',
  },
  {
    id: 'WO-2427',
    title: 'OLTC operations review',
    owner: 'Asset team',
    due: '30 days',
    status: 'Planned',
    tone: 'green',
  },
]);

const inspectionRows = computed(() => [
  {
    label: 'Inspect infrared hotspots on 20 kV busbar',
    state: busbarTemp.value > 65 ? 'Required' : 'Watch',
    tone: busbarTemp.value > 65 ? 'yellow' : 'cyan',
  },
  {
    label: 'Review feeder imbalance and phase loading',
    state: loadPct.value > 78 ? 'Required' : 'Normal',
    tone: loadPct.value > 78 ? 'yellow' : 'green',
  },
  {
    label: 'Sample oil/DGA on main transformer bank',
    state: hydrogen.value > 15 ? 'Required' : 'Normal',
    tone: hydrogen.value > 15 ? 'yellow' : 'green',
  },
  { label: 'Validate UPS and DC battery autonomy', state: 'Normal', tone: 'green' },
]);

const fallbackContingency = computed(() => ({
  risk: risk.value > 50 ? 'ELEVATED' : 'LOW',
  affectedCustomers: customerImpact.value,
  overloadedAssets: feeders.value.filter((feeder) => feeder.load > 76).length,
}));

const customerImpact = computed(() =>
  feeders.value.reduce(
    (sum, feeder) =>
      sum +
      (feeder.status === 'Critical'
        ? feeder.customers
        : feeder.status === 'Watch'
          ? Math.round(feeder.customers * 0.35)
          : 0),
    0,
  ),
);

const assetSeed = computed(() => {
  const match = String(stationId.value).match(/(\d+)/);

  return match ? Number(match[1]) : 1;
});

function runStationContingency() {
  store.runContingency(stationId.value);
}

const SparkLine = defineComponent({
  name: 'SparkLine',
  props: {
    seed: { type: Number, default: 42 },
    tone: { type: String, default: 'green' },
  },
  setup(props) {
    const points = computed(() =>
      Array.from({ length: 8 }, (_, index) => {
        const x = (index / 7) * 64;

        const wave = Math.sin(index * 0.88 + props.seed * 0.13) * 4.4;

        const secondary = Math.cos(index * 0.57 + props.seed * 0.07) * 2.7;

        const drift = ((props.seed % 19) - 9) * 0.18;

        const value = 10 + wave + secondary + drift + index * 0.35;

        const y = Math.max(3, Math.min(17, value));

        return `${Number(x.toFixed(1))},${Number(y.toFixed(1))}`;
      }).join(' '),
    );

    return () =>
      h('svg', { class: 'spark-line', viewBox: '0 0 64 20' }, [
        h('path', {
          class: 'spark-grid',
          d: 'M0 10H64',
        }),
        h('polyline', {
          class: ['spark-path', props.tone],
          points: points.value,
        }),
      ]);
  },
});

const KpiCard = defineComponent({
  name: 'KpiCard',
  props: {
    metric: { type: Object as PropType<Record<string, any>>, required: true },
  },
  setup(props) {
    return () =>
      h('div', { class: 'sst-card kpi-card items-center q-pa-md' }, [
        h('span', { class: ['material-icons', props.metric.tone] }, props.metric.icon),
        h('div', [
          h('small', { class: 'block text-caption' }, props.metric.label),
          h('strong', { class: 'block q-mt-xs text-weight-medium' }, [
            String(props.metric.value),
            props.metric.unit ? h('em', { class: 'text-body2' }, ` ${props.metric.unit}`) : null,
          ]),
        ]),
      ]);
  },
});

const TrendPanel = defineComponent({
  name: 'TrendPanel',
  props: {
    title: { type: String, required: true },
    seed: { type: Number, default: 72 },
    legendA: { type: String, default: 'Actual' },
    legendB: { type: String, default: 'Forecast' },
    values: { type: Array as PropType<number[]>, default: () => [] },
    footer: { type: Array as PropType<any[]>, default: () => [] },
    sideStats: { type: Array as PropType<any[]>, default: () => [] },
  },
  setup(props) {
    return () =>
      h('div', { class: 'sst-card trend-panel' }, [
        h('div', { class: 'card-header' }, [
          h(
            'h2',
            {
              class:
                'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase',
            },
            props.title,
          ),
          h('div', { class: 'legend row no-wrap items-center q-px-md q-pb-sm text-caption' }, [
            h('span', { class: 'row inline no-wrap items-center' }, [
              h('i', { class: 'actual block', style: { width: '15px', height: '4px' } }),
              props.legendA,
            ]),
            h('span', { class: 'row inline no-wrap items-center' }, [
              h('i', { class: 'forecast block', style: { width: '15px', height: '4px' } }),
              props.legendB,
            ]),
          ]),
        ]),
        h('div', { class: 'trend-body items-center q-py-none q-px-md' }, [
          h(TransformerTwinMiniChart, { seed: props.seed, actualValues: props.values }),
          props.sideStats.length
            ? h(
                'div',
                { class: 'side-stats' },
                props.sideStats.map((stat) =>
                  h('div', { class: 'rounded-borders q-pa-sm' }, [
                    h('span', { class: 'block' }, stat[0]),
                    h('strong', { class: 'block text-body2 text-weight-bold' }, stat[1]),
                  ]),
                ),
              )
            : null,
        ]),
        props.footer.length
          ? h(
              'div',
              { class: 'trend-footer q-pt-none q-pb-sm q-px-md' },
              props.footer.map((item) =>
                h('div', [
                  h('span', { class: 'block' }, item[0]),
                  h('strong', { class: 'block text-body2 text-weight-bold' }, item[1]),
                ]),
              ),
            )
          : null,
      ]);
  },
});

const MetricCard = defineComponent({
  name: 'MetricCard',
  props: {
    title: { type: String, required: true },
    metrics: { type: Array as PropType<any[]>, default: () => [] },
    compact: { type: Boolean, default: false },
  },
  setup(props) {
    return () =>
      h('div', { class: ['sst-card metric-card', { compact: props.compact }] }, [
        h(
          'h2',
          {
            class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase',
          },
          props.title,
        ),
        h(
          'div',
          { class: 'metric-grid q-pt-none q-pb-md q-px-md' },
          props.metrics.map((metric) =>
            h('div', { class: 'rounded-borders relative-position q-pa-sm overflow-hidden' }, [
              h('span', { class: 'block' }, metric.label),
              h('strong', { class: 'block q-mt-xs text-weight-medium' }, [
                String(metric.value),
                metric.unit ? h('em', { class: 'text-caption' }, ` ${metric.unit}`) : null,
              ]),
              metric.danger
                ? h('b', { class: 'absolute', style: { width: `${metric.value}%` } })
                : null,
            ]),
          ),
        ),
      ]);
  },
});

const SubstationDiagram = defineComponent({
  name: 'SubstationDiagram',
  props: {
    feeders: { type: Array as PropType<any[]>, default: () => [] },
    risk: { type: Number, default: 0 },
    load: { type: Number, default: 0 },
    voltage: { type: Number, default: 20.4 },
    large: { type: Boolean, default: false },
    dense: { type: Boolean, default: false },
  },
  setup(props) {
    const feederLines = computed(() =>
      props.feeders.map((feeder, index) => {
        const x = 120 + index * 112;

        return {
          ...feeder,
          x,
          path: `M${x} 178V244`,
          labelY: index % 2 ? 285 : 272,
        };
      }),
    );

    return () =>
      h(
        'div',
        {
          class: [
            'substation-diagram q-pt-none q-pb-sm q-px-sm',
            { large: props.large, dense: props.dense },
          ],
        },
        [
          h(
            'svg',
            {
              class: 'full-width full-height block',
              viewBox: '0 0 820 430',
              role: 'img',
              'aria-label': 'Substation one-line diagram',
            },
            [
              h('defs', [
                h('linearGradient', { id: 'busGlow', x1: '0', x2: '1' }, [
                  h('stop', { offset: '0%', 'stop-color': '#38bfff', 'stop-opacity': '.25' }),
                  h('stop', { offset: '50%', 'stop-color': '#38bfff' }),
                  h('stop', { offset: '100%', 'stop-color': '#71f23f', 'stop-opacity': '.75' }),
                ]),
                h(
                  'filter',
                  { id: 'softGlow', x: '-20%', y: '-20%', width: '140%', height: '140%' },
                  [
                    h('feGaussianBlur', { stdDeviation: '4', result: 'blur' }),
                    h('feMerge', [
                      h('feMergeNode', { in: 'blur' }),
                      h('feMergeNode', { in: 'SourceGraphic' }),
                    ]),
                  ],
                ),
              ]),
              h('path', {
                class: 'diagram-grid',
                d: 'M40 66H780M40 122H780M40 178H780M40 234H780M40 290H780M40 346H780M96 40V386M208 40V386M320 40V386M432 40V386M544 40V386M656 40V386M768 40V386',
              }),
              h('path', { class: 'incoming-line', d: 'M410 30V82' }),
              h('rect', {
                class: ['hv-yard', props.risk > 70 ? 'red' : ''],
                x: '347',
                y: '82',
                width: '126',
                height: '48',
                rx: '5',
              }),
              h(
                'text',
                {
                  class: 'diagram-label text-weight-bold',
                  x: '410',
                  y: '112',
                  'text-anchor': 'middle',
                },
                '110 kV GIS',
              ),
              h('path', { class: 'transformer-link', d: 'M410 130V164' }),
              h('g', { class: 'transformer-bank' }, [
                h('circle', { cx: '382', cy: '176', r: '28' }),
                h('circle', { cx: '438', cy: '176', r: '28' }),
                h(
                  'text',
                  {
                    class: 'diagram-value text-caption text-weight-bold',
                    x: '410',
                    y: '181',
                    'text-anchor': 'middle',
                  },
                  '2 x 40 MVA',
                ),
              ]),
              h('path', { class: 'transformer-link', d: 'M410 204V232' }),
              h('path', { class: 'busbar bus-a', d: 'M82 178H738' }),
              h('path', { class: 'busbar bus-b', d: 'M82 232H738' }),
              h(
                'text',
                { class: 'diagram-label text-weight-bold', x: '82', y: '164' },
                `20 kV BUS A ${props.voltage} kV`,
              ),
              h(
                'text',
                { class: 'diagram-label text-weight-bold', x: '82', y: '258' },
                `20 kV BUS B LOAD ${props.load}%`,
              ),
              h('path', { class: 'coupler', d: 'M410 178V232' }),
              h('rect', {
                class: 'breaker',
                x: '396',
                y: '196',
                width: '28',
                height: '18',
                rx: '3',
              }),
              ...feederLines.value.flatMap((feeder) => [
                h('path', { class: ['feeder-line', feeder.tone], d: feeder.path }),
                h('rect', {
                  class: ['breaker', feeder.tone],
                  x: String(feeder.x - 13),
                  y: '196',
                  width: '26',
                  height: '18',
                  rx: '3',
                }),
                h('circle', {
                  class: ['feeder-node', feeder.tone],
                  cx: String(feeder.x),
                  cy: '244',
                  r: '8',
                }),
                h('path', {
                  class: ['feeder-tail', feeder.tone],
                  d: `M${feeder.x - 24} 244H${feeder.x + 24}M${feeder.x} 252V266`,
                }),
                h(
                  'text',
                  {
                    class: 'diagram-label text-weight-bold',
                    x: String(feeder.x),
                    y: String(feeder.labelY),
                    'text-anchor': 'middle',
                  },
                  feeder.id,
                ),
                h(
                  'text',
                  {
                    class: 'diagram-small',
                    x: String(feeder.x),
                    y: String(feeder.labelY + 17),
                    'text-anchor': 'middle',
                  },
                  `${feeder.load}%`,
                ),
              ]),
              h('path', { class: 'tie-line', d: 'M684 232C744 254 754 310 708 352' }),
              h(
                'text',
                { class: 'diagram-small cyan', x: '700', y: '374', 'text-anchor': 'middle' },
                'Tie path',
              ),
              h('g', { class: 'diagram-badges' }, [
                h('rect', { x: '54', y: '318', width: '178', height: '54', rx: '5' }),
                h(
                  'text',
                  { class: 'diagram-label text-weight-bold', x: '70', y: '341' },
                  'Protection zones armed',
                ),
                h('text', { class: 'diagram-small', x: '70', y: '359' }, '87T / 50-51 / UV / REF'),
                h('rect', { x: '566', y: '318', width: '198', height: '54', rx: '5' }),
                h(
                  'text',
                  { class: 'diagram-label text-weight-bold', x: '582', y: '341' },
                  'AI cascade monitor',
                ),
                h(
                  'text',
                  { class: 'diagram-small', x: '582', y: '359' },
                  `Risk ${props.risk}% - load flow live`,
                ),
              ]),
            ],
          ),
        ],
      );
  },
});

function simplePanel(name, className, renderContent) {
  return defineComponent({
    name,
    props: {
      rows: { type: Array as PropType<any[]>, default: () => [] },
      items: { type: Array as PropType<any[]>, default: () => [] },
      steps: { type: Array as PropType<any[]>, default: () => [] },
      maintenance: { type: Object as PropType<Record<string, any>>, default: null },
      health: { type: Number, default: 0 },
      risk: { type: Number, default: 0 },
      contingency: { type: Object as PropType<Record<string, any>>, default: null },
      fallback: { type: Object as PropType<Record<string, any>>, default: null },
      busbarTemp: { type: Number, default: 44 },
      ambientTemp: { type: Number, default: 24 },
    },
    setup(props) {
      return () => h('div', { class: ['sst-card', className] }, renderContent(props));
    },
  });
}

const LiveStatePanel = simplePanel('LiveStatePanel', 'live-state-card', (props) => [
  h(
    'h2',
    { class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase' },
    'Live State Engine',
  ),
  h(
    'div',
    { class: 'status-list q-pt-none q-pb-md q-px-md' },
    props.items.map((item) =>
      h(
        'div',
        { class: 'status-row relative-position items-center q-py-sm q-px-none text-caption' },
        [
          h('span', { class: ['material-icons', item.tone] }, item.icon),
          h('span', item.label),
          h('strong', { class: ['text-caption text-weight-bold', item.tone] }, item.value),
        ],
      ),
    ),
  ),
]);

const BreakerPanel = simplePanel('BreakerPanel', 'breaker-card', (props) => [
  h(
    'h2',
    { class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase' },
    'Breaker State',
  ),
  h(
    'div',
    { class: 'breaker-list q-pt-none q-pb-md q-px-md' },
    props.rows.map((row) =>
      h('div', { class: 'relative-position items-center q-py-sm q-px-none' }, [
        h('span', row.id),
        h('strong', { class: 'text-caption text-weight-bold' }, row.label),
        h('em', { class: ['text-weight-bold text-right text-uppercase', row.tone] }, row.state),
      ]),
    ),
  ),
]);

const FeederTable = simplePanel('FeederTable', 'feeder-table-card', (props) => [
  h(
    'h2',
    { class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase' },
    'Feeder Telemetry',
  ),
  h('table', { class: 'sst-table full-width' }, [
    h('thead', [
      h('tr', [
        h(
          'th',
          { class: 'q-py-sm q-px-md text-left vertical-middle text-weight-bold text-uppercase' },
          'Feeder',
        ),
        h(
          'th',
          { class: 'q-py-sm q-px-md text-left vertical-middle text-weight-bold text-uppercase' },
          'Load',
        ),
        h(
          'th',
          { class: 'q-py-sm q-px-md text-left vertical-middle text-weight-bold text-uppercase' },
          'Current',
        ),
        h(
          'th',
          { class: 'q-py-sm q-px-md text-left vertical-middle text-weight-bold text-uppercase' },
          'Customers',
        ),
        h(
          'th',
          { class: 'q-py-sm q-px-md text-left vertical-middle text-weight-bold text-uppercase' },
          'Breaker',
        ),
        h(
          'th',
          { class: 'q-py-sm q-px-md text-left vertical-middle text-weight-bold text-uppercase' },
          'Status',
        ),
      ]),
    ]),
    h(
      'tbody',
      props.rows.map((row) =>
        h('tr', [
          h('td', { class: 'q-py-sm q-px-md text-left vertical-middle' }, [
            h('strong', row.id),
            h('span', row.name),
          ]),
          h('td', { class: 'q-py-sm q-px-md text-left vertical-middle' }, `${row.load}%`),
          h('td', { class: 'q-py-sm q-px-md text-left vertical-middle' }, `${row.current} A`),
          h(
            'td',
            { class: 'q-py-sm q-px-md text-left vertical-middle' },
            row.customers.toLocaleString('en-US'),
          ),
          h('td', { class: 'q-py-sm q-px-md text-left vertical-middle' }, row.breaker),
          h('td', { class: 'q-py-sm q-px-md text-left vertical-middle' }, [
            h(
              'em',
              {
                class: [
                  'table-pill row inline no-wrap justify-center q-py-xs q-px-sm text-weight-bold text-uppercase',
                  row.tone,
                ],
              },
              row.status,
            ),
          ]),
        ]),
      ),
    ),
  ]),
]);

const ProtectionPanel = simplePanel('ProtectionPanel', 'protection-card', (props) => [
  h(
    'h2',
    { class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase' },
    'Protection & Relay Logic',
  ),
  h(
    'div',
    { class: 'protection-list q-pt-none q-pb-md q-px-md' },
    props.rows.map((row) =>
      h('div', { class: 'relative-position items-center q-py-sm q-px-none' }, [
        h('span', row.zone),
        h('strong', { class: 'text-caption text-weight-bold' }, row.relay),
        h('small', `${row.pickup} - ${row.latency}`),
        h('em', { class: ['text-weight-bold text-right text-uppercase', row.tone] }, row.status),
      ]),
    ),
  ),
]);

const ContingencyPanel = simplePanel('ContingencyPanel', 'contingency-card', (props) => {
  const data = props.contingency || props.fallback || {};

  return [
    h(
      'h2',
      { class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase' },
      'N-1 Result',
    ),
    h('div', { class: 'contingency-score q-pt-sm q-pb-md q-px-md' }, [
      h('strong', { class: 'block' }, data.risk || 'LOW'),
      h('span', { class: 'text-caption' }, 'Contingency exposure'),
    ]),
    h('div', { class: 'mini-stat-list q-pt-none q-pb-md q-px-md' }, [
      h('div', { class: 'row no-wrap justify-between q-pa-sm rounded-borders' }, [
        h('span', { class: 'block' }, 'Affected customers'),
        h(
          'strong',
          { class: 'block text-body2 text-weight-bold' },
          Number(data.affectedCustomers || 0).toLocaleString('en-US'),
        ),
      ]),
      h('div', { class: 'row no-wrap justify-between q-pa-sm rounded-borders' }, [
        h('span', { class: 'block' }, 'Overloaded assets'),
        h('strong', { class: 'block text-body2 text-weight-bold' }, data.overloadedAssets || 0),
      ]),
      h('div', { class: 'row no-wrap justify-between q-pa-sm rounded-borders' }, [
        h('span', { class: 'block' }, 'Recommended action'),
        h(
          'strong',
          { class: 'block text-body2 text-weight-bold' },
          data.overloadedAssets || 0 ? 'Transfer load' : 'Monitor',
        ),
      ]),
    ]),
  ];
});

const ThermalMapPanel = simplePanel('ThermalMapPanel', 'thermal-card', (props) => [
  h(
    'h2',
    { class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase' },
    'Thermal Field',
  ),
  h(
    'div',
    {
      class:
        'thermal-visual relative-position q-mt-none q-mb-sm q-mx-md overflow-hidden rounded-borders',
      style: { '--heat': `${Math.min(100, props.busbarTemp + props.risk * 0.35)}%` },
    },
    [
      h('div', { class: 'thermal-yard absolute' }, [
        h('i'),
        h('i'),
        h('i'),
        h('i'),
        h('i'),
        h('i'),
      ]),
      h('span', { class: 'hotspot one absolute' }),
      h('span', { class: 'hotspot two absolute' }),
    ],
  ),
  h('div', { class: 'thermal-meta row no-wrap justify-between q-pt-none q-pb-md q-px-md' }, [
    h('span', `Busbar ${props.busbarTemp} C`),
    h('span', `Ambient ${props.ambientTemp} C`),
  ]),
]);

const SwitchingPanel = simplePanel('SwitchingPanel', 'switching-card', (props) => [
  h(
    'h2',
    { class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase' },
    'Switching Scenario',
  ),
  h(
    'div',
    { class: 'step-list q-pt-none q-pb-md q-px-md' },
    props.steps.map((step) =>
      h('div', { class: 'relative-position items-center q-py-sm q-px-none' }, [
        h(
          'em',
          { class: 'text-weight-bold text-right text-uppercase rounded-borders text-center' },
          step.step,
        ),
        h('span', step.label),
        h('strong', { class: ['text-caption text-weight-bold', step.tone] }, step.value),
      ]),
    ),
  ),
]);

const EnvironmentPanel = simplePanel('EnvironmentPanel', 'environment-card', (props) => [
  h(
    'h2',
    { class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase' },
    'Environmental Conditions',
  ),
  h(
    'div',
    { class: 'environment-grid q-pt-xs q-pb-md q-px-md' },
    props.items.map((item) =>
      h('div', { class: 'q-pa-sm rounded-borders text-center' }, [
        h('span', { class: 'material-icons' }, item.icon),
        h('small', item.label),
        h('strong', item.value),
      ]),
    ),
  ),
]);

const CustomerPanel = simplePanel('CustomerPanel', 'customer-card', (props) => [
  h(
    'h2',
    { class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase' },
    'Customer Impact Zones',
  ),
  h(
    'div',
    { class: 'customer-list q-pt-none q-pb-md q-px-md' },
    props.rows.map((row) =>
      h('div', { class: 'relative-position items-center q-py-sm q-px-none' }, [
        h('span', [
          h('strong', { class: 'block' }, row.name),
          h('small', { class: 'block' }, row.type),
        ]),
        h('em', `${row.customers.toLocaleString('en-US')} customers`),
        h('b', { class: ['text-right', row.tone] }, `${row.risk}%`),
      ]),
    ),
  ),
]);

const AnomalyTable = simplePanel('AnomalyTable', 'anomaly-card', (props) => [
  h(
    'h2',
    { class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase' },
    'Anomaly Detection',
  ),
  h('table', { class: 'sst-table full-width' }, [
    h('thead', [
      h('tr', [
        h(
          'th',
          { class: 'q-py-sm q-px-md text-left vertical-middle text-weight-bold text-uppercase' },
          'Parameter',
        ),
        h(
          'th',
          { class: 'q-py-sm q-px-md text-left vertical-middle text-weight-bold text-uppercase' },
          'Current',
        ),
        h(
          'th',
          { class: 'q-py-sm q-px-md text-left vertical-middle text-weight-bold text-uppercase' },
          'Expected',
        ),
        h(
          'th',
          { class: 'q-py-sm q-px-md text-left vertical-middle text-weight-bold text-uppercase' },
          'Deviation',
        ),
        h(
          'th',
          { class: 'q-py-sm q-px-md text-left vertical-middle text-weight-bold text-uppercase' },
          'Status',
        ),
      ]),
    ]),
    h(
      'tbody',
      props.rows.map((row) =>
        h('tr', [
          h('td', { class: 'q-py-sm q-px-md text-left vertical-middle' }, row.parameter),
          h('td', { class: 'q-py-sm q-px-md text-left vertical-middle' }, row.current),
          h('td', { class: 'q-py-sm q-px-md text-left vertical-middle' }, row.expected),
          h('td', { class: 'q-py-sm q-px-md text-left vertical-middle' }, row.deviation),
          h('td', { class: 'q-py-sm q-px-md text-left vertical-middle' }, [
            h(
              'em',
              {
                class: [
                  'table-pill row inline no-wrap justify-center q-py-xs q-px-sm text-weight-bold text-uppercase',
                  row.tone,
                ],
              },
              row.status,
            ),
          ]),
        ]),
      ),
    ),
  ]),
]);

const InsightsPanel = simplePanel('InsightsPanel', 'insights-card', (props) => [
  h(
    'h2',
    { class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase' },
    'Insights & Recommendations',
  ),
  h(
    'div',
    { class: 'insight-list q-pt-none q-pb-md q-px-md' },
    props.items.map((item) =>
      h('div', { class: 'relative-position items-start q-pt-md q-pb-sm q-pr-xl q-pl-none' }, [
        h('span', { class: ['material-icons', item.tone] }, item.icon),
        h('div', [
          h('strong', { class: 'block text-caption text-weight-bold' }, item.title),
          h('small', { class: 'block' }, item.body),
        ]),
        h('em', { class: 'absolute text-right' }, item.time),
      ]),
    ),
  ),
]);

const MaintenanceForecast = simplePanel(
  'MaintenanceForecast',
  'maintenance-forecast-card',
  (props) => [
    h(
      'h2',
      { class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase' },
      'Predictive Maintenance',
    ),
    h('div', { class: 'maintenance-hero q-pa-md rounded-borders q-mt-none q-mb-md q-mx-md' }, [
      h('strong', { class: 'block' }, props.maintenance?.priority || 'Normal'),
      h(
        'span',
        { class: 'block q-mt-sm text-caption' },
        `${props.maintenance?.open || 0} open work orders`,
      ),
      h(
        'em',
        { class: 'block q-mt-sm text-caption' },
        `Next inspection ${props.maintenance?.next || '30 days'}`,
      ),
    ]),
    h('div', { class: 'mini-stat-list q-pt-none q-pb-md q-px-md' }, [
      h('div', { class: 'row no-wrap justify-between q-pa-sm rounded-borders' }, [
        h('span', { class: 'block' }, 'Health'),
        h('strong', { class: 'block text-body2 text-weight-bold' }, `${props.health}%`),
      ]),
      h('div', { class: 'row no-wrap justify-between q-pa-sm rounded-borders' }, [
        h('span', { class: 'block' }, 'Risk'),
        h('strong', { class: 'block text-body2 text-weight-bold' }, `${props.risk}%`),
      ]),
      h('div', { class: 'row no-wrap justify-between q-pa-sm rounded-borders' }, [
        h('span', { class: 'block' }, 'Maintenance mode'),
        h(
          'strong',
          { class: 'block text-body2 text-weight-bold' },
          props.risk > 40 ? 'Condition based' : 'Routine',
        ),
      ]),
    ]),
  ],
);

const AssetHealthPanel = simplePanel('AssetHealthPanel', 'asset-health-card', (props) => [
  h(
    'h2',
    { class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase' },
    'Asset Health Breakdown',
  ),
  h(
    'div',
    { class: 'asset-health-list q-pt-none q-pb-md q-px-md' },
    props.rows.map((row) =>
      h('div', { class: 'q-pb-md' }, [
        h('span', row.asset),
        h('strong', `${row.health}%`),
        h('em', `${row.stress}% stress`),
        h('b', { class: ['absolute', row.tone], style: { width: `${row.health}%` } }),
      ]),
    ),
  ),
]);

const WorkOrderPanel = simplePanel('WorkOrderPanel', 'work-order-card', (props) => [
  h(
    'h2',
    { class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase' },
    'Work Orders',
  ),
  h(
    'div',
    { class: 'work-order-list q-pt-none q-pb-md q-px-md' },
    props.rows.map((row) =>
      h('div', { class: 'relative-position items-center q-py-sm q-px-none' }, [
        h('span', row.id),
        h('strong', { class: 'text-caption text-weight-bold' }, row.title),
        h('small', `${row.owner} - ${row.due}`),
        h('em', { class: ['text-weight-bold text-right text-uppercase', row.tone] }, row.status),
      ]),
    ),
  ),
]);

const InspectionPanel = simplePanel('InspectionPanel', 'inspection-card', (props) => [
  h(
    'h2',
    { class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase' },
    'Inspection Checklist',
  ),
  h(
    'div',
    { class: 'inspection-list q-pt-none q-pb-md q-px-md' },
    props.rows.map((row) =>
      h('div', { class: 'relative-position items-center q-py-sm q-px-none' }, [
        h(
          'span',
          { class: ['material-icons', row.tone] },
          row.state === 'Normal' ? 'check_circle' : 'radio_button_checked',
        ),
        h('strong', { class: 'text-caption text-weight-bold' }, row.label),
        h('em', { class: ['text-weight-bold text-right text-uppercase', row.tone] }, row.state),
      ]),
    ),
  ),
]);

const EventTimeline = simplePanel('EventTimeline', 'event-card', (props) => [
  h(
    'h2',
    { class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase' },
    'Substation Event Timeline',
  ),
  h(
    'div',
    { class: 'event-list q-pt-none q-pb-md q-px-md' },
    props.rows.map((row) =>
      h('div', { class: 'relative-position items-center q-py-sm q-px-none' }, [
        h('time', row.time),
        h('span', { class: ['text-weight-bold', row.tone] }, row.severity),
        h('strong', { class: 'text-caption text-weight-bold' }, row.event),
        h('small', `${row.source} - ${row.detail}`),
      ]),
    ),
  ),
]);
</script>
