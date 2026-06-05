<template>

  <div class="kpi-grid">

    <div class="kpi-card">
      <h3>Stations</h3>
      <div class="value">
        {{ stations.length }}
      </div>
    </div>

    <div class="kpi-card">
      <h3>Active Alarms</h3>
      <div class="value red">
        {{ alarms.length }}
      </div>
    </div>

    <div class="kpi-card">
      <h3>Critical</h3>
      <div class="value orange">
        {{ criticalStations.length }}
      </div>
    </div>

    <div class="kpi-card">
      <h3>Avg Voltage</h3>
      <div class="value">
        {{ avgVoltage }} kV
      </div>
    </div>

    <div class="kpi-card">
      <h3>Avg Temp</h3>
      <div class="value">
        {{ avgTemperature }} °C
      </div>
    </div>

    <div class="kpi-card">
      <h3>Grid Health</h3>
      <div class="value green">
        {{ gridHealth }}%
      </div>
    </div>

  </div>

</template>

<script setup>

defineProps({
  stations: Array,
  alarms: Array,
  criticalStations: Array,
  avgVoltage: String,
  avgTemperature: String,
  gridHealth: Number
})

</script>

<style scoped>

.kpi-grid{
  display:grid;
  grid-template-columns:repeat(6,1fr);
  gap:16px;
}

.kpi-card{
  background:#1e1e1e;
  padding:20px;
  border-radius:12px;
  border:1px solid #333;
}

.value{
  font-size:28px;
  font-weight:bold;
}

.red{
  color:#ff5252;
}

.orange{
  color:#ff9800;
}

.green{
  color:#00e676;
}

</style>
