<template>
  <q-card
    bordered
    class="scada-card correlation-panel full-height no-wrap column"
    flat
    style="min-height: 0"
  >
    <q-card-section
      class="correlation-header row items-center justify-between q-pa-sm col-auto"
      style="min-height: 42px"
    >
      <div>
        <div class="section-kicker-light text-caption text-weight-bold text-uppercase">
          {{ t('dashboard.alarmCorrelation') }}
        </div>
      </div>

      <div class="row items-center q-gutter-xs">
        <q-badge color="negative">{{ criticalCount }} {{ t('dashboard.criticalLower') }}</q-badge>

        <q-badge
          color="cyan"
          text-color="black"
        >
          {{ correlations.length }} {{ t('dashboard.groups') }}
        </q-badge>
      </div>
    </q-card-section>

    <q-card-section
      class="correlation-body q-pa-none"
      style="min-height: 0; grid-template-rows: auto minmax(0, 1fr)"
    >
      <div
        class="correlation-summary-strip q-pt-none q-pb-sm q-px-sm"
        style="grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px"
      >
        <div
          class="q-pa-sm"
          style="min-width: 0"
        >
          <span
            class="block overflow-hidden text-no-wrap"
            style="font-size: 10px"
          >
            {{ t('dashboard.avgConfidence') }}
          </span>

          <strong class="block q-mt-xs text-body2">{{ averageConfidence }}%</strong>
        </div>

        <div
          class="q-pa-sm"
          style="min-width: 0"
        >
          <span
            class="block overflow-hidden text-no-wrap"
            style="font-size: 10px"
          >
            {{ t('dashboard.relatedAlarms') }}
          </span>

          <strong class="block q-mt-xs text-body2">{{ totalRelatedAlarms }}</strong>
        </div>

        <div
          class="q-pa-sm"
          style="min-width: 0"
        >
          <span
            class="block overflow-hidden text-no-wrap"
            style="font-size: 10px"
          >
            {{ t('dashboard.affectedAssets') }}
          </span>

          <strong class="block q-mt-xs text-body2">{{ totalAffectedAssets }}</strong>
        </div>
      </div>

      <div
        class="correlation-list scada-min-height-0 overflow-auto q-pt-none q-pb-sm q-px-sm"
        style="scrollbar-width: thin"
      >
        <button
          v-for="incident in correlations"
          class="correlation-incident items-center scada-text-primary cursor-pointer text-left q-mb-sm q-pa-sm full-width"
          style="
            min-height: 54px;
            display: grid;
            grid-template-columns: 13px minmax(0, 1fr) minmax(160px, 0.55fr) 42px 18px;
            gap: 9px;
            font: inherit;
          "
          type="button"
          :disabled="!allowRootCause"
          :key="incident.id"
          @click="$emit('select', incident.id)"
        >
          <span
            style="width: 10px; height: 10px"
            :class="['incident-severity-dot', incident.severity.toLowerCase()]"
          />

          <span
            class="incident-main"
            style="min-width: 0"
          >
            <strong class="overflow-hidden text-no-wrap text-caption">
              {{ translateText(incident.title) }}
            </strong>

            <small
              class="overflow-hidden text-no-wrap"
              style="font-size: 10px"
            >
              {{ translateText(incident.nextAction) }}
            </small>
          </span>

          <span
            class="incident-meta"
            style="min-width: 0"
          >
            <q-badge :color="severityColor(incident.severity)">
              {{ translateStatus(incident.severity) }}
            </q-badge>

            <small
              class="overflow-hidden text-no-wrap"
              style="font-size: 10px"
            >
              {{ incident.relatedAlarmCount }} {{ t('dashboard.alarmsLower') }} /
              {{ incident.affectedAssets.length }} {{ t('dashboard.assetsLower') }}
            </small>
          </span>

          <q-circular-progress
            class="text-cyan incident-confidence"
            color="cyan"
            show-value
            size="38px"
            style="font-size: 10px"
            track-color="blue-grey-10"
            :value="incident.confidence"
          >
            {{ incident.confidence }}%
          </q-circular-progress>

          <q-icon
            v-if="allowRootCause"
            class="incident-open-icon"
            name="chevron_right"
          />
        </button>

        <div
          v-if="!correlations.length"
          class="correlation-empty items-center q-pa-md q-gutter-x-sm q-ml-none row no-wrap"
          style="
            min-height: 72px;
            border: 1px solid rgba(255, 255, 255, 0.07);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.026);
          "
        >
          <q-icon
            color="positive"
            name="check_circle"
            size="24px"
          />

          <div>
            <strong class="block">{{ t('dashboard.noActiveAlarmClusters') }}</strong>

            <span
              class="block"
              style="font-size: 11px"
            >
              {{ t('dashboard.theAlarmEngineHasNoGroupedIncidentsRightNow') }}
            </span>
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
// Keep component selector isolation for the shared stylesheet.
defineOptions({ __scopeId: 'data-v-ui-779d9997' });

import { computed } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from '../../../../i18n';

defineEmits(['select']);

const { t, translateText, translateStatus } = useI18n();

const props = defineProps({
  allowRootCause: { type: Boolean, default: true },
  correlations: {
    type: Array as PropType<any[]>,
    default: () => [],
  },
});

const criticalCount = computed(
  () => props.correlations.filter((item) => item.severity === 'CRITICAL').length,
);

const totalRelatedAlarms = computed(() =>
  props.correlations.reduce((sum, item) => sum + (item.relatedAlarmCount || 0), 0),
);

const totalAffectedAssets = computed(
  () => new Set(props.correlations.flatMap((item) => item.affectedAssets || [])).size,
);

const averageConfidence = computed(() => {
  if (!props.correlations.length) {
    return 0;
  }

  return Math.round(
    props.correlations.reduce((sum, item) => sum + (item.confidence || 0), 0) /
      props.correlations.length,
  );
});

function severityColor(severity) {
  if (severity === 'CRITICAL') return 'negative';

  if (severity === 'WARNING') return 'warning';

  return 'info';
}
</script>
