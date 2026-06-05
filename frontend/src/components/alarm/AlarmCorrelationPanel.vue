<template>

  <div class="card">

    <h2>
      Alarm Correlation Engine
    </h2>

    <div
      v-for="alarm in alarms.slice(0, 10)"
      :key="alarm.station_id"
      class="alarm-item"
    >

      <div>

        <b>
          {{ alarm.station_name }}
        </b>

        <div>
          Root Cause:
          {{ getCause(alarm) }}
        </div>

      </div>

      <div class="severity">
        {{ getSeverity(alarm) }}
      </div>

    </div>

  </div>

</template>

<script setup>

defineProps({
  alarms: Array
})

function getCause(alarm) {

  if (alarm.alarms?.overheating) {
    return 'Cooling Failure'
  }

  if (alarm.alarms?.overload) {
    return 'Transformer Overload'
  }

  if (alarm.alarms?.voltage_drop) {
    return 'Grid Instability'
  }

  return 'Unknown'
}

function getSeverity(alarm) {

  if (alarm.alarms?.overheating) {
    return 'CRITICAL'
  }

  if (alarm.alarms?.overload) {
    return 'WARNING'
  }

  return 'INFO'
}

</script>

<style scoped>

.card{
  background:#1e1e1e;
  border-radius:16px;
  padding:20px;
  border:1px solid #333;
}

.alarm-item{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:12px 0;
  border-bottom:1px solid #333;
}

.severity{
  color:#ff5252;
  font-weight:bold;
}

</style>