<template>
  <q-card
    bordered
    class="scada-card root-cause-panel full-height no-wrap column"
    flat
    style="min-height: 0"
  >
    <q-card-section class="root-cause-panel-header row items-center justify-between col-auto">
      <div>
        <div class="section-kicker-light text-caption text-weight-bold text-uppercase">
          {{ t('dashboard.rootCauseAnalysis') }}
        </div>
      </div>

      <q-badge
        v-if="rootCause"
        :color="severityColor(rootCause.severity)"
      >
        {{ rootCause.confidence }}% {{ t('dashboard.confidenceLower') }}
      </q-badge>
    </q-card-section>

    <q-card-section
      v-if="rootCause"
      class="root-cause-body q-pa-none"
      style="min-height: 0"
    >
      <div
        class="root-cause-layout full-height scada-min-height-0 q-pt-none q-pb-sm q-px-sm"
        style="display: grid; grid-template-columns: minmax(210px, 0.38fr) minmax(0, 1fr); gap: 9px"
      >
        <aside
          class="root-cause-summary-stack scada-min-height-0 overflow-auto"
          style="
            display: grid;
            grid-template-rows: repeat(3, minmax(58px, 1fr));
            gap: 7px;
            scrollbar-width: thin;
          "
        >
          <div
            class="root-cause-summary-card incident-title-card scada-min-width-0 scada-min-height-0 justify-center q-py-xs q-px-sm column"
          >
            <span
              class="overflow-hidden text-no-wrap"
              style="line-height: 1.2; font-size: 10px"
            >
              {{ t('dashboard.incident') }}
            </span>

            <strong
              class="block q-mt-xs overflow-hidden text-body2"
              style="line-height: 1.25"
            >
              {{ translateText(rootCause.summary) }}
            </strong>
          </div>

          <div
            class="root-cause-summary-card scada-min-width-0 scada-min-height-0 justify-center q-py-xs q-px-sm column"
          >
            <span
              class="overflow-hidden text-no-wrap"
              style="line-height: 1.2; font-size: 10px"
            >
              {{ t('dashboard.affected') }}
            </span>

            <strong
              class="block q-mt-xs overflow-hidden text-body2"
              style="line-height: 1.25"
            >
              {{ rootCause.affectedAssets.length }} {{ t('dashboard.assetsLower') }}
            </strong>

            <small
              class="overflow-hidden text-no-wrap q-mt-xs"
              style="line-height: 1.2; font-size: 10px"
              :title="affectedAssetsLabel"
            >
              {{ affectedAssetsLabel }}
            </small>
          </div>

          <div
            class="root-cause-summary-card scada-min-width-0 scada-min-height-0 justify-center q-py-xs q-px-sm column"
          >
            <span
              class="overflow-hidden text-no-wrap"
              style="line-height: 1.2; font-size: 10px"
            >
              {{ t('dashboard.severity') }}
            </span>

            <strong
              class="block q-mt-xs overflow-hidden text-body2"
              style="line-height: 1.25"
              :class="severityTextClass(rootCause.severity)"
            >
              {{ translateStatus(rootCause.severity) }}
            </strong>

            <small
              class="overflow-hidden text-no-wrap q-mt-xs"
              style="line-height: 1.2; font-size: 10px"
              :title="recommendedAction"
            >
              {{ recommendedAction }}
            </small>
          </div>
        </aside>

        <section
          class="root-cause-graph-panel scada-min-width-0 overflow-hidden"
          style="
            display: grid;
            grid-template-rows: auto minmax(0, 1fr);
            background: rgba(5, 12, 22, 0.52);
          "
        >
          <div
            class="root-cause-graph-head items-center justify-between q-pa-sm q-gutter-x-sm q-ml-none row no-wrap"
            style="min-height: 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.06)"
          >
            <div>
              <span
                class="block"
                style="font-size: 10px"
              >
                {{ t('dashboard.causalityGraph') }}
              </span>

              <strong class="block text-caption">
                {{ rootCause.chain.length }} {{ t('dashboard.steps') }}
              </strong>
            </div>

            <q-badge
              color="cyan"
              text-color="black"
            >
              AI RCA
            </q-badge>
          </div>

          <RootCauseGraph :chain="rootCause.chain" />
        </section>
      </div>
    </q-card-section>

    <q-card-section
      v-else
      class="root-cause-empty full-height items-center justify-center row no-wrap"
    >
      <q-icon
        color="blue-grey-3"
        name="account_tree"
        size="28px"
      />

      <div>
        <strong class="block">{{ t('dashboard.noActiveIncidentSelected') }}</strong>

        <span class="block">
          {{
            t(
              'dashboard.rootCauseAnalysisWillPopulateWhenTheAlarmCorrelationEngineGroupsAnIncident',
            )
          }}
        </span>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
// Keep component selector isolation for the shared stylesheet.
defineOptions({ __scopeId: 'data-v-ui-e6f55fc4' });

import { computed } from 'vue';
import type { PropType } from 'vue';
import RootCauseGraph from './RootCauseGraph.vue';
import { useI18n } from '../../../../i18n';

const { t, translateText, translateStatus } = useI18n();

const props = defineProps({
  rootCause: {
    type: Object as PropType<Record<string, any>>,
    default: null,
  },
});

const affectedAssetsLabel = computed(
  () =>
    (props.rootCause?.affectedAssets || []).slice(0, 3).join(', ') ||
    t('dashboard.noImpactedAssets'),
);

const recommendedAction = computed(() =>
  translateText(props.rootCause?.chain?.at(-1)?.title || 'Awaiting operator action'),
);

function severityColor(severity) {
  if (severity === 'CRITICAL') return 'negative';

  if (severity === 'WARNING') return 'warning';

  return 'info';
}

function severityTextClass(severity) {
  if (severity === 'CRITICAL') return 'text-negative';

  if (severity === 'WARNING') return 'text-warning';

  return 'text-cyan';
}
</script>
