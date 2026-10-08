<template>
  <section
    class="operator-kpi-row scada-gap-10 scada-min-width-0 scada-min-height-0"
    style="display: grid"
  >
    <q-card
      v-for="metric in metrics"
      bordered
      class="operator-kpi-card"
      flat
      style="min-width: 0"
      :key="metric.label"
    >
      <q-card-section class="q-pa-sm">
        <div class="section-kicker text-weight-bold text-uppercase">{{ metric.label }}</div>

        <div
          class="operator-kpi-value q-mt-xs text-weight-bolder text-h6"
          style="line-height: 1.05"
        >
          {{ metric.value }}
          <small class="q-ml-xs text-weight-bold text-caption">{{ metric.unit }}</small>
        </div>

        <div
          class="q-mt-xs"
          style="min-height: 16px; font-size: 11px"
          :class="['operator-kpi-trend', metric.trendClass]"
        >
          {{ metric.trend }}
        </div>

        <svg
          class="mini-line-chart q-mt-xs full-width"
          preserveAspectRatio="none"
          style="height: 34px"
          viewBox="0 0 140 42"
        >
          <polyline
            :class="['glow-line', metric.chartClass]"
            :points="metricLinePoints(metric.spark, 140, 42)"
          />
        </svg>
      </q-card-section>
    </q-card>
  </section>
</template>
<script setup lang="ts">
// Keep component selector isolation for the shared stylesheet.
defineOptions({ __scopeId: 'data-v-ui-3ea0b891' });

import { metricLinePoints } from '../../../utils/metricSeries';
import type { useOperatorMetrics } from '../../../composables/useOperatorMetrics';

defineProps<{ metrics: ReturnType<typeof useOperatorMetrics>['operatorMetrics']['value'] }>();
</script>
