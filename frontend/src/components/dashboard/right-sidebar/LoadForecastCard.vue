<template>
  <q-card flat bordered class="scada-card load-forecast-card">
    <q-card-section class="row items-center justify-between q-pa-sm">
      <div>
        <div class="section-kicker-light">{{ t('dashboard.loadForecast') }} <q-icon name="info_outline" size="12px"><q-tooltip>{{ forecastNote }} · {{ t('dashboard.forecastCapacityInfo') }}</q-tooltip></q-icon></div>
      </div>

      <q-btn-toggle
        v-model="mode"
        dense
        unelevated
        class="forecast-range-toggle"
        toggle-color="cyan"
        color="transparent"
        text-color="blue-grey-2"
        :options="rangeOptions"
      />
    </q-card-section>

    <q-card-section class="forecast-card-body q-pa-sm q-pt-none">
      <div class="forecast-chart-wrap">
        <div class="forecast-axis-labels">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        <svg
          class="forecast-line-chart"
          viewBox="0 0 320 132"
          preserveAspectRatio="none"
        >
          <path
            v-for="line in gridLines"
            :key="line"
            class="chart-grid-line"
            :d="`M 0 ${line} H 320`"
          />
          <path
            class="chart-area-fill forecast-blue-fill"
            :d="areaPath"
          />
          <path
            v-if="currentGuidePath"
            class="forecast-current-guide"
            :d="currentGuidePath"
          />
          <polyline
            :points="linePath"
            class="glow-line forecast-main-line"
          />
        </svg>

        <div
          class="forecast-current-value text-blue-3"
          :style="currentValueStyle"
        >
          {{ dataAvailable ? `${currentPercent}%` : t('dashboard.confidenceUnavailable') }}
        </div>

        <div class="forecast-time-axis">
          <span
            v-for="(label, index) in axisLabels"
            :key="`${label}-${index}`"
          >
            {{ label }}
          </span>
        </div>
      </div>

      <div class="forecast-note">{{ forecastNote }}</div>
      <div class="row forecast-summary-row">
        <div class="col-4 q-pr-sm">
          <div class="metric-box forecast-metric-box">
            <span>{{ t('dashboard.peak') }}</span>
            <strong>{{ dataAvailable ? `${peakLoad} MW` : t('dashboard.confidenceUnavailable') }}</strong>
          </div>
        </div>
        <div class="col-4 q-pr-sm">
          <div class="metric-box forecast-metric-box">
            <span>{{ t('dashboard.currentRisk') }}</span>
            <strong>{{ dataAvailable ? `${avgRisk}%` : t('dashboard.confidenceUnavailable') }}</strong>
          </div>
        </div>
        <div class="col-4">
          <div class="metric-box forecast-metric-box">
            <span>{{ t('dashboard.confidence') }}</span>
            <strong>{{ confidenceAvailable ? `${avgConfidence}%` : t('dashboard.confidenceUnavailable') }}
              <q-tooltip v-if="!confidenceAvailable">{{ t('dashboard.forecastConfidenceInfo') }}</q-tooltip>
            </strong>
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { useLoadForecast } from '../../../composables/useLoadForecast'
import { useI18n } from '../../../i18n'
import type { ForecastPoint } from '../../../types/dashboard'

const props = defineProps({
  points:{
    type:Array as PropType<ForecastPoint[]>,
    default:() => []
  }
})

const { t } = useI18n()
const {
  dataAvailable,
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
  rangeOptions
} = useLoadForecast(() => props.points, t)

</script>

<style>
.metric-box{
  padding:10px;
  border:1px solid rgba(255,255,255,.07);
  border-radius:8px;
  background:rgba(255,255,255,.025);
}

.metric-box span{
  display:block;
  color:#8fa9b8;
  font-size:11px;
}

.metric-box strong{
  display:block;
  margin-top:4px;
  color:#f5fbff;
}

.load-forecast-card{
  height:286px;
  min-height:286px;
  display:flex;
  flex-direction:column;
  overflow:hidden;
}

.load-forecast-card > .q-card__section:first-child{
  flex:0 0 auto;
  min-height:42px;
}

.forecast-card-body{
  flex:1 1 auto;
  min-height:0;
  display:flex;
  flex-direction:column;
}

.forecast-chart-wrap{
  flex:1 1 auto;
  position:relative;
  min-height:164px;
  padding-left:34px;
  padding-right:8px;
}

.forecast-axis-labels{
  position:absolute;
  left:0;
  top:2px;
  bottom:26px;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  color:#8fa9b8;
  font-size:10px;
}

.forecast-line-chart{
  width:100%;
  height:132px;
  display:block;
  overflow:visible;
}

.chart-grid-line{
  stroke:rgba(143,169,184,.18);
  stroke-width:1;
  vector-effect:non-scaling-stroke;
}

.chart-area-fill.normal{ fill:rgba(66,200,255,.13); }

.chart-area-fill.warning{ fill:rgba(255,178,56,.14); }

.chart-area-fill.critical{ fill:rgba(255,77,94,.15); }

.forecast-main-line{
  stroke-width:2.6;
}

.forecast-time-axis{
  display:flex;
  justify-content:space-between;
  padding-top:2px;
  color:#8fa9b8;
  font-size:10px;
}

.forecast-current-value{
  position:absolute;
  right:10px;
  top:10px;
  font-size:16px;
  font-weight:800;
}

.forecast-range-toggle{
  border:1px solid rgba(66,200,255,.14);
  border-radius:7px;
  background:rgba(6,16,30,.58);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.03);
  overflow:hidden;
}

.forecast-range-toggle .q-btn{
  min-height:24px;
  padding:2px 11px;
  font-size:10px;
  letter-spacing:0;
  border-radius:0;
}

.forecast-range-toggle .q-btn[aria-pressed="true"]{
  color:#41c9ff !important;
  background:rgba(30,133,226,.18) !important;
  box-shadow:inset 0 -1px 0 rgba(66,200,255,.45);
}

.forecast-chart-wrap{
  min-height:144px;
  padding-right:33px;
}

.forecast-line-chart{
  height:126px;
}

.chart-area-fill.forecast-blue-fill{
  fill:rgba(41,169,255,.09);
}

.forecast-main-line{
  stroke:#38bfff;
  stroke-width:1.75;
  filter:drop-shadow(0 0 4px rgba(56,191,255,.78));
}

.forecast-current-guide{
  fill:none;
  stroke:rgba(56,191,255,.38);
  stroke-width:1;
  stroke-dasharray:3 3;
  vector-effect:non-scaling-stroke;
}

.forecast-current-value{
  right:0;
  top:10px;
  font-size:13px;
  line-height:1;
  font-weight:700;
  text-shadow:0 0 7px rgba(56,191,255,.75);
}

.forecast-time-axis{
  padding-right:0;
  font-size:9.5px;
}

.forecast-note{ font-size:9px; color:#8fa9b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.forecast-summary-row{
  flex:0 0 auto;
  margin-top:6px;
}

.forecast-metric-box{
  min-height:50px;
  padding:7px 8px;
}

.forecast-metric-box span{
  font-size:10px;
}

.forecast-metric-box strong{
  margin-top:2px;
  font-size:12px;
}

.forecast-range-toggle .q-btn.q-btn--active{
  color:#41c9ff !important;
  background:rgba(30,133,226,.18) !important;
  box-shadow:inset 0 -1px 0 rgba(66,200,255,.45);
}
</style>
