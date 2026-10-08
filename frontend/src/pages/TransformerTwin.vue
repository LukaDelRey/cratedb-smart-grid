<template>
  <TransformerTwinShell
    :active-alarms="activeAlarmCount"
    :active-section="activeTabLabel"
    :last-update="lastUpdate"
    :station="station"
    :transformer="transformer"
  >
    <main
      class="tt-scroll scada-min-height-0"
      style="flex: 1"
    >
      <q-banner
        v-if="!station"
        class="bg-blue-grey-10 text-white"
      >
        {{ t('dashboard.noAssetTelemetry') }}
      </q-banner>

      <section
        class="tt-content"
        :class="`tab-${activeTab}`"
      >
        <div class="title-row justify-between row no-wrap">
          <div>
            <h1
              class="q-ma-none text-weight-bold text-h5"
              style="line-height: 1.12; letter-spacing: 0"
            >
              {{ pageTitle }}
            </h1>

            <div class="asset-meta q-mt-sm text-body2 row no-wrap">
              {{ transformer?.substation || 'Substation 110/20kV' }} - 110/20kV - 40 MVA - ONAN
              <span class="online-badge q-py-xs q-px-sm text-weight-bold">Online</span>
            </div>
          </div>

          <div class="time-controls items-center row no-wrap">
            <button
              class="scenario-button items-center q-py-none q-px-md row inline no-wrap rounded-borders"
              style="min-height: 30px"
              type="button"
              @click="scenarioOpen = true"
            >
              <q-icon
                name="science"
                size="17px"
              />
              {{ t('dashboard.runScenario') }}
            </button>

            <template v-if="activeTab === 'analytics'">
              <button
                class="items-center q-py-none q-px-md row inline no-wrap rounded-borders"
                style="min-height: 30px"
                type="button"
              >
                May 14, 2025 - May 20, 2025
              </button>

              <button
                class="active items-center q-py-none q-px-md row inline no-wrap rounded-borders"
                style="min-height: 30px"
                type="button"
              >
                Live Data
              </button>

              <button
                class="items-center q-py-none q-px-md row inline no-wrap rounded-borders"
                style="min-height: 30px"
                type="button"
              >
                Historical
              </button>
            </template>

            <template v-else>
              <button
                class="items-center q-py-none q-px-md row inline no-wrap rounded-borders"
                style="min-height: 30px"
                type="button"
              >
                <span class="range-long">Last 5 minutes</span>

                <span class="range-short">5 min</span>
              </button>

              <button
                aria-label="Refresh"
                class="items-center q-py-none q-px-md row inline no-wrap rounded-borders"
                style="min-height: 30px"
                type="button"
              >
                <q-icon
                  name="refresh"
                  size="17px"
                />
              </button>
            </template>
          </div>
        </div>

        <div class="tab-row items-center q-mb-sm">
          <button
            v-for="tab in tabs"
            class="full-height text-weight-bold text-uppercase cursor-pointer text-caption no-border transparent"
            style="letter-spacing: 0"
            type="button"
            :class="{ active: activeTab === tab.key }"
            :key="tab.key"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <template v-if="activeTab === 'overview'">
          <section
            class="overview-top-grid scada-gap-10 q-mb-sm"
            style="display: grid"
          >
            <div
              class="tt-card measurements-card overflow-hidden"
              style="min-width: 0"
            >
              <h2
                class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                style="letter-spacing: 0"
              >
                Realtime Measurements
              </h2>

              <div class="measurement-list q-pt-xs q-pb-sm q-px-md">
                <div
                  v-for="item in measurementRows"
                  class="items-center text-caption"
                  style="
                    min-height: 36px;
                    grid-template-columns: 23px minmax(0, 1fr) 58px 58px 30px;
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

                  <strong class="text-weight-medium text-right text-subtitle1">
                    {{ item.value }}
                  </strong>

                  <em style="font-size: 11px">{{ item.unit }}</em>
                </div>
              </div>

              <button
                class="text-link row no-wrap items-center q-mt-xs q-mb-sm q-mx-md text-caption no-border transparent"
                type="button"
              >
                View all measurements
                <q-icon name="chevron_right" />
              </button>
            </div>

            <div
              class="tt-card overview-diagram-card overflow-hidden"
              style="
                display: grid;
                grid-template-rows: minmax(0, 1fr) minmax(44px, auto);
                min-width: 0;
              "
            >
              <TransformerTwinDiagram
                compact
                :callouts="overviewCallouts"
                :show-controls="false"
              />

              <div class="diagram-footer items-center q-py-none q-px-lg text-caption">
                <span>
                  Status
                  <strong class="green-pill q-py-xs q-px-sm text-weight-bold q-ml-sm">
                    Online
                  </strong>
                </span>

                <span>
                  Health Score
                  <strong class="green q-ml-sm">{{ healthScore }} /100</strong>
                </span>

                <span>
                  Last Update
                  <strong class="q-ml-sm">{{ lastUpdate }}</strong>
                </span>
              </div>
            </div>

            <div
              class="right-stack"
              style="grid-template-rows: 1fr 1fr"
            >
              <div
                class="tt-card health-card text-center overflow-hidden content-center"
                style="min-width: 0"
              >
                <h2
                  class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                  style="letter-spacing: 0"
                >
                  Transformer Health
                </h2>

                <div class="health-gauge">
                  <strong class="text-h4 text-weight-bold">{{ healthScore }}</strong>

                  <span class="text-caption">/100</span>

                  <em class="text-weight-bold text-caption">Excellent</em>
                </div>

                <p
                  class="q-mt-sm q-mb-none q-mx-none"
                  style="font-size: 11px"
                >
                  Transformer is operating within normal limits
                </p>
              </div>

              <div
                class="tt-card active-alarms-card overflow-hidden"
                style="min-width: 0; grid-template-rows: auto minmax(0, 1fr) auto"
              >
                <div class="card-header items-center justify-between q-pr-md row no-wrap">
                  <h2
                    class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                    style="letter-spacing: 0"
                  >
                    Active Alarms
                  </h2>

                  <span
                    class="alarm-count text-center q-py-xs q-px-sm text-caption text-white"
                    style="min-width: 26px"
                  >
                    {{ alarms.length }}
                  </span>
                </div>

                <div class="compact-alarm-list q-py-none q-px-md">
                  <div
                    v-for="alarm in alarms.slice(0, 5)"
                    :key="alarm.label"
                  >
                    <q-icon
                      :class="alarm.severity"
                      :name="alarm.icon"
                    />

                    <span>{{ alarm.label }}</span>

                    <small>{{ alarm.time }}</small>
                  </div>
                </div>

                <button
                  class="text-link row no-wrap items-center q-mt-xs q-mb-sm q-mx-md text-caption no-border transparent"
                  type="button"
                >
                  View all alarms
                  <q-icon name="chevron_right" />
                </button>
              </div>
            </div>
          </section>

          <section class="overview-chart-grid q-mb-sm">
            <TrendPanel
              legend-a="Load (%)"
              legend-b="Power (MW)"
              title="Load & Power"
              :footer="[
                ['Load', `${loadPct} %`],
                ['Power', `${activePower} MW`],
              ]"
              :seed="loadPct"
            />

            <TrendPanel
              legend-a="Top Oil (C)"
              legend-b="Winding H (C)"
              title="Oil & Temperatures"
              :footer="[
                ['Top Oil', `${oilTemp} C`],
                ['Winding H', `${windingTemp} C`],
                ['Winding L', `${round1(windingTemp - 6.3)} C`],
                ['Bottom Oil', `${round1(oilTemp - 4.2)} C`],
              ]"
              :seed="oilTemp"
            />

            <TrendPanel
              legend-a="Voltage (kV)"
              legend-b="Current (A)"
              title="Voltage & Current"
              :footer="[
                ['Primary Voltage', `${primaryVoltage} kV`],
                ['Secondary Voltage', `${secondaryVoltage} kV`],
                ['Current', `${loadCurrent} A`],
              ]"
              :seed="primaryVoltage"
            />

            <TrendPanel
              legend-a="Actual"
              legend-b="Forecast"
              title="AI Forecast (Next 24h)"
              :seed="loadPct + 12"
              :side-stats="[
                ['Peak Load', '85 %'],
                ['Confidence', '87 %'],
              ]"
            />
          </section>

          <section class="overview-bottom-grid">
            <div
              class="tt-card overflow-hidden"
              style="min-width: 0"
            >
              <h2
                class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                style="letter-spacing: 0"
              >
                Sensor Status
              </h2>

              <table class="tt-table full-width">
                <thead>
                  <tr>
                    <th class="q-py-sm q-px-md text-left text-no-wrap text-weight-medium">
                      Sensor
                    </th>

                    <th class="q-py-sm q-px-md text-left text-no-wrap text-weight-medium">Value</th>

                    <th class="q-py-sm q-px-md text-left text-no-wrap text-weight-medium">Unit</th>

                    <th class="q-py-sm q-px-md text-left text-no-wrap text-weight-medium">
                      Status
                    </th>

                    <th class="q-py-sm q-px-md text-left text-no-wrap text-weight-medium">Trend</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="row in sensorRows"
                    :key="row.sensor"
                  >
                    <td class="q-py-sm q-px-md text-left text-no-wrap">{{ row.sensor }}</td>

                    <td class="q-py-sm q-px-md text-left text-no-wrap">{{ row.value }}</td>

                    <td class="q-py-sm q-px-md text-left text-no-wrap">{{ row.unit }}</td>

                    <td class="q-py-sm q-px-md text-left text-no-wrap">
                      <span
                        class="status-ok q-py-xs q-px-sm"
                        :class="{ warning: row.status === 'Warning' }"
                      >
                        {{ row.status }}
                      </span>
                    </td>

                    <td class="q-py-sm q-px-md text-left text-no-wrap">
                      <SparkLine
                        :seed="row.trend"
                        :tone="row.status === 'Warning' ? 'yellow' : 'green'"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              class="tt-card dga-card overflow-hidden"
              style="min-width: 0"
            >
              <h2
                class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                style="letter-spacing: 0"
              >
                Gas Analysis (DGA)
              </h2>

              <div class="dga-layout items-center">
                <table class="tt-table full-width">
                  <tbody>
                    <tr
                      v-for="gas in gasRows.slice(0, 5)"
                      :key="gas.gas"
                    >
                      <td class="q-py-sm q-px-md text-left text-no-wrap">{{ gas.gas }}</td>

                      <td class="q-py-sm q-px-md text-left text-no-wrap">{{ gas.value }}</td>

                      <td class="q-py-sm q-px-md text-left text-no-wrap">{{ gas.unit }}</td>

                      <td class="q-py-sm q-px-md text-left text-no-wrap">
                        <span class="status-ok q-py-xs q-px-sm">Normal</span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div class="donut small">
                  <strong class="text-weight-medium text-caption">DGA</strong>

                  <span class="text-weight-bold">Normal</span>
                </div>
              </div>
            </div>

            <div
              class="tt-card overflow-hidden"
              style="min-width: 0"
            >
              <h2
                class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                style="letter-spacing: 0"
              >
                Events Log
              </h2>

              <table class="tt-table full-width">
                <tbody>
                  <tr
                    v-for="event in eventRows"
                    :key="event.event"
                  >
                    <td class="q-py-sm q-px-md text-left text-no-wrap">{{ event.time }}</td>

                    <td class="q-py-sm q-px-md text-left text-no-wrap">{{ event.event }}</td>

                    <td
                      class="q-py-sm q-px-md text-left text-no-wrap"
                      :class="event.severityClass"
                    >
                      {{ event.severity }}
                    </td>

                    <td class="q-py-sm q-px-md text-left text-no-wrap">TR-01</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>

        <template v-else-if="activeTab === 'digital'">
          <section class="digital-grid">
            <aside class="left-column content-start">
              <div
                class="tt-card live-status-card overflow-hidden"
                style="min-width: 0"
              >
                <h2
                  class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                  style="letter-spacing: 0"
                >
                  Live Status
                </h2>

                <div class="status-list q-pt-xs q-pb-md q-px-md">
                  <div
                    v-for="item in liveStatus"
                    class="status-row items-center text-caption"
                    style="min-height: 35px; grid-template-columns: 24px minmax(0, 1fr) auto"
                    :key="item.label"
                  >
                    <q-icon
                      size="18px"
                      :class="item.tone"
                      :name="item.icon"
                    />

                    <span>{{ item.label }}</span>

                    <strong
                      class="text-weight-bold"
                      :class="item.tone"
                    >
                      {{ item.value }}
                    </strong>
                  </div>
                </div>
              </div>

              <div
                class="tt-card overflow-hidden"
                style="min-width: 0"
              >
                <h2
                  class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                  style="letter-spacing: 0"
                >
                  Component Status
                </h2>

                <div
                  class="component-list q-pt-none q-pb-md q-px-md"
                  style="gap: 5px"
                >
                  <div
                    v-for="component in componentStatuses"
                    class="justify-between text-caption row no-wrap"
                    :key="component"
                  >
                    <span>{{ component }}</span>

                    <strong class="text-weight-medium">
                      <i
                        class="inline-block q-mr-sm"
                        style="width: 7px; height: 7px"
                      />
                      OK
                    </strong>
                  </div>
                </div>
              </div>
            </aside>

            <TransformerTwinDiagram
              class="center-diagram"
              :callouts="digitalCallouts"
            />

            <aside class="right-column content-start">
              <div
                class="tt-card heat-card overflow-hidden"
                style="min-width: 0"
              >
                <h2
                  class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                  style="letter-spacing: 0"
                >
                  Temperature Distribution
                </h2>

                <div
                  class="heatmap-visual overflow-hidden q-mt-none q-mb-md q-mx-md"
                  style="min-height: 178px; box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.28)"
                >
                  <img
                    alt="Transformer temperature distribution"
                    class="absolute"
                    src="../assets/transformer-twin/power-transformer.png"
                    style="width: 76%; height: 82%"
                  />

                  <div
                    class="temperature-scale absolute scada-text-primary"
                    style="
                      top: 20px;
                      right: 14px;
                      bottom: 20px;
                      display: grid;
                      grid-template-rows: auto 1fr auto;
                      gap: 7px;
                      font-size: 11px;
                    "
                  >
                    <span>90 C</span>

                    <i style="width: 13px" />

                    <span>40 C</span>
                  </div>
                </div>
              </div>

              <div
                class="tt-card overflow-hidden"
                style="min-width: 0"
              >
                <div class="card-header items-center justify-between q-pr-md row no-wrap">
                  <h2
                    class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                    style="letter-spacing: 0"
                  >
                    Loading Trend (24h)
                  </h2>

                  <div class="legend">
                    <span class="items-center row no-wrap">
                      <i
                        class="actual block"
                        style="width: 15px; height: 4px"
                      />
                      Actual Load
                    </span>

                    <span class="items-center row no-wrap">
                      <i
                        class="forecast block"
                        style="width: 15px; height: 4px"
                      />
                      Forecasted Load
                    </span>
                  </div>
                </div>

                <TransformerTwinMiniChart :seed="loadPct" />
              </div>

              <AgeingCard />

              <EnvironmentCard :items="environment" />
            </aside>
          </section>

          <section class="digital-bottom-grid q-mt-sm">
            <MetricCard
              title="Real-time Parameters"
              :metrics="realtimeParameters"
            />

            <MetricCard
              title="Simulation & Prediction"
              :metrics="simulationMetrics"
            />
          </section>
        </template>

        <template v-else-if="activeTab === 'analytics'">
          <section class="analytics-kpi-grid q-mb-sm">
            <div
              v-for="metric in analyticsKpis"
              class="tt-card kpi-card overflow-hidden items-center q-pa-md row no-wrap"
              style="min-width: 0; min-height: 88px"
              :key="metric.label"
            >
              <q-icon
                size="34px"
                :class="metric.tone"
                :name="metric.icon"
              />

              <div>
                <span class="block text-caption">{{ metric.label }}</span>

                <strong class="block q-mt-xs text-weight-medium text-h5">
                  {{ metric.value }}
                  <em class="text-body2">{{ metric.unit }}</em>
                </strong>

                <small
                  class="block"
                  :class="metric.tone"
                >
                  {{ metric.status }}
                </small>
              </div>
            </div>
          </section>

          <section class="analytics-chart-grid q-mb-sm">
            <TrendPanel
              legend-a="Load (%)"
              legend-b="Power (MW)"
              title="Load & Power Trend"
              :seed="loadPct"
              :values="historyLoadSeries"
            />

            <TrendPanel
              legend-a="Top Oil (C)"
              legend-b="Winding H (C)"
              title="Temperature Analysis"
              :seed="oilTemp + 16"
              :values="historyThermalSeries"
            />

            <TrendPanel
              legend-a="Actual Load"
              legend-b="Forecast"
              title="Load Forecast (Next 7 Days)"
              :seed="loadPct + 14"
              :side-stats="[
                ['Peak Load (Pred.)', '85 %'],
                ['Confidence', '87 %'],
              ]"
            />
          </section>

          <section
            class="analytics-mid-grid scada-gap-10 q-mb-sm"
            style="display: grid"
          >
            <div
              class="tt-card loss-card overflow-hidden"
              style="min-width: 0"
            >
              <h2
                class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                style="letter-spacing: 0"
              >
                Loss Analysis
              </h2>

              <div class="loss-layout items-center">
                <div class="donut">
                  <strong class="text-weight-medium text-caption">Total Loss</strong>

                  <span class="text-weight-bold">2.45 MW</span>
                </div>

                <div class="loss-list text-caption">
                  <div
                    class="items-start"
                    style="grid-template-columns: 14px minmax(0, 1fr); line-height: 1.3"
                  >
                    <i
                      class="blue q-mt-xs"
                      style="width: 9px; height: 9px"
                    />

                    <span
                      class="block"
                      style="min-width: 0"
                    >
                      <em
                        class="block"
                        style="min-width: 0"
                      >
                        No-load Loss
                      </em>

                      <strong
                        class="block text-weight-medium"
                        style="min-width: 0"
                      >
                        0.45 MW (18%)
                      </strong>
                    </span>
                  </div>

                  <div
                    class="items-start"
                    style="grid-template-columns: 14px minmax(0, 1fr); line-height: 1.3"
                  >
                    <i
                      class="green-bg q-mt-xs"
                      style="background: #35dc58; width: 9px; height: 9px"
                    />

                    <span
                      class="block"
                      style="min-width: 0"
                    >
                      <em
                        class="block"
                        style="min-width: 0"
                      >
                        Load Loss
                      </em>

                      <strong
                        class="block text-weight-medium"
                        style="min-width: 0"
                      >
                        1.65 MW (67%)
                      </strong>
                    </span>
                  </div>

                  <div
                    class="items-start"
                    style="grid-template-columns: 14px minmax(0, 1fr); line-height: 1.3"
                  >
                    <i
                      class="orange-bg q-mt-xs"
                      style="background: #ed7b2f; width: 9px; height: 9px"
                    />

                    <span
                      class="block"
                      style="min-width: 0"
                    >
                      <em
                        class="block"
                        style="min-width: 0"
                      >
                        Stray Loss
                      </em>

                      <strong
                        class="block text-weight-medium"
                        style="min-width: 0"
                      >
                        0.20 MW (8%)
                      </strong>
                    </span>
                  </div>

                  <div
                    class="items-start"
                    style="grid-template-columns: 14px minmax(0, 1fr); line-height: 1.3"
                  >
                    <i
                      class="purple-bg q-mt-xs"
                      style="background: #8752c9; width: 9px; height: 9px"
                    />

                    <span
                      class="block"
                      style="min-width: 0"
                    >
                      <em
                        class="block"
                        style="min-width: 0"
                      >
                        Other Loss
                      </em>

                      <strong
                        class="block text-weight-medium"
                        style="min-width: 0"
                      >
                        0.15 MW (6%)
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="tt-card overflow-hidden"
              style="min-width: 0"
            >
              <h2
                class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                style="letter-spacing: 0"
              >
                DGA (Dissolved Gas Analysis)
              </h2>

              <table class="tt-table full-width">
                <tbody>
                  <tr
                    v-for="gas in gasRows"
                    :key="gas.gas"
                  >
                    <td class="q-py-sm q-px-md text-left text-no-wrap">{{ gas.gas }}</td>

                    <td class="q-py-sm q-px-md text-left text-no-wrap">{{ gas.value }}</td>

                    <td class="q-py-sm q-px-md text-left text-no-wrap">{{ gas.unit }}</td>

                    <td class="q-py-sm q-px-md text-left text-no-wrap">
                      <span class="status-ok q-py-xs q-px-sm">Normal</span>
                    </td>

                    <td class="q-py-sm q-px-md text-left text-no-wrap">
                      <SparkLine
                        tone="green"
                        :seed="gas.trend"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <AgeingCard />

            <div
              class="tt-card correlation-card overflow-hidden"
              style="min-width: 0"
            >
              <h2
                class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                style="letter-spacing: 0"
              >
                Correlation Analysis
              </h2>

              <div class="scatter overflow-hidden q-mt-xs q-mb-md q-mx-md">
                <i
                  v-for="index in 48"
                  class="absolute"
                  style="width: 4px; height: 4px"
                  :key="index"
                  :style="scatterStyle(index)"
                />
              </div>

              <div
                class="correlation-score absolute q-pa-sm"
                style="
                  top: 44px;
                  right: 15px;
                  width: 128px;
                  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.32);
                "
              >
                <span
                  class="block"
                  style="font-size: 11px"
                >
                  Correlation Coefficient
                </span>

                <strong class="block text-weight-medium text-h5">0.78</strong>

                <em
                  class="block"
                  style="font-size: 11px"
                >
                  Strong Positive
                </em>
              </div>
            </div>
          </section>

          <section class="analytics-bottom-grid">
            <div
              class="tt-card overflow-hidden"
              style="min-width: 0"
            >
              <h2
                class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                style="letter-spacing: 0"
              >
                Anomaly Detection
              </h2>

              <table class="tt-table full-width">
                <thead>
                  <tr>
                    <th class="q-py-sm q-px-md text-left text-no-wrap text-weight-medium">
                      Parameter
                    </th>

                    <th class="q-py-sm q-px-md text-left text-no-wrap text-weight-medium">
                      Current Value
                    </th>

                    <th class="q-py-sm q-px-md text-left text-no-wrap text-weight-medium">
                      Expected Range
                    </th>

                    <th class="q-py-sm q-px-md text-left text-no-wrap text-weight-medium">
                      Deviation
                    </th>

                    <th class="q-py-sm q-px-md text-left text-no-wrap text-weight-medium">
                      Status
                    </th>

                    <th class="q-py-sm q-px-md text-left text-no-wrap text-weight-medium">
                      Detected At
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="row in anomalyRows"
                    :key="row.parameter"
                  >
                    <td class="q-py-sm q-px-md text-left text-no-wrap">{{ row.parameter }}</td>

                    <td class="q-py-sm q-px-md text-left text-no-wrap">{{ row.value }}</td>

                    <td class="q-py-sm q-px-md text-left text-no-wrap">{{ row.range }}</td>

                    <td class="q-py-sm q-px-md text-left text-no-wrap">{{ row.deviation }}</td>

                    <td class="q-py-sm q-px-md text-left text-no-wrap">
                      <span class="status-ok q-py-xs q-px-sm">Normal</span>
                    </td>

                    <td class="q-py-sm q-px-md text-left text-no-wrap">May 20, 14:31:55</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              class="tt-card insights-card overflow-hidden"
              style="min-width: 0"
            >
              <h2
                class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                style="letter-spacing: 0"
              >
                Insights & Recommendations
              </h2>

              <div class="insight-list q-pt-none q-pb-md q-px-md">
                <div
                  v-for="insight in insights"
                  class="relative-position q-pt-md q-pb-sm q-pr-xl q-pl-none items-start"
                  style="min-height: 61px; grid-template-columns: 34px minmax(0, 1fr)"
                  :key="insight.title"
                >
                  <q-icon
                    size="28px"
                    :class="insight.tone"
                    :name="insight.icon"
                  />

                  <div style="min-width: 0">
                    <strong
                      class="block text-caption"
                      style="line-height: 1.3"
                    >
                      {{ insight.title }}
                    </strong>

                    <span
                      class="block"
                      style="font-size: 11px; line-height: 1.35"
                    >
                      {{ insight.body }}
                    </span>
                  </div>

                  <small
                    class="absolute text-right"
                    style="font-size: 11px; line-height: 1.35; width: 102px"
                  >
                    {{ insight.time }}
                  </small>
                </div>
              </div>
            </div>
          </section>
        </template>

        <template v-else-if="activeTab === 'schematic'">
          <section
            class="schematic-grid scada-gap-10"
            style="display: grid"
          >
            <div
              class="tt-card schematic-diagram-card overflow-hidden"
              style="min-height: 580px; min-width: 0"
            >
              <div class="card-header items-center justify-between q-pr-md row no-wrap">
                <h2
                  class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                  style="letter-spacing: 0"
                >
                  Transformer Protection Schematic
                </h2>

                <div class="legend">
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
                    Protection zone
                  </span>
                </div>
              </div>

              <div class="single-line-diagram q-pa-md">
                <svg
                  aria-label="Transformer single-line schematic"
                  class="full-height block full-width"
                  role="img"
                  style="min-height: 500px"
                  viewBox="0 0 760 430"
                >
                  <defs>
                    <filter
                      height="180%"
                      id="schematicGlow"
                      width="180%"
                      x="-40%"
                      y="-40%"
                    >
                      <feGaussianBlur
                        result="blur"
                        stdDeviation="3"
                      />

                      <feMerge>
                        <feMergeNode in="blur" />

                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <path
                    class="diagram-grid-line"
                    d="M80 60H700M80 140H700M80 220H700M80 300H700M80 380H700"
                    style="fill: none; stroke: rgba(116, 155, 188, 0.07); stroke-width: 1"
                  />

                  <path
                    class="energized-line"
                    d="M70 80H230V178"
                  />

                  <path
                    class="energized-line"
                    d="M530 252V350H690"
                  />

                  <path
                    class="aux-line"
                    d="M230 178H530M230 252H530"
                    style="stroke-dasharray: 10 8"
                  />

                  <path
                    class="zone-ring"
                    d="M242 155H518V275H242Z"
                    style="
                      fill: rgba(64, 196, 255, 0.035);
                      stroke: rgba(64, 196, 255, 0.32);
                      stroke-width: 2;
                      stroke-dasharray: 8 8;
                    "
                  />

                  <g
                    class="breaker-symbol"
                    transform="translate(154 80)"
                  >
                    <rect
                      height="36"
                      rx="5"
                      width="56"
                      x="-28"
                      y="-18"
                    />

                    <path d="M-16 12L18 -12" />
                  </g>

                  <g
                    class="breaker-symbol"
                    transform="translate(608 350)"
                  >
                    <rect
                      height="36"
                      rx="5"
                      width="56"
                      x="-28"
                      y="-18"
                    />

                    <path d="M-16 12L18 -12" />
                  </g>

                  <g
                    class="transformer-symbol"
                    transform="translate(380 215)"
                  >
                    <circle
                      cx="-38"
                      cy="0"
                      r="52"
                    />

                    <circle
                      cx="38"
                      cy="0"
                      r="52"
                    />

                    <text
                      class="text-weight-bold text-subtitle1"
                      x="0"
                      y="-82"
                    >
                      TR {{ transformer?.id || route.params.id }}
                    </text>

                    <text
                      class="text-weight-bold text-subtitle1"
                      x="0"
                      y="92"
                    >
                      {{ loadPct }}% load / {{ healthScore }} health
                    </text>
                  </g>

                  <g
                    class="schematic-label"
                    transform="translate(74 56)"
                  >
                    <text class="text-weight-bold text-body2">HV bus 110 kV</text>

                    <text
                      class="text-weight-bold text-body2"
                      y="22"
                    >
                      {{ primaryVoltage }} kV
                    </text>
                  </g>

                  <g
                    class="schematic-label"
                    transform="translate(582 322)"
                  >
                    <text class="text-weight-bold text-body2">LV bus 20 kV</text>

                    <text
                      class="text-weight-bold text-body2"
                      y="22"
                    >
                      {{ secondaryVoltage }} kV
                    </text>
                  </g>

                  <g
                    class="relay-node differential"
                    transform="translate(260 116)"
                  >
                    <circle r="18" />

                    <text
                      class="text-weight-bold text-caption"
                      y="5"
                    >
                      87T
                    </text>
                  </g>

                  <g
                    class="relay-node thermal"
                    transform="translate(502 116)"
                  >
                    <circle r="18" />

                    <text
                      class="text-weight-bold text-caption"
                      y="5"
                    >
                      49
                    </text>
                  </g>

                  <g
                    class="relay-node gas"
                    transform="translate(260 314)"
                  >
                    <circle r="18" />

                    <text
                      class="text-weight-bold text-caption"
                      y="5"
                    >
                      63
                    </text>
                  </g>

                  <g
                    class="relay-node ground"
                    transform="translate(502 314)"
                  >
                    <circle r="18" />

                    <text
                      class="text-weight-bold text-caption"
                      y="5"
                    >
                      51N
                    </text>
                  </g>
                </svg>
              </div>
            </div>

            <aside class="schematic-side content-start">
              <MetricCard
                title="Protection State"
                :metrics="schematicMetrics"
              />

              <div
                class="tt-card overflow-hidden"
                style="min-width: 0"
              >
                <h2
                  class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                  style="letter-spacing: 0"
                >
                  Relay & Interlock Chain
                </h2>

                <div class="protection-chain q-pt-none q-pb-md q-px-md">
                  <div
                    v-for="step in protectionStages"
                    class="items-center"
                    style="min-height: 44px; grid-template-columns: 42px minmax(0, 1fr) 74px"
                    :key="step.code"
                  >
                    <span class="text-weight-bolder">{{ step.code }}</span>

                    <strong class="text-caption">{{ step.label }}</strong>

                    <em
                      class="text-weight-bolder text-right text-uppercase"
                      style="font-size: 10px"
                      :class="step.tone"
                    >
                      {{ step.state }}
                    </em>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </template>

        <template v-else-if="activeTab === 'maintenance'">
          <section class="maintenance-grid q-mb-sm">
            <div
              class="tt-card maintenance-hero-card overflow-hidden content-start"
              style="min-width: 0"
            >
              <h2
                class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                style="letter-spacing: 0"
              >
                Predictive Maintenance
              </h2>

              <div class="maintenance-hero q-mt-none q-mb-sm q-mx-md q-pa-md rounded-borders">
                <strong
                  class="block text-h4 text-weight-bold"
                  style="line-height: 1"
                >
                  {{ maintenancePriority }}
                </strong>

                <span
                  class="block"
                  style="font-size: 11px; line-height: 1.35"
                >
                  {{ Math.max(12, Math.round((100 - riskScore) / 2)) }} days to recommended service
                  window
                </span>

                <em
                  class="block"
                  style="font-size: 11px; line-height: 1.35"
                >
                  Driven by load, DGA, thermal stress and ageing factor
                </em>
              </div>

              <AgeingCard />
            </div>

            <div
              class="tt-card overflow-hidden"
              style="min-width: 0"
            >
              <h2
                class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                style="letter-spacing: 0"
              >
                Maintenance Plan
              </h2>

              <div class="maintenance-plan q-pt-none q-pb-md q-px-md">
                <div
                  v-for="item in maintenancePlan"
                  class="items-center q-py-sm q-px-none items-start"
                  style="min-height: 44px; grid-template-columns: 28px minmax(0, 1fr) 62px"
                  :key="item.title"
                >
                  <q-icon
                    size="24px"
                    :class="item.tone"
                    :name="item.icon"
                  />

                  <span
                    class="block"
                    style="min-width: 0"
                  >
                    <strong
                      class="block text-caption"
                      style="min-width: 0"
                    >
                      {{ item.title }}
                    </strong>

                    <small
                      class="block"
                      style="font-size: 11px; line-height: 1.35; min-width: 0"
                    >
                      {{ item.body }}
                    </small>
                  </span>

                  <em
                    class="text-weight-bolder text-right"
                    style="font-size: 11px"
                  >
                    {{ item.due }}
                  </em>
                </div>
              </div>
            </div>

            <div
              class="tt-card overflow-hidden"
              style="min-width: 0"
            >
              <h2
                class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                style="letter-spacing: 0"
              >
                Inspection Checklist
              </h2>

              <div class="inspection-list q-pt-none q-pb-md q-px-md">
                <div
                  v-for="item in inspectionChecklist"
                  class="items-center"
                  style="min-height: 44px; grid-template-columns: 26px minmax(0, 1fr) 68px"
                  :key="item.label"
                >
                  <q-icon
                    size="22px"
                    :class="item.tone"
                    :name="item.icon"
                  />

                  <span class="text-caption">{{ item.label }}</span>

                  <strong
                    class="text-weight-bolder text-right text-uppercase"
                    style="font-size: 10px"
                    :class="item.tone"
                  >
                    {{ item.state }}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          <section
            class="maintenance-bottom-grid scada-gap-10"
            style="display: grid"
          >
            <TrendPanel
              legend-a="Observed"
              legend-b="Projected"
              title="Degradation Projection"
              :seed="ageingFactor + 31"
              :side-stats="[
                ['RUL', `${round1((healthScore / 100) * 28.7)} years`],
                ['Failure Risk', `${riskScore}%`],
              ]"
            />

            <TrendPanel
              legend-a="Hydrogen"
              legend-b="Acetylene"
              title="DGA Watch Trend"
              :footer="gasRows.slice(0, 4).map((gas) => [gas.gas, `${gas.value} ${gas.unit}`])"
              :seed="gasRows[0].trend + gasRows[3].trend"
            />
          </section>
        </template>

        <template v-else>
          <section class="events-grid">
            <div
              class="tt-card overflow-hidden"
              style="min-width: 0"
            >
              <h2
                class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                style="letter-spacing: 0"
              >
                Event Timeline
              </h2>

              <div class="event-timeline q-pt-none q-pb-md q-px-md">
                <div
                  v-for="event in eventTimeline"
                  class="items-center"
                  style="
                    min-height: 44px;
                    grid-template-columns: 58px 64px minmax(0, 0.7fr) minmax(0, 1.3fr);
                  "
                  :key="`${event.time}-${event.title}`"
                >
                  <time style="font-size: 11px">{{ event.time }}</time>

                  <span
                    class="text-weight-bolder text-right text-uppercase text-left"
                    style="font-size: 10px"
                    :class="event.tone"
                  >
                    {{ event.severity }}
                  </span>

                  <strong class="text-caption">{{ event.title }}</strong>

                  <small style="font-size: 11px; line-height: 1.35">{{ event.detail }}</small>
                </div>
              </div>
            </div>

            <div
              class="tt-card overflow-hidden"
              style="min-width: 0"
            >
              <h2
                class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                style="letter-spacing: 0"
              >
                Alarm Lifecycle
              </h2>

              <div class="alarm-lifecycle q-pt-none q-pb-md q-px-md">
                <div
                  v-for="alarm in alarms.slice(0, 5)"
                  class="items-center q-py-sm q-px-none items-start"
                  style="min-height: 44px; grid-template-columns: 28px minmax(0, 1fr)"
                  :key="alarm.label"
                >
                  <q-icon
                    size="22px"
                    :class="alarm.severity"
                    :name="alarm.icon"
                  />

                  <span
                    class="block"
                    style="min-width: 0"
                  >
                    <strong
                      class="block text-caption"
                      style="min-width: 0"
                    >
                      {{ alarm.label }}
                    </strong>

                    <small
                      class="block"
                      style="font-size: 11px; line-height: 1.35; min-width: 0"
                    >
                      {{ alarm.time }} -
                      {{
                        alarm.severity === 'critical'
                          ? 'requires operator action'
                          : 'watch condition'
                      }}
                    </small>
                  </span>
                </div>
              </div>
            </div>

            <div
              class="tt-card insights-card overflow-hidden"
              style="min-width: 0"
            >
              <h2
                class="q-ma-none q-pt-md q-pb-sm q-px-md text-weight-bold text-uppercase text-body2"
                style="letter-spacing: 0"
              >
                Operator Notes
              </h2>

              <div class="insight-list q-pt-none q-pb-md q-px-md">
                <div
                  v-for="insight in eventInsights"
                  class="relative-position q-pt-md q-pb-sm q-pr-xl q-pl-none items-start"
                  style="min-height: 61px; grid-template-columns: 34px minmax(0, 1fr)"
                  :key="insight.title"
                >
                  <q-icon
                    size="28px"
                    :class="insight.tone"
                    :name="insight.icon"
                  />

                  <div style="min-width: 0">
                    <strong
                      class="block text-caption"
                      style="line-height: 1.3"
                    >
                      {{ insight.title }}
                    </strong>

                    <span
                      class="block"
                      style="font-size: 11px; line-height: 1.35"
                    >
                      {{ insight.body }}
                    </span>
                  </div>

                  <small
                    class="absolute text-right"
                    style="font-size: 11px; line-height: 1.35; width: 102px"
                  >
                    {{ insight.time }}
                  </small>
                </div>
              </div>
            </div>
          </section>
        </template>
      </section>
    </main>

    <ScenarioControlDialog
      v-model="scenarioOpen"
      default-type="overload"
      :station-id="station?.station_id"
    />
  </TransformerTwinShell>
</template>

<script setup lang="ts">
// Keep component selector isolation for the shared stylesheet.
defineOptions({ __scopeId: 'data-v-ui-85eaccb8' });

import { thresholdValue } from '../stores/thresholdSettings';
import { computed, defineComponent, h, onMounted, ref } from 'vue';
import type { PropType } from 'vue';
import { useRoute } from 'vue-router';
import { useSensorStore } from '../stores/sensorStore';
import { humanizeAssetKey as alarmLabel } from '../utils/assets';
import { round1 } from '../utils/numbers';
import TransformerTwinShell from '../components/transformer-twin/TransformerTwinShell.vue';
import TransformerTwinDiagram from '../components/transformer-twin/TransformerTwinDiagram.vue';
import TransformerTwinMiniChart from '../components/transformer-twin/TransformerTwinMiniChart.vue';
import ScenarioControlDialog from '../components/scenarios/ScenarioControlDialog.vue';
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
  { key: 'schematic', label: 'Schematic' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'events', label: 'Events' },
];

const transformer = computed(() => store.getTransformerById(route.params.id));

const station = computed(() =>
  transformer.value?.substation ? store.getSubstationById(transformer.value.substation) : null,
);

const stationHistory = useStationHistory(() => station.value?.station_id);

const historyLoadSeries = stationHistory.series((point) => {
  const current = point.electrical?.current_a;

  return Number.isFinite(current) ? Math.max(0, Math.min(100, Number(current) / 6)) : null;
});

const historyThermalSeries = stationHistory.series((point) => point.thermal?.oil_temp_c);

const activeTabLabel = computed(
  () => tabs.find((tab) => tab.key === activeTab.value)?.label || 'Overview',
);

const pageTitle = computed(() =>
  activeTab.value === 'analytics'
    ? `Analytics - Transformer ${transformer.value?.id || route.params.id}`
    : activeTab.value === 'digital'
      ? `Digital Twin - Transformer ${transformer.value?.id || route.params.id}`
      : `Transformer ${transformer.value?.id || route.params.id}`,
);

const activeAlarmCount = computed(() => store.summary?.activeAlarms || store.alarms?.length || 0);

const lastUpdate = computed(() =>
  new Date().toLocaleTimeString('hr-HR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }),
);

const loadPct = computed(() => transformer.value?.loadPct ?? 0);

const oilTemp = computed(() => round1(transformer.value?.oilTemp ?? 0));

const windingTemp = computed(() => round1(transformer.value?.windingTemp ?? 0));

const primaryVoltage = computed(() =>
  round1(station.value?.electrical?.voltage_v ? station.value.electrical.voltage_v / 1000 : 110.2),
);

const secondaryVoltage = computed(() => round1(primaryVoltage.value / 5.48));

const loadCurrent = computed(() => round1(loadPct.value * 4.34));

const activePower = computed(() => round1(loadPct.value * 0.303));

const apparentPower = computed(() => round1(activePower.value / 0.9));

const healthScore = computed(() => transformer.value?.healthScore ?? 0);

const riskScore = computed(() => transformer.value?.failureProbability ?? 0);

const ageingFactor = computed(() =>
  Math.max(8, Math.round(100 - healthScore.value + riskScore.value)),
);

const measurementRows = computed(() => [
  {
    label: 'Primary Voltage (L-L)',
    value: primaryVoltage.value,
    unit: 'kV',
    icon: 'bolt',
    tone: 'green',
    spark: 71,
  },
  {
    label: 'Secondary Voltage (L-L)',
    value: secondaryVoltage.value,
    unit: 'kV',
    icon: 'electrical_services',
    tone: 'green',
    spark: 47,
  },
  {
    label: 'Load Current',
    value: loadCurrent.value,
    unit: 'A',
    icon: 'warning',
    tone: 'yellow',
    spark: 83,
  },
  {
    label: 'Active Power',
    value: activePower.value,
    unit: 'MW',
    icon: 'offline_bolt',
    tone: 'yellow',
    spark: 62,
  },
  {
    label: 'Apparent Power',
    value: apparentPower.value,
    unit: 'MVA',
    icon: 'data_usage',
    tone: 'cyan',
    spark: 54,
  },
  { label: 'Power Factor', value: '0.90', unit: 'PF', icon: 'speed', tone: 'cyan', spark: 36 },
  {
    label: 'Frequency',
    value: '50.02',
    unit: 'Hz',
    icon: 'settings_input_component',
    tone: 'green',
    spark: 28,
  },
]);

const liveStatus = computed(() => [
  { label: 'Load', value: `${loadPct.value} %`, icon: 'show_chart', tone: 'cyan' },
  {
    label: 'Health Score',
    value: `${healthScore.value} /100`,
    icon: 'health_and_safety',
    tone: 'green',
  },
  { label: 'Temperature', value: `${oilTemp.value} C`, icon: 'device_thermostat', tone: 'white' },
  { label: 'Oil Level', value: 'Normal', icon: 'oil_barrel', tone: 'green' },
  { label: 'Pressure', value: '0.25 bar', icon: 'speed', tone: 'white' },
  { label: 'Cooling System', value: 'Active', icon: 'settings_input_component', tone: 'green' },
  { label: 'Tap Position', value: '5 (Neutral)', icon: 'tune', tone: 'white' },
  { label: 'Last Update', value: lastUpdate.value, icon: 'schedule', tone: 'white' },
]);

const componentStatuses = [
  'HV Bushings',
  'LV Bushings',
  'Winding (HV)',
  'Winding (LV)',
  'Core',
  'Cooling Fans',
  'OLTC',
];

const overviewCallouts = computed(() => [
  { label: 'Top Oil Temp', value: oilTemp.value, unit: 'C', x: 17, y: 22, side: 'left' },
  { label: 'Winding Temp (H)', value: windingTemp.value, unit: 'C', x: 18, y: 42, side: 'left' },
  {
    label: 'Bottom Oil Temp',
    value: round1(oilTemp.value - 4.2),
    unit: 'C',
    x: 19,
    y: 67,
    side: 'left',
  },
  { label: 'Load', value: loadPct.value, unit: '%', x: 47, y: 17, side: 'right' },
  { label: 'Oil Level', value: 'Normal', unit: '', x: 76, y: 23, side: 'right' },
  { label: 'Pressure', value: '0.25', unit: 'bar', x: 77, y: 43, side: 'right' },
  { label: 'Oil Quality', value: 'Good', unit: '', x: 77, y: 60, side: 'right' },
  {
    label: 'Tank Temp',
    value: round1(oilTemp.value - 6.7),
    unit: 'C',
    x: 75,
    y: 78,
    side: 'right',
  },
]);

const digitalCallouts = computed(() => [
  { label: 'Top Oil Temp', value: oilTemp.value, unit: 'C', x: 35, y: 18, side: 'left' },
  { label: 'Winding Temp (HV)', value: windingTemp.value, unit: 'C', x: 32, y: 38, side: 'left' },
  {
    label: 'Winding Temp (LV)',
    value: round1(windingTemp.value - 6.3),
    unit: 'C',
    x: 34,
    y: 58,
    side: 'left',
  },
  {
    label: 'Bottom Oil Temp',
    value: round1(oilTemp.value - 4.2),
    unit: 'C',
    x: 36,
    y: 79,
    side: 'left',
  },
  { label: 'HV Current', value: loadCurrent.value, unit: 'A', x: 50, y: 25, side: 'right' },
  { label: 'Oil Level', value: 'Normal', unit: '', x: 65, y: 15, side: 'right' },
  { label: 'Oil Pressure', value: '0.25', unit: 'bar', x: 66, y: 38, side: 'right' },
  { label: 'Cooling Fans', value: 'Active', unit: '', x: 65, y: 58, side: 'right' },
  { label: 'Load Tap Changer', value: 'Position: 5', unit: '', x: 63, y: 76, side: 'right' },
  { label: 'Vibration (Tank)', value: '1.8', unit: 'mm/s', x: 54, y: 84, side: 'right' },
]);

const realtimeParameters = computed(() => [
  { label: 'Primary Voltage (L-L)', value: primaryVoltage.value, unit: 'kV' },
  { label: 'Secondary Voltage (L-L)', value: secondaryVoltage.value, unit: 'kV' },
  { label: 'Load Current', value: loadCurrent.value, unit: 'A' },
  { label: 'Active Power', value: activePower.value, unit: 'MW' },
  { label: 'Apparent Power', value: apparentPower.value, unit: 'MVA' },
  { label: 'Power Factor', value: '0.90', unit: '' },
  { label: 'Frequency', value: '50.02', unit: 'Hz' },
]);

const simulationMetrics = computed(() => [
  { label: 'Hotspot Temp (Pred.)', value: round1(windingTemp.value + 5.6), unit: 'C' },
  { label: 'Winding Life (Est.)', value: round1((healthScore.value / 100) * 28.7), unit: 'Years' },
  {
    label: 'Next Maintenance (Est.)',
    value: Math.max(12, Math.round((100 - riskScore.value) / 2)),
    unit: 'Days',
  },
  { label: 'Failure Probability', value: riskScore.value, unit: '%', danger: true },
  { label: 'Overload Capacity', value: Math.max(0, 90 - loadPct.value), unit: '%' },
  {
    label: 'Cooling Efficiency',
    value: Math.min(99, Math.round(healthScore.value + 2)),
    unit: '%',
  },
  {
    label: 'Insulation Life (Est.)',
    value: round1((healthScore.value / 100) * 31.2),
    unit: 'Years',
  },
]);

const schematicMetrics = computed(() => [
  { label: 'Differential Relay', value: 'Armed', unit: '' },
  { label: 'Thermal Trip', value: round1(windingTemp.value + 5.6), unit: 'C' },
  { label: 'Buchholz Gas', value: gasRows[0].value, unit: 'ppm' },
  { label: 'Ground Fault', value: '0.02', unit: 'pu' },
  { label: 'Tap Position', value: 5, unit: '' },
  { label: 'Protection Zone', value: 'HV-LV', unit: '' },
  { label: 'Trip Margin', value: Math.max(4, Math.round(100 - loadPct.value)), unit: '%' },
]);

const protectionStages = computed(() => [
  { code: '87T', label: 'Transformer differential', state: 'armed', tone: 'green' },
  {
    code: '49',
    label: 'Thermal image overload',
    state: windingTemp.value > 86 ? 'warning' : 'normal',
    tone: windingTemp.value > 86 ? 'yellow' : 'green',
  },
  {
    code: '63',
    label: 'Buchholz gas relay',
    state: gasRows[0].value > 80 ? 'watch' : 'normal',
    tone: gasRows[0].value > 80 ? 'yellow' : 'green',
  },
  { code: '51N', label: 'Ground overcurrent', state: 'normal', tone: 'green' },
  {
    code: '86',
    label: 'Lockout trip circuit',
    state: riskScore.value > 70 ? 'ready' : 'standby',
    tone: riskScore.value > 70 ? 'red' : 'cyan',
  },
]);

const environment = computed(() => [
  {
    label: 'Ambient Temp',
    value: `${round1(store.weather?.temperatureC || 28.6)} C`,
    icon: 'device_thermostat',
  },
  { label: 'Humidity', value: '45 %', icon: 'water_drop' },
  { label: 'Wind Speed', value: '3.6 m/s', icon: 'air' },
  { label: 'Altitude', value: '220 m', icon: 'terrain' },
]);

const analyticsKpis = computed(() => [
  {
    label: 'Health Score',
    value: healthScore.value,
    unit: '/100',
    status: 'Excellent',
    icon: 'health_and_safety',
    tone: 'green',
  },
  {
    label: 'Load Factor',
    value: loadPct.value,
    unit: '%',
    status: 'Optimal',
    icon: 'show_chart',
    tone: 'cyan',
  },
  {
    label: 'Top Oil Temp.',
    value: oilTemp.value,
    unit: 'C',
    status: 'Normal',
    icon: 'device_thermostat',
    tone: 'cyan',
  },
  {
    label: 'Load Current',
    value: loadCurrent.value,
    unit: 'A',
    status: 'Normal',
    icon: 'monitoring',
    tone: 'green',
  },
  {
    label: 'Active Power',
    value: activePower.value,
    unit: 'MW',
    status: 'Normal',
    icon: 'offline_bolt',
    tone: 'yellow',
  },
  {
    label: 'Failure Probability',
    value: riskScore.value,
    unit: '%',
    status: 'Low',
    icon: 'warning',
    tone: 'red',
  },
]);

const sensorRows = computed(() => [
  { sensor: 'Top Oil Temperature', value: oilTemp.value, unit: 'C', status: 'Normal', trend: 62 },
  {
    sensor: 'Winding Temperature (H)',
    value: windingTemp.value,
    unit: 'C',
    status: windingTemp.value > 75 ? 'Warning' : 'Normal',
    trend: 88,
  },
  {
    sensor: 'Winding Temperature (L)',
    value: round1(windingTemp.value - 6.3),
    unit: 'C',
    status: 'Normal',
    trend: 45,
  },
  {
    sensor: 'Bottom Oil Temperature',
    value: round1(oilTemp.value - 4.2),
    unit: 'C',
    status: 'Normal',
    trend: 73,
  },
  { sensor: 'Oil Level', value: 'Normal', unit: '-', status: 'Normal', trend: 31 },
]);

const gasRows = [
  { gas: 'Hydrogen (H2)', value: 45, unit: 'ppm', trend: 44 },
  { gas: 'Methane (CH4)', value: 32, unit: 'ppm', trend: 58 },
  { gas: 'Ethylene (C2H4)', value: 18, unit: 'ppm', trend: 29 },
  { gas: 'Acetylene (C2H2)', value: 2, unit: 'ppm', trend: 76 },
  { gas: 'Carbon Monoxide (CO)', value: 25, unit: 'ppm', trend: 51 },
  { gas: 'Carbon Dioxide (CO2)', value: 350, unit: 'ppm', trend: 67 },
];

const alarms = computed(() => {
  const stationAlarms = station.value?.alarms || {};

  const active = Object.entries(stationAlarms)
    .filter(([, enabled]) => enabled)
    .map(([key], index) => ({
      label: alarmLabel(key),
      severity: index === 0 ? 'critical' : 'warning',
      icon: index === 0 ? 'report_problem' : 'warning',
      time: `14:${31 - index}:47`,
    }));

  return active.length
    ? active
    : [
        {
          label: 'High Winding Temperature (H)',
          severity: 'critical',
          icon: 'report_problem',
          time: '14:31:47',
        },
        { label: 'Oil Temperature High', severity: 'warning', icon: 'warning', time: '14:30:12' },
        { label: 'Cooling Fan #2 Failure', severity: 'warning', icon: 'warning', time: '14:28:01' },
        { label: 'High Load', severity: 'warning', icon: 'warning', time: '14:27:33' },
        {
          label: 'Buchholz Gas Detected',
          severity: 'critical',
          icon: 'report_problem',
          time: '14:25:10',
        },
      ];
});

const eventRows = computed(() =>
  alarms.value.map((alarm, index) => ({
    time: alarm.time,
    event: alarm.label,
    severity: index % 3 === 0 ? 'High' : index % 3 === 1 ? 'Medium' : 'Low',
    severityClass: index % 3 === 0 ? 'red' : index % 3 === 1 ? 'yellow' : 'green',
  })),
);

const anomalyRows = computed(() => [
  {
    parameter: 'Top Oil Temperature',
    value: `${oilTemp.value} C`,
    range: `40 - ${thresholdValue('overheating', 90)} C`,
    deviation: '-24.6 C',
  },
  {
    parameter: 'Winding Temperature (H)',
    value: `${windingTemp.value} C`,
    range: `50 - ${thresholdValue('cooling_winding', 95)} C`,
    deviation: '-16.4 C',
  },
  {
    parameter: 'Load Current',
    value: `${loadCurrent.value} A`,
    range: '0 - 600 A',
    deviation: '-287.5 A',
  },
  { parameter: 'Oil Pressure', value: '0.25 bar', range: '0.1 - 0.6 bar', deviation: '-0.35 bar' },
  { parameter: 'Vibration (Tank)', value: '1.8 mm/s', range: '0 - 5 mm/s', deviation: '-3.2 mm/s' },
]);

const insights = [
  {
    title: 'Transformer is operating within normal parameters.',
    body: 'All key indicators are in optimal range.',
    icon: 'check_circle',
    tone: 'green',
    time: 'May 20, 14:30',
  },
  {
    title: 'Load is expected to increase by 12% in next 3 days.',
    body: 'No action required. System capacity is sufficient.',
    icon: 'info',
    tone: 'cyan',
    time: 'May 20, 14:28',
  },
  {
    title: 'Routine oil sampling recommended in next 15 days.',
    body: 'Based on ageing factor and oil condition analysis.',
    icon: 'build',
    tone: 'white',
    time: 'May 20, 14:25',
  },
];

const maintenancePriority = computed(() =>
  riskScore.value >= 70 || windingTemp.value >= 92
    ? 'Immediate'
    : riskScore.value >= 35 || windingTemp.value >= 82
      ? 'Planned'
      : 'Routine',
);

const maintenancePlan = computed(() => [
  {
    title: 'Oil sampling and DGA validation',
    body: 'Confirm gas trend and insulation moisture before the next load peak.',
    due: `${Math.max(7, Math.round((100 - riskScore.value) / 3))} days`,
    icon: 'science',
    tone: 'cyan',
  },
  {
    title: 'Cooling bank inspection',
    body: `Fan stage follows ${oilTemp.value} C top-oil profile with ${Math.max(0, 90 - loadPct.value)}% overload headroom.`,
    due: windingTemp.value > 82 ? '24 h' : '14 days',
    icon: 'mode_fan',
    tone: windingTemp.value > 82 ? 'yellow' : 'green',
  },
  {
    title: 'OLTC contact resistance check',
    body: 'Tap position is stable, schedule contact scan during the next low-load window.',
    due: '30 days',
    icon: 'tune',
    tone: 'white',
  },
  {
    title: 'Protection relay self-test',
    body: 'Verify 87T, 49, 63 and 51N relay chain before blackout scenario training.',
    due: riskScore.value > 35 ? '7 days' : '45 days',
    icon: 'shield',
    tone: riskScore.value > 35 ? 'yellow' : 'green',
  },
]);

const inspectionChecklist = computed(() => [
  {
    label: 'Infrared scan of HV bushings',
    state: oilTemp.value > 80 ? 'watch' : 'clear',
    icon: 'thermostat',
    tone: oilTemp.value > 80 ? 'yellow' : 'green',
  },
  { label: 'Oil level and conservator bladder', state: 'clear', icon: 'oil_barrel', tone: 'green' },
  {
    label: 'Cooling fan stage command',
    state: windingTemp.value > 82 ? 'active' : 'standby',
    icon: 'mode_fan',
    tone: windingTemp.value > 82 ? 'cyan' : 'white',
  },
  {
    label: 'Grounding and neutral CT loop',
    state: 'clear',
    icon: 'electrical_services',
    tone: 'green',
  },
  {
    label: 'Relay event recorder download',
    state: alarms.value.length ? 'pending' : 'synced',
    icon: 'receipt_long',
    tone: alarms.value.length ? 'yellow' : 'green',
  },
]);

const eventTimeline = computed(() => [
  ...eventRows.value.map((row) => ({
    time: row.time,
    severity: row.severity,
    tone: row.severityClass,
    title: row.event,
    detail: `Transformer ${transformer.value?.id || route.params.id} event captured by alarm engine.`,
  })),
  {
    time: '14:22:18',
    severity: 'Info',
    tone: 'cyan',
    title: 'Forecast recalculated',
    detail: `Next maintenance window adjusted to ${Math.max(12, Math.round((100 - riskScore.value) / 2))} days.`,
  },
  {
    time: '14:20:44',
    severity: 'Info',
    tone: 'green',
    title: 'Digital twin synchronized',
    detail: `Realtime model refreshed with ${loadPct.value}% loading and ${healthScore.value}/100 health score.`,
  },
]);

const eventInsights = computed(() => [
  {
    title: 'Protection coordination is complete.',
    body: 'Relay chain has armed states for differential, gas, thermal and ground fault protection.',
    icon: 'verified',
    tone: 'green',
    time: 'Live',
  },
  {
    title: 'Maintenance context is available.',
    body: `Priority is ${maintenancePriority.value.toLowerCase()} based on load, DGA, ageing and thermal stress.`,
    icon: 'engineering',
    tone:
      maintenancePriority.value === 'Immediate'
        ? 'red'
        : maintenancePriority.value === 'Planned'
          ? 'yellow'
          : 'cyan',
    time: 'AI',
  },
  {
    title: 'Events are tied to operator action.',
    body: 'The event log shows timeline, lifecycle state and recommended follow-up for operator review.',
    icon: 'assignment_turned_in',
    tone: 'white',
    time: 'SCADA',
  },
]);

function scatterStyle(index) {
  const progress = (index - 1) / 47;

  const jitterX = Math.sin(index * 2.13) * 2.6;

  const jitterY = Math.sin(index * 1.31) * 5.4 + Math.cos(index * 0.77) * 3.2;

  const x = 10 + progress * 78 + jitterX;

  const y = 84 - progress * 62 + jitterY;

  return {
    left: `${Math.max(5, Math.min(92, x))}%`,
    top: `${Math.max(10, Math.min(88, y))}%`,
  };
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
      h('div', { class: 'tt-card trend-panel' }, [
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
        h('div', { class: 'trend-body' }, [
          h(TransformerTwinMiniChart, { seed: props.seed, actualValues: props.values }),
          props.sideStats.length
            ? h(
                'div',
                { class: 'side-stats' },
                props.sideStats.map((stat) =>
                  h('div', { class: 'q-pa-sm rounded-borders' }, [
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
              { class: 'trend-footer' },
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
  },
  setup(props) {
    return () =>
      h('div', { class: 'tt-card metric-card' }, [
        h(
          'h2',
          {
            class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase',
          },
          props.title,
        ),
        h(
          'div',
          { class: 'metric-grid' },
          props.metrics.map((metric) =>
            h('div', { class: 'relative-position q-pa-sm overflow-hidden rounded-borders' }, [
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

const AgeingCard = defineComponent({
  name: 'AgeingCard',
  setup() {
    return () =>
      h('div', { class: 'tt-card ageing-card' }, [
        h(
          'h2',
          {
            class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase',
          },
          'Ageing Factor',
        ),
        h('div', { class: 'ageing-layout' }, [
          h('div', { class: 'ageing-gauge', style: { '--ageing': `${ageingFactor.value}%` } }, [
            h('strong', `${ageingFactor.value}%`),
            h('span', { class: 'text-weight-bold' }, 'Low'),
          ]),
          h('div', { class: 'condition-list q-pl-md' }, [
            h('div', { class: 'row no-wrap justify-between' }, [
              h('span', 'Insulation Condition'),
              h('strong', 'Good'),
            ]),
            h('div', { class: 'row no-wrap justify-between' }, [
              h('span', 'Oil Condition'),
              h('strong', 'Good'),
            ]),
            h('div', { class: 'row no-wrap justify-between' }, [
              h('span', 'Overall Health'),
              h('strong', 'Good'),
            ]),
          ]),
        ]),
      ]);
  },
});

const EnvironmentCard = defineComponent({
  name: 'EnvironmentCard',
  props: {
    items: { type: Array as PropType<any[]>, default: () => [] },
  },
  setup(props) {
    return () =>
      h('div', { class: 'tt-card environment-card' }, [
        h(
          'h2',
          {
            class: 'q-ma-none q-pt-md q-pb-sm q-px-md text-caption text-weight-bold text-uppercase',
          },
          'Environmental Conditions',
        ),
        h(
          'div',
          { class: 'environment-grid' },
          props.items.map((item) =>
            h('div', { class: 'text-center' }, [
              h('span', { class: 'material-icons' }, item.icon),
              h('small', item.label),
              h('strong', item.value),
            ]),
          ),
        ),
      ]);
  },
});
</script>
