<!-- <template>

<div class="grid-map-panel panel">
  <div class="map-overlay">

    <q-card
      flat
      class="grid-map-legend panel"
    >

      <q-card-section>

        <div class="text-subtitle1 text-weight-bold">
          MAP LAYERS
        </div>

        <div class="q-mt-md">
          🟢 Normal
        </div>

        <div class="q-mt-sm">
          🟠 Warning
        </div>

        <div class="q-mt-sm">
          🔴 Critical
        </div>

      </q-card-section>

    </q-card>

  </div>

  <l-map
    :zoom="9"
    :center="[46.3844,16.4339]"
    class="fit"
    :zoomControl="false"
  >

    <l-tile-layer
      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    />


    <l-polyline
      v-for="line in powerLines"
      :key="line.id"
      :lat-lngs="line.points"
      :color="line.color"
      :weight="2"
      :opacity="0.8"
    />

    <l-circle-marker
      v-for="station in stations"
      :key="station.station_id"
      :lat-lng="getLatLng(station)"
      :radius="getRadius(station)"
      :color="getColor(station)"
      :fillOpacity="0.8"
    >

      <l-popup>

        <q-card flat class="grid-popup-card">

          <q-card-section>

            <div class="text-h6">
              {{ station.station_id }}
            </div>

            <div class="text-grey-6">
              {{ station.station_name }}
            </div>

          </q-card-section>

          <q-separator />

          <q-card-section>

            <div class="row justify-between q-mb-sm">
              <span>Voltage</span>
              <span>
                {{ station.electrical?.voltage_kv }} kV
              </span>
            </div>

            <div class="row justify-between q-mb-sm">
              <span>Current</span>
              <span>
                {{ station.electrical?.current_a }} A
              </span>
            </div>

            <div class="row justify-between q-mb-sm">
              <span>Oil Temp</span>
              <span>
                {{ station.thermal?.oil_temp_c }} °C
              </span>
            </div>

            <div class="row justify-between">
              <span>Health Score</span>

              <span class="text-positive text-weight-bold">
                {{ getHealth(station) }}%
              </span>
            </div>

            <div
              v-if="isCritical(station)"
              class="text-negative text-weight-bold q-mt-md"
            >
              AI PREDICTION:
              High overload probability
            </div>

          </q-card-section>

        </q-card>

      </l-popup>

    </l-circle-marker>

  </l-map>

</div>

</template>

<script setup lang="ts">

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

</script> -->

<style>
.grid-map-panel{
  height:100%;
  position:relative;
  overflow:hidden;
}

.grid-map-legend{
  width:220px;
}

.grid-popup-card{
  min-width:260px;
}

.map-overlay{
  position:absolute;
  z-index:1000;
  top:20px;
  left:20px;
}
</style>
