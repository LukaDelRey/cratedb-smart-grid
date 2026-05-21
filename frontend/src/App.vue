<template>
  <div>
    <h1>SCADA Dashboard</h1>

    <div
      v-for="sensor in sensorStore.sensors"
      :key="sensor.timestamp"
      style="border:1px solid gray; margin:10px; padding:10px"
    >

      <h3>{{ sensor.station_name }}</h3>

      <p>Voltage: {{ sensor.electrical?.voltage_kv ?? '-' }} kV</p>
      <p>Current: {{ sensor.electrical?.current_a ?? '-' }} A</p>
      <p>Oil Temp: {{ sensor.thermal?.oil_temp_c ?? '-' }} °C</p>
    </div>
  </div>

  <AlarmPanel :sensors="sensorStore.sensors" />

  <VoltageChart :sensors="sensorStore.sensors" />
</template>

<script setup>
import { onMounted } from 'vue'
import { useSensorStore } from './stores/sensorStore'
import AlarmPanel from './components/AlarmPanel.vue'
import VoltageChart from './components/VoltageChart.vue'

const sensorStore = useSensorStore()

onMounted(() => {
  sensorStore.connectWebSocket()
})

</script>
