<template>
  <section class="preferences-card scada-card">
    <header class="items-center q-mb-lg row no-wrap">
      <q-icon
        color="cyan"
        size="28px"
        :name="section === 'display' ? 'dashboard_customize' : 'notifications'"
      />

      <div>
        <h2 class="q-mt-none q-mb-sm q-mx-none text-h5">{{ copy.title }}</h2>

        <p
          class="q-my-xs q-mx-none text-body2"
          style="line-height: 1.6"
        >
          {{ copy.description }}
        </p>
      </div>
    </header>

    <section
      v-for="group in groups"
      class="preference-group q-mt-lg"
      :key="group.title"
    >
      <h3
        class="q-mt-none q-mb-sm q-mx-none q-pl-md text-weight-bold text-h6"
        style="line-height: 1.3"
      >
        {{ group.title }}
      </h3>

      <p
        class="q-my-xs q-mx-none q-mt-none q-mb-md q-pl-md text-body2"
        style="line-height: 1.6"
      >
        {{ group.description }}
      </p>

      <div
        v-for="field in group.fields"
        class="preference-row justify-between items-center row no-wrap"
        :key="field.key"
      >
        <div>
          <strong class="text-weight-medium text-body2">{{ field.label }}</strong>

          <p
            class="q-my-xs q-mx-none text-body2"
            style="line-height: 1.6"
          >
            {{ field.description }}
          </p>
        </div>

        <q-toggle
          v-model="preferences[field.key]"
          color="cyan"
          :aria-label="field.label"
        />
      </div>
    </section>

    <template v-if="section === 'notifications'">
      <div class="preference-row justify-between items-center row no-wrap">
        <div>
          <strong class="text-body2">{{ t('workspaceCopy.recentNotificationCount') }}</strong>

          <p
            class="q-my-xs q-mx-none text-body2"
            style="line-height: 1.6"
          >
            {{ t('workspaceCopy.maximumEventsShownInTheNotificationMenu') }}
          </p>
        </div>

        <q-select
          v-model="preferences.notificationLimit"
          class="count-select"
          dark
          dense
          outlined
          style="width: 100px"
          :aria-label="t('workspaceCopy.notificationCount')"
          :options="[5, 10, 20]"
        />
      </div>

      <div
        class="safety-note row no-wrap items-center q-pa-md q-gutter-x-sm q-ml-none text-caption"
        style="background: #102538; border-radius: 8px; color: #9ab5c8; line-height: 1.6"
      >
        <q-icon
          color="cyan"
          name="shield"
        />
        {{ t('workspaceCopy.criticalNotificationsAlwaysRemainVisibleTheseFilters') }}
      </div>
    </template>

    <footer class="items-center justify-between wrap q-mt-lg text-caption row no-wrap">
      <span class="items-center row no-wrap">
        <q-icon
          color="cyan"
          name="check_circle"
        />
        {{ t('workspaceCopy.savedAutomaticallyInThisBrowser') }}
      </span>

      <q-btn
        flat
        icon="restart_alt"
        no-caps
        :label="t('workspaceCopy.restoreDefaults')"
        @click="emit('reset')"
      />
    </footer>
  </section>
</template>
<script setup lang="ts">
// Keep component selector isolation for the shared stylesheet.
defineOptions({ __scopeId: 'data-v-ui-7de64889' });

import { computed } from 'vue';
import { useI18n } from '../../i18n';
import type { workspacePreferences } from '../../stores/workspacePreferences';

const props = defineProps<{
  section: 'display' | 'notifications';
  preferences: typeof workspacePreferences;
}>();

const emit = defineEmits<{ reset: [] }>();

const { t } = useI18n();

const copy = computed(() =>
  props.section === 'display'
    ? {
        title: t('workspaceCopy.dashboardDisplay'),
        description: t('workspaceCopy.chooseDashboardComponentsTheLayoutAdaptsAutomatically'),
      }
    : {
        title: t('workspaceCopy.notifications'),
        description: t('workspaceCopy.chooseWhichEventsAppearInTheNotification'),
      },
);

const fields = computed(() =>
  props.section === 'display'
    ? [
        {
          key: 'showForecast' as const,
          label: t('workspaceCopy.loadForecast'),
          description: t('workspaceCopy.showTheLoadForecastCard'),
        },
        {
          key: 'showInsights' as const,
          label: t('workspaceCopy.predictiveGridInsights'),
          description: t('workspaceCopy.showPredictionsAndRecommendedActions'),
        },
        {
          key: 'showRiskMap' as const,
          label: t('workspaceCopy.outageRiskMap'),
          description: t('workspaceCopy.showTheSupportingOutageRiskMap'),
        },
      ]
    : [
        {
          key: 'notificationWarnings' as const,
          label: t('workspaceCopy.warnings'),
          description: t('workspaceCopy.includeWARNINGEvents'),
        },
        {
          key: 'notificationInfo' as const,
          label: t('workspaceCopy.informationalEvents'),
          description: t('workspaceCopy.includeInformationalAndOtherNoncriticalEvents'),
        },
      ],
);

type ToggleKey = {
  [K in keyof typeof workspacePreferences]: (typeof workspacePreferences)[K] extends boolean
    ? K
    : never;
}[keyof typeof workspacePreferences];

const field = (key: ToggleKey, label: string, description: string) => ({ key, label, description });

const groups = computed(() =>
  props.section === 'display'
    ? [
        {
          title: t('workspaceCopy.mapAndMetrics'),
          description: t('workspaceCopy.theMainGridMapAndMetricCharts'),
          fields: [
            field(
              'showMap',
              t('workspaceCopy.gridMap'),
              t('workspaceCopy.showTheInteractiveGridMap'),
            ),
            field(
              'showMapControls',
              t('workspaceCopy.mapLayersLegendAndMarkers'),
              t('workspaceCopy.showTheControlPanelOverTheMap'),
            ),
            field(
              'showSubstationGrouping',
              t('dashboard.stationGrouping'),
              t('dashboard.stationGroupingHint'),
            ),
            field('showMapExpand', t('dashboard.expandMap'), t('dashboard.expandMapHint')),
            field(
              'showMetrics',
              t('workspaceCopy.operationalMetricsAndCharts'),
              t('workspaceCopy.showTheSixCardsAboveTheOperations'),
            ),
          ],
        },
        {
          title: t('workspaceCopy.operationsPanels'),
          description: t('workspaceCopy.panelsBelowTheChartsEnabledPanelsAppear'),
          fields: [
            field(
              'showAlarms',
              t('dashboard.activeAlarmsEvents'),
              t('workspaceCopy.showTheActiveAlarmRegister'),
            ),
            field(
              'showCorrelation',
              t('dashboard.alarmCorrelation'),
              t('workspaceCopy.showRelatedAlarmsAndIncidents'),
            ),
            field(
              'showRootCause',
              t('dashboard.rootCauseAnalysis'),
              t('workspaceCopy.showIncidentRootCauseAnalysis'),
            ),
            field(
              'showEvents',
              t('dashboard.realtimeEventStream'),
              t('workspaceCopy.showTheLiveEventStream'),
            ),
          ],
        },
        {
          title: t('workspaceCopy.analyticsCards'),
          description: t('workspaceCopy.cardsInTheRightDashboardColumn'),
          fields: [
            fields.value[0]!,
            field(
              'showBlackout',
              t('workspaceCopy.blackoutPrediction'),
              t('workspaceCopy.showEstimatedRiskAndAffectedCustomers'),
            ),
            field(
              'showTopRisk',
              t('workspaceCopy.topRiskSubstations'),
              t('workspaceCopy.showTheHighestRiskSubstations'),
            ),
            fields.value[1]!,
            fields.value[2]!,
          ],
        },
      ]
    : [{ title: t('workspaceCopy.notificationTypes'), description: '', fields: fields.value }],
);
</script>
