<template>
  <q-layout view="lHh Lpr lFf">
    <Sidebar />

    <q-page-container>
      <q-page
        class="page-shell forecasting-page q-pa-md"
        style="grid-template-rows: auto auto auto minmax(0, 1fr)"
      >
        <Topbar
          @open-notifications="router.push('/alarms')"
          @open-topology="topologyOpen = true"
        />

        <header
          class="forecasting-header row no-wrap items-center justify-between q-gutter-x-md q-ml-none"
        >
          <div>
            <div class="section-kicker text-weight-bold text-uppercase">
              {{ t('dashboard.predictiveGridInsights') }}
            </div>

            <h1
              class="q-mt-xs q-mb-none q-mx-none text-h5"
              style="line-height: 1.1"
            >
              {{ t('dashboard.aiForecasting') }}
            </h1>
          </div>

          <q-badge
            class="forecast-live-badge q-py-xs q-px-sm"
            color="positive"
            style="min-height: 24px"
          >
            <q-icon
              class="q-mr-xs"
              name="sensors"
              size="14px"
            />
            {{ t('dashboard.live') }}
          </q-badge>
        </header>

        <section
          class="forecast-kpi-grid scada-gap-10"
          style="display: grid"
        >
          <q-card
            v-for="metric in metrics"
            bordered
            class="scada-card forecast-kpi-card"
            flat
            :key="metric.label"
          >
            <q-card-section
              class="relative-position"
              style="min-height: 76px"
            >
              <span
                class="block text-uppercase"
                style="font-size: 10px"
              >
                {{ metric.label }}
              </span>

              <strong
                class="block q-mt-sm text-h5 text-weight-bold"
                style="line-height: 1"
                :class="metric.class"
              >
                {{ metric.value }}
                <small class="q-ml-xs text-caption">{{ metric.unit }}</small>
              </strong>

              <q-icon
                :color="metric.color"
                :name="metric.icon"
              />
            </q-card-section>
          </q-card>
        </section>

        <div
          class="forecast-workspace scada-min-height-0 scada-gap-10"
          style="display: grid"
        >
          <div
            class="forecast-main-column scada-min-height-0 scada-gap-10"
            style="display: grid; grid-template-rows: 286px minmax(0, 1fr)"
          >
            <LoadForecastCard
              class="workspace-forecast-chart full-width"
              :points="store.forecast"
            />

            <q-card
              bordered
              class="scada-card forecast-table-card"
              flat
              style="min-height: 0; grid-template-rows: auto minmax(0, 1fr)"
            >
              <q-card-section>
                <div class="section-kicker-light text-caption text-weight-bold text-uppercase">
                  {{ t('dashboard.loadForecast') }}
                </div>
              </q-card-section>

              <div class="forecast-table-wrap scada-min-height-0 overflow-auto">
                <table class="forecast-table text-caption full-width">
                  <thead>
                    <tr>
                      <th
                        class="q-py-sm q-px-md text-left text-uppercase"
                        style="font-size: 10px"
                      >
                        {{ t('dashboard.expectedWindow') }}
                      </th>

                      <th
                        class="q-py-sm q-px-md text-left text-uppercase"
                        style="font-size: 10px"
                      >
                        {{ t('dashboard.load') }}
                      </th>

                      <th
                        class="q-py-sm q-px-md text-left text-uppercase"
                        style="font-size: 10px"
                      >
                        {{ t('dashboard.risk') }}
                      </th>

                      <th
                        class="q-py-sm q-px-md text-left text-uppercase"
                        style="font-size: 10px"
                      >
                        {{ t('dashboard.confidence') }}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr
                      v-for="row in rows"
                      :key="row.id"
                    >
                      <td class="q-py-sm q-px-md text-left">{{ row.period }}</td>

                      <td class="q-py-sm q-px-md text-left">{{ row.loadMW.toFixed(1) }} MW</td>

                      <td class="q-py-sm q-px-md text-left">
                        <div
                          class="risk-meter-cell items-center scada-gap-10"
                          style="
                            min-width: 160px;
                            display: grid;
                            grid-template-columns: minmax(80px, 1fr) 38px;
                          "
                        >
                          <q-linear-progress
                            rounded
                            track-color="blue-grey-10"
                            :color="riskColor(row.risk)"
                            :value="row.risk / 100"
                          />

                          <span>{{ row.risk }}%</span>
                        </div>
                      </td>

                      <td class="q-py-sm q-px-md text-left">
                        {{
                          row.confidence == null
                            ? t('dashboard.heuristicEstimate')
                            : `${row.confidence}%`
                        }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </q-card>
          </div>

          <aside
            class="forecast-side-column scada-min-height-0 scada-gap-10 content-start hide-scrollbar"
          >
            <BlackoutPredictionCard
              :prediction="store.blackout"
              :top-risk="store.topRiskSubstations"
            />

            <AIInsightsPanel :insights="store.insights" />

            <TopRiskSubstationsCard :stations="store.topRiskSubstations" />
          </aside>
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
// Keep component selector isolation for the shared stylesheet.
defineOptions({ __scopeId: 'data-v-ui-c9a531c0' });

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import Sidebar from '../components/layout/Sidebar.vue';
import Topbar from '../components/layout/Topbar.vue';
import SystemTopologyDialog from '../components/system/SystemTopologyDialog.vue';
import AIInsightsPanel from '../components/dashboard/right-sidebar/AIInsightsPanel.vue';
import BlackoutPredictionCard from '../components/dashboard/right-sidebar/BlackoutPredictionCard.vue';
import LoadForecastCard from '../components/dashboard/right-sidebar/LoadForecastCard.vue';
import TopRiskSubstationsCard from '../components/dashboard/right-sidebar/TopRiskSubstationsCard.vue';
import { useForecastWorkspace } from '../composables/useForecastWorkspace';
import { useI18n } from '../i18n';

const router = useRouter();

const { t } = useI18n();

const topologyOpen = ref(false);

const {
  averageConfidence,
  confidenceAvailable,
  averageRisk,
  highRiskWindows,
  peakLoad,
  riskColor,
  rows,
  store,
} = useForecastWorkspace();

const metrics = computed(() => [
  {
    label: t('dashboard.peak'),
    value: peakLoad.value,
    unit: ' MW',
    icon: 'electric_bolt',
    color: 'cyan',
    class: 'text-cyan',
  },
  {
    label: t('dashboard.avgRisk'),
    value: averageRisk.value,
    unit: '%',
    icon: 'crisis_alert',
    color: averageRisk.value >= 50 ? 'negative' : 'warning',
    class: averageRisk.value >= 50 ? 'text-negative' : 'text-warning',
  },
  {
    label: t('dashboard.avgConfidence'),
    value: confidenceAvailable.value ? averageConfidence.value : t('dashboard.heuristicEstimate'),
    unit: confidenceAvailable.value ? '%' : '',
    icon: 'verified',
    color: 'positive',
    class: 'text-positive',
  },
  {
    label: t('dashboard.highOutageExposure'),
    value: highRiskWindows.value,
    unit: '',
    icon: 'schedule',
    color: 'deep-orange',
    class: 'text-deep-orange',
  },
]);

onMounted(() => {
  if (!store.stations.length) {
    void store.start();
  } else {
    void store.refreshAll();
  }
});
</script>
