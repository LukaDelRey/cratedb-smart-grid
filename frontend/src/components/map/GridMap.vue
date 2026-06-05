<template>

<div class="map-wrapper panel">

  <div class="map-overlay">

    <div class="legend panel">

      <div class="panel-title">
        MAP LAYERS
      </div>

      <div class="legend-item">
        🟢 Normal
      </div>

      <div class="legend-item">
        🟠 Warning
      </div>

      <div class="legend-item">
        🔴 Critical
      </div>

    </div>

  </div>

  <l-map
    :zoom="9"
    :center="[46.3844,16.4339]"
    style="height:100%;width:100%"
    :zoomControl="false"
  >

    <l-tile-layer
      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    />

    <!-- POWER LINES -->

    <l-polyline
      v-for="line in powerLines"
      :key="line.id"
      :lat-lngs="line.points"
      :color="line.color"
      :weight="2"
      :opacity="0.8"
    />

    <!-- STATIONS -->

    <l-circle-marker
      v-for="station in stations"
      :key="station.station_id"
      :lat-lng="getLatLng(station)"
      :radius="getRadius(station)"
      :color="getColor(station)"
      :fillOpacity="0.8"
    >

      <l-popup>

        <div class="popup">

          <h2>
            {{ station.station_id }}
          </h2>

          <div class="station-name">
            {{ station.station_name }}
          </div>

          <hr>

          <div class="metric">
            Voltage
            <span>
              {{ station.electrical?.voltage_kv }} kV
            </span>
          </div>

          <div class="metric">
            Current
            <span>
              {{ station.electrical?.current_a }} A
            </span>
          </div>

          <div class="metric">
            Oil Temp
            <span>
              {{ station.thermal?.oil_temp_c }} °C
            </span>
          </div>

          <div class="metric">
            Health Score
            <span class="green">
              {{ getHealth(station) }}%
            </span>
          </div>

          <div
            v-if="isCritical(station)"
            class="critical"
          >
            AI PREDICTION:
            High overload probability
          </div>

        </div>

      </l-popup>

    </l-circle-marker>

  </l-map>

</div>

</template>

<script setup>

import {
  LMap,
  LTileLayer,
  LCircleMarker,
  LPopup,
  LPolyline
} from '@vue-leaflet/vue-leaflet'

const props = defineProps({
  stations:Array
})

function getLatLng(station){

  const loc = station.location

  const match =
    loc.match(/\((.*),(.*)\)/)

  return [
    parseFloat(match[2]),
    parseFloat(match[1])
  ]
}

function getColor(station){

  if(
    station.thermal?.oil_temp_c > 90
  ){
    return '#ff1744'
  }

  if(
    station.electrical?.current_a > 500
  ){
    return '#ff9100'
  }

  return '#00e676'
}

function getRadius(station){

  const current =
    station.electrical?.current_a || 0

  return Math.max(
    5,
    current / 80
  )
}

function isCritical(station){

  return (
    station.thermal?.oil_temp_c > 90 ||
    station.electrical?.current_a > 500
  )
}

function getHealth(station){

  let score = 100

  score -=
    station.thermal?.oil_temp_c * 0.3

  if(
    station.electrical?.current_a > 500
  ){
    score -= 20
  }

  return Math.max(
    0,
    Math.round(score)
  )
}

const powerLines = [

  {
    id:1,
    color:'#00b0ff',
    points:[
      [46.4,16.1],
      [46.35,16.3],
      [46.5,16.5]
    ]
  },

  {
    id:2,
    color:'#76ff03',
    points:[
      [46.3,16.2],
      [46.45,16.4],
      [46.55,16.7]
    ]
  }
]

</script>

<style scoped>

.map-wrapper{
  height:100%;
  position:relative;
  overflow:hidden;
}

.map-overlay{
  position:absolute;
  z-index:1000;
  top:20px;
  left:20px;
}

.legend{
  width:220px;
  padding:20px;
}

.legend-item{
  margin-top:12px;
}

.popup{
  min-width:260px;
}

.station-name{
  color:#90a4ae;
  margin-bottom:10px;
}

.metric{
  display:flex;
  justify-content:space-between;
  margin:10px 0;
}

.critical{
  margin-top:14px;
  color:#ff5252;
  font-weight:700;
}

</style>
