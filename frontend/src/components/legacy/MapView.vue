<template>
  <l-map
    class="fit"
    :center="[46.3851, 16.4358]"
    :zoom="13"
  >
    <l-tile-layer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

    <l-marker
      v-for="station in stations"
      :key="station.station_id"
      :lat-lng="getLatLng(station)"
    >
      <l-popup>
        <q-card
          class="station-popup-card"
          flat
          style="width: 120px"
        >
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold">
              {{ station.station_name }}
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <div class="row justify-between">
              <span>Voltage</span>

              <span>{{ station.electrical?.voltage_kv }} kV</span>
            </div>

            <div class="row justify-between">
              <span>Current</span>

              <span>{{ station.electrical?.current_a }} A</span>
            </div>

            <div class="row justify-between">
              <span>Oil Temp</span>

              <span>{{ station.thermal?.oil_temp_c }} °C</span>
            </div>

            <div class="row justify-between">
              <span>THD</span>

              <span>{{ station.electrical?.harmonics_thd }} %</span>
            </div>

            <div
              v-if="station.alarms?.overload || station.alarms?.overheating"
              class="text-negative text-weight-bold q-mt-md"
            >
              🔴 ALARM ACTIVE
            </div>
          </q-card-section>
        </q-card>
      </l-popup>
    </l-marker>
  </l-map>
</template>

<script setup lang="ts">
import { LMap, LTileLayer, LMarker, LPopup } from '@vue-leaflet/vue-leaflet';
import type { Station } from '../../types/dashboard';

defineProps<{
  stations: Station[];
}>();

function getLatLng(station: Station) {
  const loc = station.location;

  if (!loc) return [0, 0];

  if (typeof loc === 'string') {
    const match = loc.match(/\((.*),(.*)\)/);

    if (!match) return [0, 0];

    return [parseFloat(match[2]), parseFloat(match[1])];
  }

  if (loc.coordinates) {
    return [loc.coordinates[1], loc.coordinates[0]];
  }

  return [0, 0];
}
</script>
