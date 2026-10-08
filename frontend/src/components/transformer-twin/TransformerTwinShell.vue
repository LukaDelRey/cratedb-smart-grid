<template>
  <q-layout
    class="tt-layout"
    view="lHh Lpr lFf"
  >
    <Sidebar />

    <q-page-container>
      <q-page class="tt-page no-wrap column">
        <TransformerTwinTopbar
          :active-section="activeSection"
          :last-update="lastUpdate"
          :station="station"
          :transformer="transformer"
        />

        <slot />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
// Keep component selector isolation for the shared stylesheet.
defineOptions({ __scopeId: 'data-v-ui-1bde832a' });

import type { PropType } from 'vue';
import Sidebar from '../layout/Sidebar.vue';
import TransformerTwinTopbar from './TransformerTwinTopbar.vue';

defineProps({
  transformer: {
    type: Object as PropType<Record<string, any>>,
    default: null,
  },
  station: {
    type: Object as PropType<Record<string, any>>,
    default: null,
  },
  activeAlarms: {
    type: Number,
    default: 0,
  },
  activeSection: {
    type: String,
    default: 'Overview',
  },
  lastUpdate: {
    type: String,
    default: '14:32:18',
  },
});
</script>
