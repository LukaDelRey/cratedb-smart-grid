<template>
  <section class="operator-kpi-row">
    <q-card v-for="metric in metrics" :key="metric.label" flat bordered class="operator-kpi-card">
      <q-card-section>
        <div class="section-kicker">{{ metric.label }}</div>
        <div class="operator-kpi-value">{{ metric.value }}<small>{{ metric.unit }}</small></div>
        <div :class="['operator-kpi-trend', metric.trendClass]">{{ metric.trend }}</div>
        <svg class="mini-line-chart q-mt-xs" viewBox="0 0 140 42" preserveAspectRatio="none">
          <polyline :points="metricLinePoints(metric.spark, 140, 42)" :class="['glow-line', metric.chartClass]" />
        </svg>
      </q-card-section>
    </q-card>
  </section>
</template>
<script setup lang="ts">
import { metricLinePoints } from '../../../utils/metricSeries'
import type { useOperatorMetrics } from '../../../composables/useOperatorMetrics'
defineProps<{ metrics: ReturnType<typeof useOperatorMetrics>['operatorMetrics']['value'] }>()
</script>
<style scoped>
.operator-kpi-row{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;min-width:0;min-height:0}
.operator-kpi-card{min-width:0;color:#f5fbff;border-color:rgba(64,196,255,.14);border-radius:8px;background:linear-gradient(180deg,rgba(9,20,32,.94),rgba(5,12,22,.96));box-shadow:0 16px 42px rgba(0,0,0,.22)}
.operator-kpi-card .q-card__section{padding:8px}
.operator-kpi-value{margin-top:4px;font-size:21px;line-height:1.05;font-weight:900;font-variant-numeric:tabular-nums}
.operator-kpi-value small{margin-left:4px;color:#c1d5df;font-size:12px;font-weight:600}
.operator-kpi-trend{min-height:16px;margin-top:5px;font-size:11px}
.mini-line-chart{width:100%;height:34px}
@media(max-width:1320px){.operator-kpi-row{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:820px){.operator-kpi-row{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.operator-kpi-row{grid-template-columns:minmax(0,1fr)}}
</style>
