<template>
  <q-layout view="lHh Lpr lFf">
    <Sidebar />
    <q-page-container>
      <q-page class="page-shell q-pa-md region-twin-page">
        <div class="region-twin-heading row items-center justify-between q-mb-lg q-gutter-sm">
          <div class="row items-center q-gutter-md">
            <q-btn
              flat
              round
              icon="arrow_back"
              to="/"
              :aria-label="t('dashboard.showOnGis')"
            />
            <q-avatar
              color="cyan"
              text-color="black"
              icon="public"
            />
            <div>
              <div class="section-kicker">
                {{ t('dashboard.regionalDigitalTwin') }} · {{ countryName }}
              </div>
              <h1 class="text-h5 text-weight-bold q-my-xs">
                {{ feature?.properties.name || t('dashboard.region') }}
              </h1>
              <div class="text-caption text-blue-grey-3">{{ t('regions.twinScope') }}</div>
            </div>
          </div>
          <q-btn
            flat
            icon="tune"
            :label="t('regions.configure')"
            to="/settings?tab=regions"
          />
        </div>
        <q-banner
          v-if="regionsLoading"
          class="scada-card"
        >
          <q-spinner class="q-mr-sm" />
          {{ t('regions.loading') }}
        </q-banner>
        <q-banner
          v-else-if="regionsError"
          class="scada-card"
        >
          {{ t('regions.loadError') }}
          <template #action>
            <q-btn
              flat
              :label="t('regions.retry')"
              @click="loadRegionBoundaries()"
            />
          </template>
        </q-banner>
        <q-banner
          v-else-if="!stats || !feature"
          class="scada-card"
        >
          {{ t('regions.unavailable') }}
        </q-banner>
        <template v-else>
          <div class="region-twin-summary q-mb-md">
            <q-card
              v-for="metric in metrics"
              :key="metric.label"
              flat
              bordered
              class="scada-card region-metric"
            >
              <q-card-section>
                <q-icon
                  :name="metric.icon"
                  class="region-metric-icon"
                  :class="metric.tone"
                />
                <div class="text-caption text-blue-grey-3">{{ metric.label }}</div>
                <div
                  class="text-h4 text-weight-bold q-mt-xs"
                  :class="metric.tone"
                >
                  {{ metric.value }}
                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="region-twin-overview q-mb-md">
            <q-card
              flat
              bordered
              class="scada-card"
            >
              <q-card-section>
                <div class="row items-center justify-between q-mb-md">
                  <strong>{{ feature.properties.name }}</strong>
                  <q-badge
                    outline
                    color="cyan"
                  >
                    {{ t(feature.properties.custom ? 'regions.custom' : 'regions.administrative') }}
                  </q-badge>
                </div>
                <RegionBoundaryPreview
                  :data="boundary"
                  :stations="stats.stations"
                />
              </q-card-section>
            </q-card>
            <q-card
              flat
              bordered
              class="scada-card"
            >
              <q-card-section>
                <div class="text-subtitle1 text-weight-bold q-mb-md">
                  {{ t('regions.statusMix') }}
                </div>
                <div class="region-status-summary">
                  <div
                    class="region-status-donut"
                    :style="{ background: statusGradient }"
                  >
                    <div>
                      <strong>{{ stats.stations.length }}</strong>
                      <span>{{ t('dashboard.substations') }}</span>
                    </div>
                  </div>
                  <div class="region-status-legend">
                    <div
                      v-for="item in statuses"
                      :key="item.key"
                      class="region-status-row"
                    >
                      <span>
                        <i
                          class="region-status-dot"
                          :style="{ background: item.color }"
                        />
                        {{ item.label }}
                      </span>
                      <strong :style="{ color: item.color }">{{ item.count }}</strong>
                    </div>
                  </div>
                </div>
                <q-separator
                  dark
                  class="q-my-sm"
                />
                <div
                  v-for="item in telemetry"
                  :key="item.label"
                  class="row justify-between q-py-sm"
                >
                  <span class="text-blue-grey-3">{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </q-card-section>
            </q-card>
          </div>
          <q-card
            flat
            bordered
            class="scada-card q-mb-md"
          >
            <q-card-section>
              <div class="row items-center justify-between q-mb-md">
                <strong>{{ t('regions.activeConditions') }}</strong>
                <div class="row q-gutter-sm">
                  <q-badge color="negative">
                    {{ stats.alarms }} {{ t('regions.criticalAlarms') }}
                  </q-badge>
                  <q-badge
                    color="warning"
                    text-color="black"
                  >
                    {{ stats.warnings }} {{ t('regions.warningAlarms') }}
                  </q-badge>
                </div>
              </div>
              <q-table
                v-if="alarms.length"
                flat
                :rows="alarms"
                :columns="alarmColumns"
                row-key="key"
                :rows-per-page-options="[5, 10, 25]"
              >
                <template #body-cell-severity="props">
                  <q-td :props="props">
                    <q-badge
                      :color="props.row.severity === 'CRITICAL' ? 'negative' : 'warning'"
                      :text-color="props.row.severity === 'CRITICAL' ? 'white' : 'black'"
                    >
                      {{
                        t(
                          props.row.severity === 'CRITICAL'
                            ? 'dashboard.critical'
                            : 'dashboard.warningLabel',
                        )
                      }}
                    </q-badge>
                  </q-td>
                </template>
                <template #body-cell-station="props">
                  <q-td :props="props">
                    <router-link
                      class="region-station-link"
                      :to="stationPath(props.row.stationId)"
                    >
                      {{ props.row.station }}
                    </router-link>
                  </q-td>
                </template>
              </q-table>
              <div
                v-else
                class="text-blue-grey-3 q-py-md"
              >
                {{ stats.stations.length ? t('regions.noAlarms') : t('regions.noStations') }}
              </div>
            </q-card-section>
          </q-card>
          <q-card
            flat
            bordered
            class="scada-card"
          >
            <q-card-section>
              <div class="row items-center justify-between q-gutter-sm q-mb-md">
                <strong>{{ t('regions.members') }} · {{ stats.stations.length }}</strong>
                <q-input
                  v-model="search"
                  dense
                  outlined
                  debounce="200"
                  :placeholder="t('regions.searchStations')"
                >
                  <template #prepend><q-icon name="search" /></template>
                </q-input>
              </div>
              <q-table
                flat
                :rows="stats.stations"
                :columns="stationColumns"
                :filter="search"
                row-key="station_id"
                :rows-per-page-options="[10, 25, 50]"
                :no-data-label="t('regions.noStations')"
                :no-results-label="t('regions.noMatches')"
              >
                <template #body-cell-station_name="props">
                  <q-td :props="props">
                    <router-link
                      class="region-station-link"
                      :to="stationPath(props.row.station_id)"
                    >
                      {{ props.row.station_name || props.row.station_id }}
                    </router-link>
                    <div class="text-caption text-blue-grey-4">{{ props.row.station_id }}</div>
                  </q-td>
                </template>
                <template #body-cell-status="props">
                  <q-td :props="props">
                    <q-badge
                      :style="{ background: statusColor(props.row.status), color: '#07121c' }"
                    >
                      {{ statusLabel(props.row.status || 'normal') }}
                    </q-badge>
                  </q-td>
                </template>
              </q-table>
            </q-card-section>
          </q-card>
        </template>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { QTableColumn } from 'quasar';
import Sidebar from '../components/layout/Sidebar.vue';
import RegionBoundaryPreview from '../components/settings/RegionBoundaryPreview.vue';
import { useSensorStore } from '../stores/sensorStore';
import {
  activeRegions,
  selectedScopeName,
  regionsLoading,
  regionsError,
  loadRegionBoundaries,
} from '../stores/regionPreferences';
import { stationAlarms } from '../services/stationAlarms';
import type { RegionCollection } from '../services/regionGeometry';
import type { Station } from '../types/dashboard';
import { useI18n } from '../i18n';
const route = useRoute();
const store = useSensorStore();
const { t, language } = useI18n();
const search = ref('');
const statistics = computed(() => store.regionStatistics);
const regionId = computed(() => String(route.params.id || ''));
const feature = computed(() =>
  activeRegions.value.find((item) => item.properties.id === regionId.value),
);
const stats = computed(() => statistics.value.find((item) => item.id === regionId.value));
const region = computed(() => store.getRegionById(regionId.value));
const boundary = computed<RegionCollection>(() => ({
  type: 'FeatureCollection',
  features: feature.value ? [feature.value] : [],
}));
const countryName = computed(() => selectedScopeName(language.value));
const format = (value: number | undefined, unit = '') =>
  Number.isFinite(value)
    ? Number(value).toLocaleString(language.value, { maximumFractionDigits: 2 }) + unit
    : '—';
const statusKeys = ['normal', 'warning', 'critical', 'offline'] as const;
const colors = { normal: '#86efac', warning: '#fbbf24', critical: '#fb7185', offline: '#94a3b8' };
const statusColor = (status: keyof typeof colors = 'normal') => colors[status] || colors.normal;
const statusLabel = (status: string) =>
  t('dashboard.' + ({ warning: 'warningLabel', offline: 'offlineLabel' }[status] || status));
const statuses = computed(() =>
  statusKeys.map((key) => ({
    key,
    label: statusLabel(key),
    color: colors[key],
    count: stats.value?.[key] || 0,
  })),
);
const statusGradient = computed(() => {
  const total = stats.value?.stations.length || 0;
  if (!total) return '#203141';
  let offset = 0;
  const stops = statuses.value
    .filter((item) => item.count)
    .map((item) => {
      const start = offset;
      offset += (item.count / total) * 100;
      return `${item.color} ${start}% ${offset}%`;
    });
  return `conic-gradient(${stops.join(',')})`;
});
const metrics = computed(() => [
  {
    icon: 'electrical_services',
    label: t('dashboard.substations'),
    value: stats.value?.stations.length || 0,
    tone: 'text-cyan',
  },
  {
    icon: 'bolt',
    label: t('regions.load'),
    value: stats.value?.stations.length ? format((stats.value?.loadKW || 0) / 1000, ' MW') : '—',
    tone: '',
  },
  {
    icon: 'health_and_safety',
    label: t('dashboard.health'),
    value: stats.value?.stations.length ? format(region.value?.healthScore, '%') : '—',
    tone: 'text-positive',
  },
  {
    icon: 'shield',
    label: t('dashboard.risk'),
    value: stats.value?.stations.length ? format(region.value?.blackoutRisk, '%') : '—',
    tone: 'text-warning',
  },
]);
function average(read: (station: Station) => number | undefined, unit: string) {
  const values = (stats.value?.stations || [])
    .map(read)
    .filter((value): value is number => Number.isFinite(value));
  return values.length ? format(values.reduce((a, b) => a + b, 0) / values.length, unit) : '—';
}
const telemetry = computed(() => [
  { label: t('regions.averageOil'), value: average((s) => s.thermal?.oil_temp_c, ' °C') },
  {
    label: t('regions.averageVoltage'),
    value: average(
      (s) =>
        s.electrical?.voltage_kv ??
        (s.electrical?.voltage_v === undefined ? undefined : s.electrical.voltage_v / 1000),
      ' kV',
    ),
  },
]);
const alarms = computed(() =>
  (stats.value?.stations || [])
    .flatMap((station) =>
      stationAlarms(station).map((alarm, index) => ({
        ...alarm,
        key: `${station.station_id}:${alarm.type}:${index}`,
        stationId: station.station_id,
        station: station.station_name || station.station_id,
      })),
    )
    .sort((a, b) => Number(b.severity === 'CRITICAL') - Number(a.severity === 'CRITICAL')),
);
const alarmColumns = computed<QTableColumn[]>(() => [
  {
    name: 'severity',
    label: t('regions.activeConditions'),
    field: 'severity',
    align: 'left',
    sortable: true,
  },
  { name: 'title', label: t('dashboard.alarms'), field: 'title', align: 'left', sortable: true },
  {
    name: 'station',
    label: t('dashboard.substations'),
    field: 'station',
    align: 'left',
    sortable: true,
  },
  {
    name: 'value',
    label: t('regions.telemetry'),
    field: (row) => format(row.value ?? undefined, row.unit ? ' ' + row.unit : ''),
    align: 'right',
  },
]);
const stationColumns = computed<QTableColumn[]>(() => [
  {
    name: 'station_name',
    label: t('dashboard.substations'),
    field: (s) => `${s.station_name || ''} ${s.station_id}`,
    align: 'left',
    sortable: true,
  },
  { name: 'status', label: t('regions.statusMix'), field: 'status', align: 'left', sortable: true },
  {
    name: 'power',
    label: t('regions.load'),
    field: (s) => s.electrical?.active_power_kw,
    format: (v) => format(v === undefined ? undefined : v / 1000, ' MW'),
    align: 'right',
    sortable: true,
  },
  {
    name: 'oil',
    label: t('dashboard.oilTemp'),
    field: (s) => s.thermal?.oil_temp_c,
    format: (v) => format(v, ' °C'),
    align: 'right',
    sortable: true,
  },
  {
    name: 'alarms',
    label: t('regions.activeConditions'),
    field: (s) => stationAlarms(s).length,
    align: 'right',
    sortable: true,
  },
]);
const stationPath = (id: string) => '/substations/' + encodeURIComponent(id);
onMounted(() => {
  void loadRegionBoundaries();
  if (!store.stations.length) store.start();
});
</script>
<style scoped>
.region-twin-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 28px;
}
.region-twin-heading {
  padding: 4px 0 24px;
  border-bottom: 1px solid #203343;
}
.region-twin-heading h1 {
  letter-spacing: -0.5px;
}
.region-twin-page :deep(.scada-card) {
  border-radius: 14px;
  border-color: #203343;
  background: linear-gradient(145deg, #0c1824, #08121c);
  box-shadow: none;
}
.region-twin-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
.region-metric {
  position: relative;
  overflow: hidden;
}
.region-metric .q-card__section {
  padding: 20px 22px;
}
.region-metric .text-h4 {
  font-size: 29px;
  letter-spacing: -0.8px;
}
.region-metric-icon {
  position: absolute;
  right: 20px;
  top: 24px;
  font-size: 25px;
  opacity: 0.5;
}
.region-twin-overview {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(310px, 1fr);
  gap: 16px;
}
.region-twin-overview > .q-card > .q-card__section {
  padding: 22px;
}
.region-twin-overview :deep(.region-boundary-preview) {
  height: 340px;
  border: 0;
  border-radius: 9px;
}
.region-status-summary {
  display: flex;
  align-items: center;
  gap: 28px;
  min-height: 216px;
}
.region-status-donut {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  padding: 9px;
  flex-shrink: 0;
  transform: rotate(-90deg);
}
.region-status-donut > div {
  border-radius: 50%;
  background: #0b1722;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transform: rotate(90deg);
}
.region-status-donut strong {
  font-size: 32px;
  line-height: 1.25;
}
.region-status-donut span {
  color: #8fa6ba;
  font-size: 10px;
}
.region-status-legend {
  flex: 1;
}
.region-status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  gap: 14px;
  font-size: 12px;
}
.region-status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 8px;
}
.region-station-link {
  color: #82d7ee;
  text-decoration: none;
}
.region-station-link:hover {
  text-decoration: underline;
}
.region-twin-page :deep(.q-table__container) {
  background: transparent;
}
.region-twin-page :deep(.q-table),
.region-twin-page :deep(.q-table tbody td),
.region-twin-page :deep(.q-table__bottom) {
  color: #f4f8fc;
}
.region-twin-page :deep(.q-table thead th) {
  color: #e4edf5;
  font-size: 11px;
  font-weight: 500;
}
.region-twin-page :deep(.q-table tbody td) {
  height: 58px;
  border-color: #1c2b38;
}
.region-twin-page :deep(.q-badge) {
  border-radius: 5px;
  padding: 5px 8px;
  font-size: 10px;
}
@media (max-width: 1200px) {
  .region-twin-overview {
    grid-template-columns: 1fr;
  }
  .region-status-summary {
    min-height: 170px;
    max-width: 480px;
  }
}
@media (max-width: 700px) {
  .region-twin-page {
    padding: 16px;
  }
  .region-twin-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .region-status-summary {
    gap: 20px;
  }
  .region-status-donut {
    width: 125px;
    height: 125px;
  }
}
</style>
