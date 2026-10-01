<template>
  <q-dialog v-model="dialogOpen">
    <q-card class="scenario-dialog">
      <q-card-section class="scenario-header">
        <div>
          <div class="scenario-kicker">{{ t('dashboard.scenarioControl') }}</div>
          <div class="scenario-title">{{ t('dashboard.runFailureSimulation') }}</div>
        </div>
        <q-btn v-close-popup flat round dense icon="close" :aria-label="t('dashboard.close')" />
      </q-card-section>

      <q-separator dark />

      <q-card-section class="scenario-body">
        <q-select
          :model-value="selectedType"
          :options="definitions"
          option-label="label"
          option-value="type"
          emit-value
          map-options
          dark
          dense
          outlined
          color="cyan"
          :label="t('dashboard.scenarioType')"
          @update:model-value="selectType"
        >
          <template #prepend>
            <q-icon :name="activeDefinition?.icon || 'science'" color="cyan" />
          </template>
        </q-select>

        <div class="scenario-target">
          <span>{{ t('dashboard.target') }}</span>
          <strong>{{ stationId || t('dashboard.automaticSelection') }}</strong>
        </div>

        <div class="scenario-control-row">
          <div class="scenario-control-label">
            <span>{{ t('dashboard.duration') }}</span>
            <strong>{{ durationSeconds }} s</strong>
          </div>
          <q-slider
            v-model="durationSeconds"
            :min="10"
            :max="120"
            :step="5"
            color="cyan"
            track-color="blue-grey-8"
          />
        </div>

        <div v-if="activeDefinition?.multiAsset" class="scenario-control-row">
          <div class="scenario-control-label">
            <span>{{ t('dashboard.targetAssets') }}</span>
            <strong>{{ targetCount }}</strong>
          </div>
          <q-slider
            v-model="targetCount"
            :min="3"
            :max="20"
            :step="1"
            color="orange"
            track-color="blue-grey-8"
          />
        </div>

        <q-banner v-if="error" dense class="scenario-error">
          <template #avatar><q-icon name="error_outline" color="negative" /></template>
          {{ error }}
        </q-banner>

        <div class="scenario-run-row">
          <q-btn
            unelevated
            color="cyan"
            text-color="black"
            icon="play_arrow"
            :label="t('dashboard.runScenario')"
            :loading="running"
            :disable="loading"
            @click="execute"
          />
        </div>

        <q-separator dark />

        <section class="active-scenarios">
          <div class="scenario-section-title">
            <span>{{ t('dashboard.activeScenarios') }}</span>
            <q-badge color="cyan" text-color="black">{{ activeRuns.length }}</q-badge>
          </div>

          <div v-if="!activeRuns.length" class="scenario-empty">
            {{ t('dashboard.noActiveScenarios') }}
          </div>

          <div v-for="run in activeRuns" :key="run.id" class="scenario-run">
            <q-icon :name="definitionFor(run.scenario_type)?.icon || 'science'" color="cyan" size="22px" />
            <div class="scenario-run-main">
              <div>
                <strong>{{ definitionFor(run.scenario_type)?.label || run.scenario_type }}</strong>
                <span>{{ run.target_station_ids.length }} {{ t('dashboard.assets').toLowerCase() }}</span>
              </div>
              <q-linear-progress
                rounded
                size="5px"
                color="cyan"
                track-color="blue-grey-8"
                :value="progressValue(run.progress)"
              />
            </div>
            <q-btn
              flat
              round
              dense
              color="negative"
              icon="stop"
              :loading="stoppingId === run.id"
              :aria-label="t('dashboard.stopScenario')"
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
import { computed } from 'vue'
import { useScenarioControl } from '../../composables/useScenarioControl'
import { useI18n } from '../../i18n'
import type { ScenarioType } from '../../types/dashboard'

const props = withDefaults(defineProps<{
  modelValue:boolean
  stationId?:string
  defaultType?:ScenarioType
}>(), {
  stationId:undefined,
  defaultType:'overload'
})

const emit = defineEmits<{
  'update:modelValue':[value:boolean]
}>()

const { t } = useI18n()
const dialogOpen = computed({
  get:() => props.modelValue,
  set:(value:boolean) => emit('update:modelValue', value)
})
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
  stop
} = useScenarioControl({
  getStationId:() => props.stationId,
  defaultType:props.defaultType
})

const definitionFor = (type:ScenarioType) =>
  definitions.value.find(definition => definition.type === type)

const progressValue = (progress:number) => Math.max(0, Math.min(1, progress || 0))
</script>

<style scoped>
.scenario-dialog{
  width:min(680px, calc(100vw - 28px));
  max-width:680px;
  color:#e8f1f8;
  border:1px solid rgba(64,196,255,.25);
  border-radius:8px;
  background:#101a24;
}

.scenario-header,
.scenario-control-label,
.scenario-target,
.scenario-section-title,
.scenario-run,
.scenario-run-main > div{
  display:flex;
  align-items:center;
  justify-content:space-between;
}

.scenario-header{
  padding:18px 20px;
}

.scenario-kicker,
.scenario-section-title,
.scenario-control-label span,
.scenario-target span{
  color:#78909c;
  font-size:11px;
  font-weight:700;
  letter-spacing:0;
  text-transform:uppercase;
}

.scenario-title{
  margin-top:3px;
  font-size:21px;
  font-weight:700;
}

.scenario-body{
  display:grid;
  gap:20px;
  padding:20px;
}

.scenario-target{
  min-height:34px;
  border-bottom:1px solid rgba(255,255,255,.08);
}

.scenario-target strong,
.scenario-control-label strong{
  color:#e8f1f8;
  font-size:13px;
}

.scenario-control-row{
  display:grid;
  gap:8px;
}

.scenario-run-row{
  display:flex;
  justify-content:flex-end;
}

.scenario-error{
  color:#ffcdd2;
  border:1px solid rgba(244,67,54,.28);
  border-radius:6px;
  background:rgba(244,67,54,.08);
}

.active-scenarios{
  display:grid;
  gap:12px;
}

.scenario-section-title{
  justify-content:flex-start;
  gap:8px;
}

.scenario-empty{
  padding:12px 0 4px;
  color:#78909c;
  font-size:13px;
}

.scenario-run{
  gap:12px;
  min-height:48px;
}

.scenario-run-main{
  display:grid;
  flex:1;
  gap:8px;
  min-width:0;
}

.scenario-run-main strong{
  overflow:hidden;
  font-size:13px;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.scenario-run-main span{
  color:#78909c;
  font-size:11px;
}

@media (max-width:520px){
  .scenario-header,
  .scenario-body{
    padding:16px;
  }
}
</style>
