<template>
  <l-map
    :zoom="13"
    :center="[46.3851, 16.4358]"
    style="height: 100%; width:100%;"
  >

    <l-tile-layer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />

    <l-marker
      v-for="station in stations"
      :key="station.station_id"
      :lat-lng="getLatLng(station)"
    >
      <l-popup>
        <div>
          <b>{{ station.station_name }}</b>

          <hr />
            {{ station.electrical?.voltage_kv }} kV <br />
            {{ station.electrical?.current_a }} A <br />
            {{ station.thermal?.oil_temp_c }} °C <br />
            THD: {{ station.electrical?.harmonics_thd }} % <br />

          <div v-if="station.alarms?.overload || station.alarms?.overheating" style="color: red; font-weight: bold">
            🔴 ALARM ACTIVE
          </div>
        </div>
      </l-popup>
    </l-marker>
  </l-map>
</template>

<script setup>
import {
  LMap,
  LTileLayer,
  LMarker,
  LPopup
} from '@vue-leaflet/vue-leaflet'

defineProps({
  stations: Array
})

function getLatLng(station) {
  const loc = station.location

  if (!loc) return [0, 0]

  if (typeof loc === 'string') {
    const match = loc.match(/\((.*),(.*)\)/)

    if (!match) return [0, 0]

    return [
      parseFloat(match[2]),
      parseFloat(match[1])
    ]
  }

  if (loc.coordinates) {
    return [
      loc.coordinates[1],
      loc.coordinates[0]
    ]
  }

  return [0, 0]
}
</script>