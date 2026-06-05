<template>

  <div class="card">

    <h2>AI Blackout Prediction</h2>

    <div class="risk">
      {{ risk }}%
    </div>

    <div class="label">
      {{ riskLabel }}
    </div>

    <hr>

    <p>
      Critical Stations:
      {{ criticalCount }}
    </p>

    <p>
      Active Alarms:
      {{ alarms.length }}
    </p>

  </div>

</template>

<script setup>

import { computed } from 'vue'

const props = defineProps({
  stations: Array,
  alarms: Array
})

const criticalCount = computed(() =>
  props.stations.filter(
    s =>
      s.thermal?.oil_temp_c > 90 ||
      s.electrical?.current_a > 500
  ).length
)

const risk = computed(() => {

  let score = 5

  score += props.alarms.length * 2

  score += criticalCount.value * 4

  return Math.min(100, score)
})

const riskLabel = computed(() => {

  if (risk.value > 70) return 'CRITICAL'

  if (risk.value > 40) return 'WARNING'

  return 'LOW'
})

</script>

<style scoped>

.card{
  background:#1e1e1e;
  border-radius:16px;
  padding:20px;
  border:1px solid #333;
}

.risk{
  font-size:64px;
  font-weight:bold;
  color:#ff5252;
}

.label{
  font-size:24px;
}

</style>