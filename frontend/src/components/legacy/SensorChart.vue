<template>
  <v-chart
    autoresize
    class="sensor-chart full-width"
    style="height: 300px"
    :option="chartOption"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import VChart from 'vue-echarts';

const props = defineProps({
  data: {
    type: Array as PropType<any[]>,
    default: () => [],
  },
});

const chartOption = computed(() => ({
  title: {
    text: 'Oil Temperature Trend',
  },

  tooltip: {
    trigger: 'axis',
  },

  xAxis: {
    type: 'category',
    data: props.data.map((_, i) => i),
  },

  yAxis: {
    type: 'value',
  },

  series: [
    {
      type: 'line',
      smooth: true,
      data: props.data.map((d) => d.temp),
    },
  ],
}));
</script>
