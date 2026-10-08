<template>
  <q-dialog v-model="dialog">
    <q-card
      class="topology-dialog text-white"
      style="width: min(820px, calc(100vw - 32px))"
    >
      <q-card-section class="row items-center justify-between q-pa-md">
        <div>
          <div class="section-kicker-light text-caption text-weight-bold text-uppercase">
            {{ t('dashboard.systemTopology') }}
          </div>
        </div>

        <q-btn
          v-close-popup
          dense
          flat
          icon="close"
          round
        />
      </q-card-section>

      <q-card-section class="q-pa-md q-pt-none">
        <div
          class="topology-score items-center"
          style="display: grid; grid-template-columns: 100px 1fr; gap: 18px"
        >
          <q-circular-progress
            class="text-white text-weight-bold"
            color="positive"
            show-value
            size="90px"
            track-color="blue-grey-10"
            :value="topology.platformHealth"
          >
            {{ topology.platformHealth }}%
          </q-circular-progress>

          <div>
            <div class="text-h6">{{ t('dashboard.overallPlatformHealth') }}</div>

            <div class="text-blue-grey-3">
              {{ t('dashboard.locustEmqxFastapiCratedbAndVueDashboardStatus') }}
            </div>
          </div>
        </div>

        <div
          class="realtime-health-grid q-mt-md scada-gap-8"
          style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr))"
        >
          <div
            v-for="item in realtimeItems"
            class="realtime-health-tile q-pa-sm"
            style="
              display: grid;
              grid-template-columns: 24px 1fr;
              gap: 3px 8px;
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 8px;
              background: rgba(255, 255, 255, 0.03);
            "
            :key="item.label"
          >
            <q-icon
              size="22px"
              :color="item.color"
              :name="item.icon"
            />

            <span
              class="overflow-hidden text-no-wrap"
              style="min-width: 0; font-size: 11px"
            >
              {{ item.label }}
            </span>

            <strong
              class="overflow-hidden text-no-wrap text-body2 text-weight-bold"
              style="min-width: 0; grid-column: 2"
              :class="`text-${item.color}`"
            >
              {{ item.value }}
            </strong>
          </div>
        </div>

        <q-banner
          v-if="lastError"
          class="topology-warning q-mt-md"
          dense
          rounded
        >
          <template #avatar>
            <q-icon
              color="warning"
              name="warning"
            />
          </template>
          {{ lastError }}
        </q-banner>

        <div
          class="topology-grid q-mt-lg scada-gap-12"
          style="display: grid"
        >
          <div
            v-for="node in topology.nodes"
            class="topology-node scada-gap-12 items-center q-pa-md"
            style="
              grid-template-columns: 32px 1fr auto;
              border: 1px solid rgba(255, 255, 255, 0.07);
              border-radius: 8px;
              background: rgba(255, 255, 255, 0.03);
            "
            :key="node.id"
          >
            <q-icon
              color="cyan"
              size="26px"
              :name="nodeIcon(node.id)"
            />

            <div>
              <strong>{{ translateText(node.label) }}</strong>

              <span class="block text-caption">{{ translateText(node.metric) }}</span>
            </div>

            <q-badge :color="nodeStatusColor(node.status)">
              {{ translateStatus(node.status) }}
            </q-badge>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from '../../i18n';

const { t, translateText, translateStatus } = useI18n();

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  topology: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
  connection: {
    type: Object as PropType<Record<string, any>>,
    default: () => ({
      websocketConnected: false,
      crateConnected: false,
      mqttConnected: false,
      latencyMs: 0,
      messagesPerSecond: 0,
      lastEventAt: null,
      quality: 'offline',
    }),
  },
  lastError: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue']);

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const realtimeItems = computed(() => [
  {
    label: t('dashboard.realtimeFeed'),
    value: t(props.connection.quality?.toUpperCase?.() || 'OFFLINE'),
    icon: props.connection.websocketConnected ? 'wifi' : 'wifi_off',
    color: props.connection.websocketConnected ? 'positive' : 'negative',
  },
  {
    label: 'EMQX',
    value: props.connection.mqttConnected ? t('dashboard.online') : t('dashboard.offline'),
    icon: 'router',
    color: props.connection.mqttConnected ? 'positive' : 'negative',
  },
  {
    label: 'CrateDB',
    value: props.connection.crateConnected
      ? `${props.connection.latencyMs} ms`
      : t('dashboard.down'),
    icon: 'storage',
    color: props.connection.crateConnected ? 'positive' : 'warning',
  },
  {
    label: t('dashboard.eventRate'),
    value: `${props.connection.messagesPerSecond || 0}/s`,
    icon: 'stream',
    color: 'cyan',
  },
  {
    label: t('dashboard.lastEvent'),
    value: lastEventLabel.value,
    icon: 'schedule',
    color: 'blue-grey-3',
  },
]);

const lastEventLabel = computed(() => {
  if (!props.connection.lastEventAt) return t('dashboard.noEvents');

  return new Date(props.connection.lastEventAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
});

function nodeIcon(id) {
  if (id === 'cratedb') return 'storage';

  if (id === 'emqx') return 'router';

  if (id === 'fastapi') return 'api';

  if (id === 'dashboard') return 'dashboard';

  if (id === 'ai') return 'psychology';

  if (id === 'physics') return 'hub';

  return 'memory';
}

function nodeStatusColor(status: string) {
  if (status === 'online') return 'positive';

  if (status === 'degraded') return 'warning';

  return 'negative';
}
</script>
