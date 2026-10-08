<template>
  <q-card
    bordered
    class="scada-card full-height q-pa-md"
    flat
  >
    <div class="section-title text-subtitle1 text-weight-bold">SCADA ALARMS</div>

    <div class="text-caption text-blue-grey-3 q-mb-md">Active alarms: {{ alarms.length }}</div>

    <q-list dense>
      <q-item
        v-for="alarm in alarms"
        class="alarm-list-item scada-list-item q-mb-sm"
        :key="alarm.station_id"
      >
        <q-item-section avatar>
          <q-icon
            color="negative"
            name="report"
          />
        </q-item-section>

        <q-item-section>
          {{ alarm.station_name }}
        </q-item-section>
      </q-item>
    </q-list>
  </q-card>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';

defineProps({
  alarms: {
    type: Array as PropType<any[]>,
    default: () => [],
  },
});
</script>
