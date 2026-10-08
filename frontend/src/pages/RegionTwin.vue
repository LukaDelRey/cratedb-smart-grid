<template>
  <q-layout view="lHh Lpr lFf">
    <Sidebar />

    <q-page-container>
      <q-page class="page-shell q-pa-md">
        <TwinHeader
          icon="public"
          title="Region Digital Twin"
          :asset-id="region?.id || regionId"
          :health="region?.healthScore"
          :risk="region?.blackoutRisk"
        />

        <div class="twin-grid">
          <q-card
            bordered
            class="scada-card hero-panel"
            flat
          >
            <q-card-section>
              <div class="section-kicker text-weight-bold text-uppercase">
                {{ t('dashboard.regionalPowerFlow') }}
              </div>

              <div class="section-title text-subtitle1 text-weight-bold">{{ region?.name }}</div>

              <div
                class="region-flow overflow-hidden q-mt-md relative-position"
                style="border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 8px"
              >
                <div
                  v-for="line in 8"
                  class="absolute"
                  style="height: 2px"
                  :key="line"
                />
              </div>
            </q-card-section>
          </q-card>

          <q-card
            bordered
            class="scada-card"
            flat
          >
            <q-card-section>
              <div class="section-kicker text-weight-bold text-uppercase">
                {{ t('dashboard.assets') }}
              </div>

              <div class="text-h2 text-weight-bold">{{ region?.stations || 0 }}</div>

              <div class="text-blue-grey-3">{{ t('dashboard.substationsInRegion') }}</div>
            </q-card-section>
          </q-card>

          <q-card
            bordered
            class="scada-card"
            flat
          >
            <q-card-section>
              <div class="section-kicker text-weight-bold text-uppercase">
                {{ t('dashboard.weatherCorrelation') }}
              </div>

              <div class="text-h2 text-weight-bold text-warning">
                {{ store.weather.gridImpact }}%
              </div>

              <div class="text-blue-grey-3">{{ t('dashboard.aiWeatherToGridImpact') }}</div>
            </q-card-section>
          </q-card>

          <AIInsightsPanel
            class="wide-panel"
            :insights="store.insights"
          />

          <LoadForecastCard
            class="wide-panel"
            :points="store.forecast"
          />

          <q-card
            bordered
            class="scada-card wide-panel"
            flat
          >
            <q-card-section>
              <div class="section-kicker text-weight-bold text-uppercase">
                {{ t('dashboard.gridTopology') }}
              </div>

              <div class="section-title text-subtitle1 text-weight-bold">Regional N-1 topology</div>

              <div class="regional-topology q-mt-md">
                <div
                  v-for="station in topRegionalStations"
                  class="items-center q-pa-sm"
                  style="
                    min-height: 44px;
                    grid-template-columns: minmax(0, 1fr) 74px 48px minmax(120px, 0.42fr);
                  "
                  :key="station.id"
                >
                  <span
                    class="block"
                    style="min-width: 0"
                  >
                    <strong
                      class="block text-body2 text-weight-bold"
                      style="min-width: 0"
                    >
                      {{ station.id }}
                    </strong>

                    <small
                      class="block"
                      style="min-width: 0; font-size: 11px"
                    >
                      {{ station.name }}
                    </small>
                  </span>

                  <em
                    class="text-weight-bolder text-right text-uppercase"
                    style="font-size: 10px"
                    :class="station.tone"
                  >
                    {{ station.status }}
                  </em>

                  <b class="text-right text-body2 text-weight-bold">{{ station.load }}%</b>

                  <i
                    class="overflow-hidden"
                    style="height: 7px"
                  >
                    <u
                      class="block full-height border-radius-inherit"
                      :style="{ width: `${station.risk}%` }"
                    />
                  </i>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card
            bordered
            class="scada-card"
            flat
          >
            <q-card-section>
              <div class="section-kicker text-weight-bold text-uppercase">
                {{ t('dashboard.blackoutPropagation') }}
              </div>

              <div class="propagation-chain q-mt-md">
                <div
                  v-for="step in blackoutSteps"
                  class="items-center q-pa-sm"
                  style="min-height: 44px; grid-template-columns: 34px minmax(0, 1fr) 78px"
                  :key="step.label"
                >
                  <span
                    class="text-weight-bolder"
                    style="min-height: 26px; font-size: 11px"
                  >
                    {{ step.index }}
                  </span>

                  <strong
                    class="block text-body2 text-weight-bold"
                    style="min-width: 0"
                  >
                    {{ step.label }}
                  </strong>

                  <em
                    class="text-weight-bolder text-right text-uppercase"
                    style="font-size: 10px"
                    :class="step.tone"
                  >
                    {{ step.value }}
                  </em>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card
            bordered
            class="scada-card"
            flat
          >
            <q-card-section>
              <div class="section-kicker text-weight-bold text-uppercase">
                {{ t('dashboard.weather') }} / GIS
              </div>

              <div class="weather-grid q-mt-md">
                <div
                  v-for="item in weatherMetrics"
                  class="items-center q-pa-sm text-center"
                  style="min-height: 44px"
                  :key="item.label"
                >
                  <q-icon
                    :class="item.tone"
                    :name="item.icon"
                  />

                  <span
                    class="block"
                    style="min-width: 0; font-size: 11px"
                  >
                    {{ item.label }}
                  </span>

                  <strong class="text-weight-bold text-h6">{{ item.value }}</strong>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card
            bordered
            class="scada-card"
            flat
          >
            <q-card-section>
              <div class="section-kicker text-weight-bold text-uppercase">
                {{ t('dashboard.regionalRiskMix') }}
              </div>

              <div class="maintenance-list">
                <div class="row no-wrap justify-between q-pa-sm">
                  <span>{{ t('dashboard.blackout') }}</span>

                  <strong>{{ region?.blackoutRisk || 0 }}%</strong>
                </div>

                <div class="row no-wrap justify-between q-pa-sm">
                  <span>{{ t('dashboard.weather') }}</span>

                  <strong>{{ store.weather.gridImpact }}%</strong>
                </div>

                <div class="row no-wrap justify-between q-pa-sm">
                  <span>{{ t('dashboard.alarms') }}</span>

                  <strong>{{ region?.activeAlarms || 0 }}</strong>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card
            bordered
            class="scada-card"
            flat
          >
            <q-card-section>
              <div class="section-kicker text-weight-bold text-uppercase">
                {{ t('dashboard.regionalQuickActions') }}
              </div>

              <div class="action-stack">
                <q-btn
                  color="cyan"
                  dense
                  icon="map"
                  text-color="black"
                  to="/"
                  :label="t('dashboard.showOnGis')"
                />

                <q-btn
                  color="warning"
                  dense
                  icon="bolt"
                  text-color="black"
                  :label="t('dashboard.balanceLoad')"
                  @click="runRegionalContingency"
                />

                <q-btn
                  color="negative"
                  dense
                  icon="crisis_alert"
                  :label="t('dashboard.simulateBlackout')"
                  @click="scenarioOpen = true"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </q-page>
    </q-page-container>

    <ScenarioControlDialog
      v-model="scenarioOpen"
      default-type="blackout"
    />
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useSensorStore } from '../stores/sensorStore';
import { clamp, round1 } from '../utils/numbers';
import Sidebar from '../components/layout/Sidebar.vue';
import TwinHeader from '../components/layout/TwinHeader.vue';
import AIInsightsPanel from '../components/dashboard/right-sidebar/AIInsightsPanel.vue';
import LoadForecastCard from '../components/dashboard/right-sidebar/LoadForecastCard.vue';
import ScenarioControlDialog from '../components/scenarios/ScenarioControlDialog.vue';
import { useI18n } from '../i18n';

const route = useRoute();

const store = useSensorStore();

const { t } = useI18n();

const scenarioOpen = ref(false);

const regionId = computed(() => {
  const id = route.params.id;

  return Array.isArray(id) ? id[0] : id;
});

onMounted(() => {
  if (!store.stations.length) {
    store.start();
  }
});

const region = computed(() => store.getRegionById(regionId.value));

const topRegionalStations = computed(() =>
  store.stations
    .map((station) => {
      const risk = store.getStationRisk(station);

      const load = Math.round(clamp((station.electrical?.current_a || 0) / 5.7, 12, 98));

      return {
        id: station.station_id,
        name: station.station_name || station.station_id,
        risk,
        load,
        status: risk >= 70 ? 'critical' : risk >= 40 ? 'watch' : 'stable',
        tone: risk >= 70 ? 'text-negative' : risk >= 40 ? 'text-warning' : 'text-positive',
      };
    })
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 5),
);

const blackoutSteps = computed(() => {
  const risk = region.value?.blackoutRisk || store.blackout.probability || 0;

  const affected = store.blackout.affectedStations || region.value?.stations || 0;

  return [
    {
      index: '01',
      label: 'Peak feeder overload',
      value: `${Math.round(clamp(risk + 8, 0, 99))}%`,
      tone: risk > 55 ? 'text-negative' : 'text-warning',
    },
    {
      index: '02',
      label: 'Transformer thermal stress',
      value: `${round1(store.weather.temperatureC)} C`,
      tone: store.weather.temperatureC > 32 ? 'text-warning' : 'text-positive',
    },
    {
      index: '03',
      label: 'Protection coordination margin',
      value: risk > 60 ? 'narrow' : 'armed',
      tone: risk > 60 ? 'text-warning' : 'text-positive',
    },
    {
      index: '04',
      label: 'Potential affected substations',
      value: String(affected),
      tone: affected > 12 ? 'text-negative' : 'text-cyan',
    },
  ];
});

const weatherMetrics = computed(() => [
  {
    label: 'Ambient',
    value: `${round1(store.weather.temperatureC)} C`,
    icon: 'device_thermostat',
    tone: store.weather.temperatureC > 32 ? 'text-warning' : 'text-cyan',
  },
  {
    label: 'Wind risk',
    value: `${store.weather.windRisk}%`,
    icon: 'air',
    tone: store.weather.windRisk > 45 ? 'text-warning' : 'text-positive',
  },
  {
    label: 'Lightning',
    value: `${store.weather.lightningRisk}%`,
    icon: 'thunderstorm',
    tone: store.weather.lightningRisk > 45 ? 'text-negative' : 'text-positive',
  },
  {
    label: 'Grid impact',
    value: `${store.weather.gridImpact}%`,
    icon: 'crisis_alert',
    tone: store.weather.gridImpact > 55 ? 'text-negative' : 'text-warning',
  },
]);

function runRegionalContingency() {
  const assetId = topRegionalStations.value[0]?.id || region.value?.id || regionId.value;

  store.runContingency(assetId);
}
</script>
