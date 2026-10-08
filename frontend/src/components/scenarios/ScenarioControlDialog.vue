<template>
  <q-dialog v-model="dialogOpen">
    <q-card
      class="scenario-dialog"
      style="width: min(680px, calc(100vw - 28px)); max-width: 680px"
    >
      <q-card-section class="scenario-header items-center row no-wrap">
        <div>
          <div
            class="scenario-kicker text-weight-bold text-uppercase"
            style="font-size: 11px; letter-spacing: 0"
          >
            {{ t('dashboard.scenarioControl') }}
          </div>

          <div class="scenario-title text-weight-bold q-mt-xs text-h6">
            {{ t('dashboard.runFailureSimulation') }}
          </div>
        </div>

        <q-btn
          v-close-popup
          dense
          flat
          icon="close"
          round
          :aria-label="t('dashboard.close')"
        />
      </q-card-section>

      <q-separator dark />

      <q-card-section class="scenario-body">
        <q-select
          :model-value="selectedType"
          color="cyan"
          dark
          dense
          emit-value
          map-options
          option-label="label"
          option-value="type"
          outlined
          :label="t('dashboard.scenarioType')"
          :options="definitions"
          @update:model-value="selectType"
        >
          <template #prepend>
            <q-icon
              color="cyan"
              :name="activeDefinition?.icon || 'science'"
            />
          </template>
        </q-select>

        <div
          class="scenario-target items-center row no-wrap"
          style="min-height: 34px; border-bottom: 1px solid rgba(255, 255, 255, 0.08)"
        >
          <span
            class="text-weight-bold text-uppercase"
            style="font-size: 11px; letter-spacing: 0"
          >
            {{ t('dashboard.target') }}
          </span>

          <strong class="text-body2 text-weight-bold">
            {{ stationId || t('dashboard.automaticSelection') }}
          </strong>
        </div>

        <div class="scenario-control-row scada-gap-8">
          <div class="scenario-control-label items-center row no-wrap">
            <span
              class="text-weight-bold text-uppercase"
              style="font-size: 11px; letter-spacing: 0"
            >
              {{ t('dashboard.duration') }}
            </span>

            <strong class="text-body2 text-weight-bold">{{ durationSeconds }} s</strong>
          </div>

          <q-slider
            v-model="durationSeconds"
            color="cyan"
            track-color="blue-grey-8"
            :max="120"
            :min="10"
            :step="5"
          />
        </div>

        <div
          v-if="activeDefinition?.multiAsset"
          class="scenario-control-row scada-gap-8"
        >
          <div class="scenario-control-label items-center row no-wrap">
            <span
              class="text-weight-bold text-uppercase"
              style="font-size: 11px; letter-spacing: 0"
            >
              {{ t('dashboard.targetAssets') }}
            </span>

            <strong class="text-body2 text-weight-bold">{{ targetCount }}</strong>
          </div>

          <q-slider
            v-model="targetCount"
            color="orange"
            track-color="blue-grey-8"
            :max="20"
            :min="3"
            :step="1"
          />
        </div>

        <q-banner
          v-if="error"
          class="scenario-error"
          dense
        >
          <template #avatar>
            <q-icon
              color="negative"
              name="error_outline"
            />
          </template>
          {{ error }}
        </q-banner>

        <div class="scenario-run-row row no-wrap justify-end">
          <q-btn
            color="cyan"
            icon="play_arrow"
            text-color="black"
            unelevated
            :disable="loading"
            :label="t('dashboard.runScenario')"
            :loading="running"
            @click="execute"
          />
        </div>

        <q-separator dark />

        <section
          class="active-scenarios scada-gap-12"
          style="display: grid"
        >
          <div
            class="scenario-section-title items-center text-weight-bold text-uppercase q-gutter-x-sm q-ml-none row no-wrap"
            style="font-size: 11px; letter-spacing: 0"
          >
            <span>{{ t('dashboard.activeScenarios') }}</span>

            <q-badge
              color="cyan"
              text-color="black"
            >
              {{ activeRuns.length }}
            </q-badge>
          </div>

          <div
            v-if="!activeRuns.length"
            class="scenario-empty q-pt-md q-pb-xs q-px-none text-body2"
            style="color: #78909c"
          >
            {{ t('dashboard.noActiveScenarios') }}
          </div>

          <div
            v-for="run in activeRuns"
            class="scenario-run items-center q-gutter-x-md q-ml-none row no-wrap"
            style="min-height: 48px"
            :key="run.id"
          >
            <q-icon
              color="cyan"
              size="22px"
              :name="definitionFor(run.scenario_type)?.icon || 'science'"
            />

            <div
              class="scenario-run-main scada-gap-8 scada-min-width-0"
              style="flex: 1"
            >
              <div class="items-center row no-wrap">
                <strong class="overflow-hidden text-no-wrap text-body2 text-weight-bold">
                  {{ definitionFor(run.scenario_type)?.label || run.scenario_type }}
                </strong>

                <span style="font-size: 11px">
                  {{ run.target_station_ids.length }} {{ t('dashboard.assets').toLowerCase() }}
                </span>
              </div>

              <q-linear-progress
                color="cyan"
                rounded
                size="5px"
                track-color="blue-grey-8"
                :value="progressValue(run.progress)"
              />
            </div>

            <q-btn
              color="negative"
              dense
              flat
              icon="stop"
              round
              :aria-label="t('dashboard.stopScenario')"
              :loading="stoppingId === run.id"
              @click="stop(run)"
            >
              <q-tooltip>{{ t('dashboard.stopScenario') }}</q-tooltip>
            </q-btn>
          </div>
        </section>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
// Keep component selector isolation for the shared stylesheet.
defineOptions({ __scopeId: 'data-v-ui-b8d1db5c' });

import { computed } from 'vue';
import { useScenarioControl } from '../../composables/useScenarioControl';
import { useI18n } from '../../i18n';
import type { ScenarioType } from '../../types/dashboard';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    stationId?: string;
    defaultType?: ScenarioType;
  }>(),
  {
    stationId: undefined,
    defaultType: 'overload',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const { t } = useI18n();

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const {
  definitions,
  activeRuns,
  activeDefinition,
  selectedType,
  durationSeconds,
  targetCount,
  loading,
  running,
  stoppingId,
  error,
  selectType,
  execute,
  stop,
} = useScenarioControl({
  getStationId: () => props.stationId,
  defaultType: props.defaultType,
});

const definitionFor = (type: ScenarioType) =>
  definitions.value.find((definition) => definition.type === type);

const progressValue = (progress: number) => Math.max(0, Math.min(1, progress || 0));
</script>
