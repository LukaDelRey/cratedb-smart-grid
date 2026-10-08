<template>
  <div
    class="ticker scada-gap-10"
    style="display: grid"
  >
    <div
      v-for="metric in metrics"
      class="ticker-item row no-wrap items-center q-py-sm q-px-md q-gutter-x-sm q-ml-none"
      style="
        min-height: 48px;
        border: 1px solid rgba(0, 229, 255, 0.16);
        border-radius: 8px;
        background: rgba(5, 12, 24, 0.86);
        box-shadow:
          0 16px 42px rgba(0, 0, 0, 0.22),
          inset 0 1px 0 rgba(255, 255, 255, 0.025);
      "
      :key="metric.label"
    >
      <q-icon
        :color="metric.color"
        :name="metric.icon"
      />

      <span class="text-caption">{{ metric.label }}</span>

      <strong class="text-subtitle1 text-weight-bold q-ml-auto">{{ metric.value }}</strong>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from '../../../i18n';

const { t } = useI18n();

const props = defineProps({
  summary: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
  connection: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
  totalLoad: {
    type: Number,
    default: 0,
  },
  blackout: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
});

const metrics = computed(() => [
  {
    label: t('dashboard.gridHealth'),
    value: `${props.summary.gridHealth}%`,
    icon: 'health_and_safety',
    color: 'positive',
  },
  {
    label: t('dashboard.systemLoad'),
    value: `${props.totalLoad} MW`,
    icon: 'bolt',
    color: 'cyan',
  },
  {
    label: t('dashboard.blackout'),
    value: `${props.blackout.probability}%`,
    icon: 'crisis_alert',
    color: 'negative',
  },
  {
    label: t('dashboard.events'),
    value: `${props.connection.messagesPerSecond}/s`,
    icon: 'stream',
    color: 'warning',
  },
]);
</script>
