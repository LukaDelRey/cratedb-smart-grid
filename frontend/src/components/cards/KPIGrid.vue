<template>

<div class="grid">

  <div class="panel card">
    <div class="panel-title">
      TOTAL LOAD
    </div>

    <div class="metric-value">
      4.82 GW
    </div>

    <div class="green">
      +4.2%
    </div>
  </div>

  <div class="panel card">
    <div class="panel-title">
      FREQUENCY
    </div>

    <div class="metric-value">
      50.02 Hz
    </div>
  </div>

  <div class="panel card">
    <div class="panel-title">
      VOLTAGE STABILITY
    </div>

    <div class="metric-value">
      98.5%
    </div>
  </div>

  <div class="panel card">
    <div class="panel-title">
      ACTIVE ALARMS
    </div>

    <div class="metric-value red">
      {{ alarms.length }}
    </div>
  </div>

</div>

</template>

<script setup>

defineProps({
  alarms:Array
})

</script>

<style scoped>

.grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:18px;
}

.card{
  padding:20px;
  height:140px;
}

</style>
