<template>
    <div>
        <h2>Voltage Trend</h2>

        <pre>{{ chartData }}</pre>
    </div>
</template>

<script setup>

import { computed } from 'vue'

const props = defineProps({
  sensors: Array
})

const chartData = computed(() => {

  return props.sensors
    .slice(0, 20)
    .reverse()
    .map(sensor => sensor.electrical.voltage_kv)
})

</script>