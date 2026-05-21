<template>
  <l-map
    :zoom="13"
    :center="[46.3851, 16.4358]"
    style="height: 100vh"
  >
    <l-tile-layer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />

    <l-marker
      v-for="station in stations"
      :key="station.id"
      :lat-lng="[station.lat, station.lon]"
    >
      <l-popup>
        <b>{{ station.name }}</b><br />
        {{ station.id }}
      </l-popup>
    </l-marker>
  </l-map>
</template>

<script setup>
import { ref, onMounted } from "vue"

import {
  LMap,
  LTileLayer,
  LMarker,
  LPopup
} from "@vue-leaflet/vue-leaflet"

import "leaflet/dist/leaflet.css"

const stations = ref([])

onMounted(async () => {
  const response = await fetch("http://localhost:8000/stations")
  stations.value = await response.json()
})
</script>