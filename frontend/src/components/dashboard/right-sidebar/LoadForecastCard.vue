<template>
  <q-card
    bordered
    class="scada-card load-forecast-card overflow-hidden no-wrap column"
    flat
    style="height: 286px"
  >
    <q-card-section class="row items-center justify-between q-pa-sm">
      <div>
        <div class="section-kicker-light text-caption text-weight-bold text-uppercase">
          {{ t('dashboard.loadForecast') }}
          <q-icon
            name="info_outline"
            size="12px"
          >
            <q-tooltip>{{ forecastNote }} · {{ t('dashboard.forecastCapacityInfo') }}</q-tooltip>
          </q-icon>
        </div>
      </div>

      <q-btn-toggle
        v-model="mode"
        class="forecast-range-toggle overflow-hidden"
        color="transparent"
        dense
        text-color="blue-grey-2"
        toggle-color="cyan"
        unelevated
        :options="rangeOptions"
      />
    </q-card-section>

    <SidebarEmptyState
      v-if="!dataAvailable"
      :message="forecastNote"
      :loading="loading"
    />
    <q-card-section
      v-else
      class="forecast-card-body q-pa-sm q-pt-none no-wrap column"
      style="min-height: 0"
    >
      <div
        class="forecast-chart-wrap relative-position"
        style="flex: 1 1 auto"
      >
        <div
          class="forecast-axis-labels absolute column no-wrap justify-between scada-text-muted"
          style="left: 0; top: 2px; bottom: 26px; font-size: 10px"
        >
          <span>100%</span>

          <span>75%</span>

          <span>50%</span>

          <span>25%</span>

          <span>0%</span>
        </div>

        <svg
          class="forecast-line-chart block full-width"
          preserveAspectRatio="none"
          style="overflow: visible"
          viewBox="0 0 320 132"
        >
          <defs>
            <linearGradient
              :id="gradientId"
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2="0"
              y2="132"
            >
              <stop
                v-for="(stop, index) in colorStops"
                :key="index"
                :offset="stop.offset"
                :stop-color="stop.color"
              />
            </linearGradient>
          </defs>
          <path
            v-for="line in gridLines"
            class="chart-grid-line"
            style="
              stroke: rgba(143, 169, 184, 0.18);
              stroke-width: 1;
              vector-effect: non-scaling-stroke;
            "
            :d="`M 0 ${line} H 320`"
            :key="line"
          />

          <path
            class="chart-area-fill"
            :style="{ fill: `url(#${gradientId})`, opacity: 0.18 }"
            :d="areaPath"
          />

          <path
            v-if="currentGuidePath"
            class="forecast-current-guide"
            style="
              fill: none;
              opacity: 0.38;
              stroke-width: 1;
              stroke-dasharray: 3 3;
              vector-effect: non-scaling-stroke;
            "
            :style="{ stroke: currentColor }"
            :d="currentGuidePath"
          />

          <polyline
            class="glow-line forecast-main-line"
            :style="{
              stroke: `url(#${gradientId})`,
              filter: 'drop-shadow(0 0 3px rgba(143, 169, 184, 0.35))',
            }"
            :points="linePath"
          />
        </svg>

        <div
          class="forecast-current-value absolute"
          style="line-height: 1"
          :style="{ ...currentValueStyle, color: currentColor }"
        >
          {{ dataAvailable ? `${currentPercent}%` : t('dashboard.confidenceUnavailable') }}
        </div>

        <div class="forecast-time-axis row no-wrap justify-between scada-text-muted">
          <span
            v-for="(label, index) in axisLabels"
            :key="`${label}-${index}`"
          >
            {{ label }}
          </span>
        </div>
      </div>

      <div
        class="forecast-note scada-text-muted ellipsis"
        style="font-size: 9px"
      >
        {{ forecastNote }}
      </div>

      <div class="row forecast-summary-row q-mt-sm col-auto">
        <div class="col-4 q-pr-sm">
          <div
            class="metric-box forecast-metric-box"
            style="min-height: 50px"
          >
            <span
              class="block"
              style="font-size: 11px"
            >
              {{ t('dashboard.peak') }}
            </span>

            <strong
              class="block q-mt-xs text-caption"
              :style="{ color: dataAvailable ? peakColor : undefined }"
            >
              {{ dataAvailable ? `${peakLoad} MW` : t('dashboard.confidenceUnavailable') }}
            </strong>
          </div>
        </div>

        <div class="col-4 q-pr-sm">
          <div
            class="metric-box forecast-metric-box"
            style="min-height: 50px"
          >
            <span
              class="block"
              style="font-size: 11px"
            >
              {{ t('dashboard.currentRisk') }}
            </span>

            <strong class="block q-mt-xs text-caption">
              {{ dataAvailable ? `${avgRisk}%` : t('dashboard.confidenceUnavailable') }}
            </strong>
          </div>
        </div>

        <div class="col-4">
          <div
            class="metric-box forecast-metric-box"
            style="min-height: 50px"
          >
            <span
              class="block"
              style="font-size: 11px"
            >
              {{ t('dashboard.confidence') }}
            </span>

            <strong class="block q-mt-xs text-caption">
              {{ confidenceAvailable ? `${avgConfidence}%` : t('dashboard.confidenceUnavailable') }}
              <q-tooltip v-if="!confidenceAvailable">
                {{ t('dashboard.forecastConfidenceInfo') }}
              </q-tooltip>
            </strong>
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import SidebarEmptyState from './SidebarEmptyState.vue';
import { useId, type PropType } from 'vue';
import { useLoadForecast } from '../../../composables/useLoadForecast';
import { useI18n } from '../../../i18n';
import type { ForecastPoint } from '../../../types/dashboard';

const gradientId = `forecast-severity-${useId().replace(/:/g, '')}`;

const props = defineProps({
  points: {
    type: Array as PropType<ForecastPoint[]>,
    default: () => [],
  },
});

const { t } = useI18n();

const {
  colorStops,
  currentColor,
  peakColor,
  dataAvailable,
  loading,
  forecastNote,
  areaPath,
  avgConfidence,
  confidenceAvailable,
  avgRisk,
  axisLabels,
  currentGuidePath,
  currentPercent,
  currentValueStyle,
  gridLines,
  linePath,
  mode,
  peakLoad,
  rangeOptions,
} = useLoadForecast(() => props.points, t);
</script>
