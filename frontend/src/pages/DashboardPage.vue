<!-- <template>
  <div class="dashboard">
    <div class="left">
      <AlarmPanel :alarms="store.alarms" />
    </div>

    <div class="right">
      <div class="map-container">
        <MapView
          :stations="store.stations"
        />
      </div>

      <div class="chart-container">

        <SensorChart
          :data="
            store.stations.length
              ? (
                  store.history[
                    store.stations[0].station_id
                  ] || []
                )
              : []
          "
        />

      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useSensorStore } from '../stores/sensorStore.js'
import 'leaflet/dist/leaflet.css'
import MapView from '../components/MapView.vue'
import AlarmPanel from '../components/AlarmPanel.vue'
import SensorChart from '../components/SensorChart.vue'

const store = useSensorStore()

onMounted(() => {
  store.connectWebSocket()
})
</script>

<style>
.dashboard {
  display: flex;
  height: 100vh;
}

.left {
  width: 25%;
}

.right {
  width: 75%;

  display: flex;
  flex-direction: column;
}

.map-container {
  height: 60%;
}

.chart-container {
  height: 40%;
}
</style> -->


<template>

<div class="layout">

  <Sidebar />

  <div class="content">

    <Topbar />

    <div class="dashboard-grid">

      <div class="map-section">

        <GridMap
          :stations="store.stations"
        />

      </div>

      <div class="right-section">

        <BlackoutPredictionCard
          :stations="store.stations"
          :alarms="store.alarms"
        />

        <AlarmCorrelationPanel
          :alarms="store.alarms"
        />

      </div>

    </div>

    <div class="bottom">

      <KPIGrid
        :alarms="store.alarms"
      />

    </div>

  </div>

</div>

</template>

<script setup>

import { onMounted } from 'vue'

import { useSensorStore }
from '../stores/sensorStore'

import Sidebar
from '../components/layout/Sidebar.vue'

import Topbar
from '../components/layout/Topbar.vue'

import GridMap
from '../components/map/GridMap.vue'

import KPIGrid
from '../components/cards/KPIGrid.vue'

import BlackoutPredictionCard from '../components/cards/BlackoutPredictionCard.vue'

import AlarmCorrelationPanel
from '../components/alarm/AlarmCorrelationPanel.vue'

const store = useSensorStore()

onMounted(() => {

  store.connectWebSocket()
})

</script>

<style scoped>

.layout{
  display:flex;
  height:100vh;
}

.content{
  flex:1;
  display:flex;
  flex-direction:column;
  padding:20px;
  gap:20px;
}

.dashboard-grid{
  flex:1;
  display:grid;
  grid-template-columns:2.3fr 1fr;
  gap:20px;
}

.map-section{
  min-height:700px;
}

.right-section{
  display:flex;
  flex-direction:column;
  gap:20px;
}

.bottom{
  height:160px;
}

</style>


