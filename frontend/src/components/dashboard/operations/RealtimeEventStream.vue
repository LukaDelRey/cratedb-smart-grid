<template>
  <q-card
    bordered
    class="scada-card event-stream-panel full-height no-wrap column"
    flat
    style="min-height: 0"
  >
    <q-card-section
      class="event-stream-header row items-center justify-between q-pa-sm col-auto"
      style="min-height: 40px"
    >
      <div>
        <div class="section-kicker-light text-caption text-weight-bold text-uppercase">
          {{ t('dashboard.realtimeEventStream') }}
        </div>
      </div>

      <div class="row items-center q-gutter-xs">
        <q-badge color="negative">{{ criticalCount }} {{ t('dashboard.criticalLower') }}</q-badge>

        <q-badge
          color="cyan"
          text-color="black"
        >
          {{ eventsPerMinute }} / min
        </q-badge>
      </div>
    </q-card-section>

    <q-card-section
      class="event-stream-tools items-center q-pt-none q-pb-sm q-px-sm col-auto"
      style="grid-template-columns: auto minmax(160px, 260px)"
    >
      <q-btn-toggle
        v-model="activeFilter"
        class="event-filter-toggle overflow-hidden"
        dense
        style="min-width: 0"
        text-color="blue-grey-2"
        toggle-color="cyan"
        toggle-text-color="black"
        unelevated
        :options="filterOptions"
      />

      <q-input
        v-model="query"
        borderless
        class="event-search q-py-none q-px-sm"
        clearable
        dark
        debounce="120"
        dense
        style="min-height: 28px"
        :placeholder="t('dashboard.searchAssetOrEvent')"
      >
        <template #prepend>
          <q-icon
            name="search"
            size="16px"
          />
        </template>
      </q-input>
    </q-card-section>

    <q-card-section
      class="q-pa-none event-stream-body"
      style="min-height: 0"
    >
      <div
        class="event-timeline full-height overflow-auto q-pt-none q-pb-sm q-px-sm"
        style="min-height: 0"
      >
        <button
          v-for="event in filteredEvents"
          class="event-row items-center scada-gap-8 scada-text-primary text-left q-mb-sm q-pa-sm full-width"
          style="
            min-height: 42px;
            display: grid;
            grid-template-columns: 10px 66px 22px minmax(0, 1fr) minmax(98px, 0.28fr);
            border: 1px solid rgba(255, 255, 255, 0.07);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.026);
            font: inherit;
          "
          type="button"
          :key="event.id"
        >
          <span
            style="width: 8px; height: 8px"
            :class="['event-pulse', event.severity.toLowerCase()]"
          />

          <span
            class="event-time scada-text-muted"
            style="font-size: 10px"
          >
            {{ formatTime(event.timestamp) }}
          </span>

          <q-icon
            size="18px"
            :color="eventColor(event.severity)"
            :name="eventIcon(event.severity)"
          />

          <span
            class="event-main"
            style="min-width: 0"
          >
            <strong class="overflow-hidden text-no-wrap text-caption">
              {{ translateText(event.title) }}
            </strong>

            <small
              class="overflow-hidden text-no-wrap"
              style="font-size: 10px"
            >
              {{ translateText(event.description || 'Realtime telemetry event') }}
            </small>
          </span>

          <span
            class="event-source"
            style="min-width: 0"
          >
            <strong class="overflow-hidden text-no-wrap text-caption">
              {{ translateStatus(event.source || 'SYSTEM') }}
            </strong>

            <small
              class="overflow-hidden text-no-wrap"
              style="font-size: 10px"
            >
              {{ event.assetId || 'grid' }}
            </small>
          </span>
        </button>

        <div
          v-if="!filteredEvents.length"
          class="event-empty full-height row no-wrap items-center justify-center scada-text-muted q-gutter-x-sm q-ml-none"
          style="min-height: 84px"
        >
          <q-icon
            color="blue-grey-3"
            name="sensors_off"
            size="24px"
          />

          <span>{{ t('dashboard.noMatchingRealtimeEvents') }}</span>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
// Keep component selector isolation for the shared stylesheet.
defineOptions({ __scopeId: 'data-v-ui-66ae1ab4' });

import { computed, ref } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from '../../../i18n';
import type { AlarmEvent } from '../../../types/dashboard';
import { formatClockTime as formatTime } from '../../../utils/dateTime';

const props = defineProps({
  events: {
    type: Array as PropType<AlarmEvent[]>,
    default: () => [],
  },
});

const activeFilter = ref('ALL');

const query = ref('');

const { t, translateText, translateStatus } = useI18n();

const filterOptions = computed(() => [
  { label: t('dashboard.all'), value: 'ALL' },
  { label: t('dashboard.critical'), value: 'CRITICAL' },
  { label: t('dashboard.warn'), value: 'WARNING' },
  { label: t('dashboard.info'), value: 'INFO' },
]);

const criticalCount = computed(
  () => props.events.filter((event) => event.severity === 'CRITICAL').length,
);

const eventsPerMinute = computed(() => {
  const cutoff = Date.now() - 60 * 1000;

  return props.events.filter((event) => {
    const timestamp = Date.parse(event.timestamp);

    return Number.isFinite(timestamp) && timestamp >= cutoff;
  }).length;
});

const filteredEvents = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase();

  return props.events.filter((event) => {
    const matchesFilter = activeFilter.value === 'ALL' || event.severity === activeFilter.value;

    const haystack = [event.title, event.description, event.source, event.assetId, event.severity]
      .join(' ')
      .toLowerCase();

    return matchesFilter && (!normalizedQuery || haystack.includes(normalizedQuery));
  });
});

function eventColor(severity) {
  if (severity === 'CRITICAL') return 'negative';

  if (severity === 'WARNING') return 'warning';

  return 'cyan';
}

function eventIcon(severity) {
  if (severity === 'CRITICAL') return 'report';

  if (severity === 'WARNING') return 'warning';

  return 'sensors';
}
</script>
