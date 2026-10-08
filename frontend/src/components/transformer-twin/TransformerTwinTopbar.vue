<template>
  <header
    class="tt-topbar row no-wrap justify-between q-gutter-x-md q-ml-none"
    style="
      min-height: 58px;
      border-bottom: 1px solid rgba(91, 136, 174, 0.18);
      background: linear-gradient(180deg, rgba(5, 13, 24, 0.92), rgba(5, 13, 24, 0.78));
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
      backdrop-filter: blur(16px);
    "
  >
    <div
      class="breadcrumbs items-center text-body2 row no-wrap"
      style="min-width: 0; letter-spacing: 0"
    >
      <span>{{ stationName }}</span>

      <q-icon
        name="chevron_right"
        size="18px"
      />

      <span>{{ transformer?.id || 'TR-01' }}</span>

      <q-icon
        name="chevron_right"
        size="18px"
      />

      <strong class="text-weight-bold text-subtitle1">{{ activeSection }}</strong>
    </div>

    <div
      class="topbar-actions items-center row no-wrap"
      style="min-width: 0"
    >
      <span class="online-pill items-center q-py-xs q-px-md text-weight-bold row inline no-wrap">
        <i style="width: 7px; height: 7px" />
        Online
      </span>

      <span class="clock q-py-none q-px-md">{{ lastUpdate }}</span>

      <q-btn
        color="blue-grey-3"
        dense
        flat
        icon="notifications"
        round
      >
        <q-badge
          color="negative"
          floating
        >
          12
        </q-badge>
      </q-btn>

      <q-btn
        color="blue-grey-3"
        dense
        flat
        icon="help_outline"
        round
      />

      <q-btn
        color="blue-grey-3"
        dense
        flat
        icon="light_mode"
        round
      />

      <span class="admin">admin</span>

      <q-icon
        name="keyboard_arrow_down"
        size="18px"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
// Keep component selector isolation for the shared stylesheet.
defineOptions({ __scopeId: 'data-v-ui-7a03ef41' });

import { computed } from 'vue';
import type { PropType } from 'vue';

const props = defineProps({
  transformer: {
    type: Object as PropType<Record<string, any>>,
    default: null,
  },
  station: {
    type: Object as PropType<Record<string, any>>,
    default: null,
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

const stationName = computed(
  () => props.station?.station_name || props.transformer?.substation || 'Substation 110/20kV',
);
</script>
