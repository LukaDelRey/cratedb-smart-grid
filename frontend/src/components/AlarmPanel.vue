<template>
  <q-card flat bordered class="scada-card full-height q-pa-md">
    <div class="section-title">SCADA ALARMS</div>

    <div class="text-caption text-blue-grey-3 q-mb-md">
      Active alarms: {{ alarms.length }}
    </div>

    <q-list dense>
      <q-item
        v-for="alarm in alarms"
        :key="alarm.station_id"
        class="alarm-list-item scada-list-item"
      >
        <q-item-section avatar>
          <q-icon name="report" color="negative" />
        </q-item-section>

        <q-item-section>
          {{ alarm.station_name }}
        </q-item-section>
      </q-item>
    </q-list>
  </q-card>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
defineProps({
  alarms:{
    type:Array as PropType<any[]>,
    default:() => []
  }
})
</script>

<style>
.alarm-list-item{
  background:#2b0f12;
  border-left:4px solid #ff5252;
}
</style>
