<template>
  <div class="alarm-panel">

    <h2>SCADA ALARMS</h2>

    <div class="counter">
      Active alarms: {{ alarms.length }}
    </div>

    <div v-for="a in alarms" :key="a.station_id" class="alarm-item">
      🔴 {{ a.station_name }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  alarms: {
    type: Array,
    default: () => []
  }
})
</script>

<style scoped>
.alarm-panel {
  height: 100%;
  padding: 15px;
  background: #15171c;
  color: white;
}

.counter {
  margin-bottom: 15px;
}

.alarm-item {
  padding: 8px;
  margin-bottom: 5px;
  background: #2b0f12;
  border-left: 4px solid red;
}
</style>