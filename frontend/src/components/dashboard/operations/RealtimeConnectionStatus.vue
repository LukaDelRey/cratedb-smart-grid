<template>
  <q-card
    bordered
    class="connection-card row items-center justify-end q-gutter-md text-white q-pa-md"
    flat
    style="min-height: 68px"
  >
    <div class="row items-center q-gutter-sm">
      <q-icon
        size="22px"
        :color="statusColor"
        :name="connection.websocketConnected ? 'wifi' : 'wifi_off'"
      />

      <div>
        <div class="text-caption text-blue-grey-3">{{ t('dashboard.realtimeFeed') }}</div>

        <div class="text-weight-bold">{{ t(connection.quality.toUpperCase()) }}</div>
      </div>
    </div>

    <q-separator
      dark
      vertical
    />

    <div class="status-pill">
      <span class="block">EMQX</span>

      <strong
        class="text-body2 text-weight-bold block"
        :class="connection.mqttConnected ? 'text-positive' : 'text-negative'"
      >
        {{ connection.mqttConnected ? t('dashboard.online') : t('dashboard.offline') }}
      </strong>
    </div>

    <div class="status-pill">
      <span class="block">CrateDB</span>

      <strong
        class="text-body2 text-weight-bold block"
        :class="connection.crateConnected ? 'text-positive' : 'text-negative'"
      >
        {{ connection.crateConnected ? `${connection.latencyMs} ms` : t('dashboard.down') }}
      </strong>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from '../../../i18n';

const { t } = useI18n();

const props = defineProps({
  connection: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
});

const statusColor = computed(() => {
  if (props.connection.quality === 'excellent') return 'positive';

  if (props.connection.quality === 'degraded') return 'warning';

  return 'negative';
});
</script>
