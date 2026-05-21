<template>
    <div>
        <h2>ALARMS</h2>
        <div
            v-for="sensor in sensors.filter(isAlarm)"
            :key="sensor.timestamp"
            style="background:red; color:white; margin:10px; padding:10px"
        >

            <strong>{{ sensor.station_name }}</strong>

            <p>ALARM DETECTED</p>

        </div>
    </div>
</template>

<script setup>

defineProps({
  sensors: Array
})

const isAlarm = (sensor) => {

  return (
    sensor.electrical.voltage_kv > 10.4 ||
    sensor.thermal.oil_temp_c > 80 ||
    sensor.oil_gas.hydrogen_ppm > 20
  )
}

</script>
