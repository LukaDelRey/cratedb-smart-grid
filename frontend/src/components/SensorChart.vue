<template>

  <v-chart
    class="chart"
    :option="chartOption"
    autoresize
  />

</template>

<script setup lang="ts">

import { computed } from 'vue'
import type { PropType } from 'vue'
import VChart from 'vue-echarts'

const props = defineProps({
  data: {
    type:Array as PropType<any[]>,
    default: () => []
  }
})

const chartOption = computed(() => ({

  title: {
    text: 'Oil Temperature Trend'
  },

  tooltip: {
    trigger: 'axis'
  },

  xAxis: {
    type: 'category',
    data: props.data.map((_, i) => i)
  },

  yAxis: {
    type: 'value'
  },

  series: [
    {
      type: 'line',
      smooth: true,
      data: props.data.map(d => d.temp)
    }
  ]
}))

</script>

<style>
.chart{
  width:100%;
  height:300px;
}
</style>
