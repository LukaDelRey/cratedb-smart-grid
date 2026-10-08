<template>
  <div>
    <h2>Voltage Trend</h2>

    <pre>{{ chartData }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Station } from '../../types/dashboard';

const props = defineProps<{
  sensors: Station[];
}>();

const chartData = computed(() => {
  return props.sensors
    .slice(0, 20)
    .reverse()
    .map((sensor) => sensor.electrical?.voltage_kv);
});
</script>
