<template>
  <section class="threshold-panel scada-card">
    <header
      class="threshold-heading row no-wrap justify-between q-gutter-x-lg q-ml-none"
      style="border-bottom: 1px solid #203447"
    >
      <div>
        <div
          class="section-kicker text-weight-bold text-uppercase"
          style="font-size: 10px; letter-spacing: 1.7px"
        >
          {{ t('settings.shared') }}
        </div>

        <h2
          class="q-my-sm q-mx-none text-h5"
          style="line-height: 1.35"
        >
          {{ t('settings.heading') }}
        </h2>

        <p class="q-ma-none text-body2">{{ t('settings.description') }}</p>
      </div>

      <q-icon
        color="cyan"
        name="verified_user"
        size="30px"
      />
    </header>

    <div
      v-if="loading"
      class="settings-feedback row no-wrap items-center q-pa-lg q-gutter-x-md q-ml-none"
      style="color: #9cb4c7"
    >
      <q-spinner color="cyan" />
      {{ t('settings.loading') }}
    </div>

    <template v-else>
      <q-banner
        v-if="error"
        class="settings-error q-ma-lg"
        role="alert"
        rounded
      >
        {{ error }}
        <template #action>
          <q-btn
            v-if="!snapshot"
            flat
            :label="t('settings.retry')"
            @click="load"
          />
        </template>
      </q-banner>

      <q-banner
        v-if="success"
        class="settings-success q-ma-lg"
        role="status"
        rounded
      >
        {{ success }}
      </q-banner>

      <template v-if="snapshot">
        <div
          class="threshold-note row no-wrap scada-gap-10 q-py-md q-px-lg text-caption"
          style="color: #8fa9be; background: #102538; border-radius: 7px; line-height: 1.7"
        >
          <q-icon
            name="info_outline"
            size="18px"
          />

          <span>{{ t('settings.notice') }}</span>
        </div>

        <section
          v-for="group in visibleGroups"
          class="threshold-group"
          :key="group.key"
        >
          <h3
            class="items-center q-my-md q-mx-none text-body2 row no-wrap"
            style="line-height: 1.5"
          >
            <q-icon
              color="cyan"
              size="19px"
              :name="group.icon"
            />
            {{ t(`settings.${group.key}`) }}
          </h3>

          <div
            v-for="field in snapshot.fields.filter((f) => group.keys.includes(f.key))"
            class="threshold-row row no-wrap items-center justify-between q-py-md q-px-none"
            :key="field.key"
          >
            <div class="threshold-label column no-wrap q-gutter-y-sm q-mt-none">
              <strong class="text-weight-medium text-body2">
                {{ fieldLabel(field.key, field.label) }}
              </strong>

              <span style="font-size: 11px">
                {{ t('settings.default') }}: {{ field.comparison }} {{ field.default }}
                {{ field.unit }}
              </span>
            </div>

            <q-input
              v-model.number="draft[field.key]"
              class="threshold-input"
              dark
              dense
              outlined
              step="any"
              type="number"
              :aria-label="fieldLabel(field.key, field.label)"
              :disable="busy"
              :max="field.max"
              :min="field.min"
              :prefix="field.comparison"
              :suffix="field.unit"
            />
          </div>
        </section>

        <p
          v-if="!valid"
          class="validation-error q-py-none q-px-lg"
          role="alert"
          style="color: #ffb238"
        >
          {{ t('settings.invalid') }}
        </p>

        <footer
          class="threshold-actions row no-wrap items-center wrap q-gutter-x-sm q-ml-none"
          style="border-top: 1px solid #203447; background: #081522"
        >
          <div
            class="save-state row no-wrap items-center q-gutter-x-sm q-ml-none"
            style="font-size: 11px; color: #8da8bb"
          >
            <span class="q-mr-sm" :class="dirty ? 'unsaved-dot' : 'saved-dot'" />
            {{ t(dirty ? 'settings.changed' : 'settings.unchanged') }}
          </div>

          <q-btn
            flat
            icon="restart_alt"
            :disable="busy"
            :label="t('settings.reset')"
            @click="confirmReset = true"
          />

          <q-btn
            flat
            :disable="!dirty || busy"
            :label="t('settings.discard')"
            @click="discard"
          />

          <q-btn
            color="cyan"
            icon="save"
            text-color="black"
            unelevated
            :disable="!dirty || !valid || busy"
            :label="t('settings.save')"
            :loading="busy"
            @click="save(false)"
          />
        </footer>
      </template>
    </template>

    <q-dialog v-model="confirmReset">
      <q-card
        class="scada-card reset-dialog q-pa-md"
        style="max-width: 460px"
      >
        <q-card-section>
          <h3>{{ t('settings.resetTitle') }}</h3>

          <p>{{ t('settings.resetBody') }}</p>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            :label="t('settings.cancel')"
          />

          <q-btn
            color="cyan"
            text-color="black"
            :label="t('settings.reset')"
            @click="
              confirmReset = false;
              save(true);
            "
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </section>
</template>

<script setup lang="ts">
defineOptions({ __scopeId: 'data-v-ui-9ffe8bc1' });

import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from '../../i18n';
import {
  fetchThresholdSettings,
  saveThresholdSettings,
  resetThresholdSettings,
  type ThresholdSettings,
} from '../../services/gridApi';
import { thresholdSettings } from '../../stores/thresholdSettings';
import { useSensorStore } from '../../stores/sensorStore';

const { t } = useI18n();

const store = useSensorStore();

const props = defineProps<{ group?: string }>();

const snapshot = ref<ThresholdSettings | null>(null);

const draft = ref<Record<string, number>>({});

const loading = ref(true);

const busy = ref(false);

const error = ref('');

const success = ref('');

const confirmReset = ref(false);

const groups = [
  { key: 'health', icon: 'monitor_heart', keys: ['health_warning', 'health_critical'] },
  {
    key: 'electrical',
    icon: 'bolt',
    keys: [
      'overload',
      'voltage_drop',
      'overvoltage',
      'frequency_instability',
      'harmonics_spike',
      'short_circuit',
      'short_circuit_voltage',
    ],
  },
  {
    key: 'thermal',
    icon: 'device_thermostat',
    keys: ['overheating', 'cooling_winding', 'cooling_failure'],
  },
  {
    key: 'oil',
    icon: 'water_drop',
    keys: ['insulation_degradation', 'insulation_methane', 'oil_leak', 'arc_discharge'],
  },
];

const visibleGroups = computed(() =>
  props.group ? groups.filter((group) => group.key === props.group) : groups,
);

function fieldLabel(key: string, label: string) {
  return t(`thresholdLabels.${key}`) === `thresholdLabels.${key}`
    ? label
    : t(`thresholdLabels.${key}`);
}

const dirty = computed(
  () =>
    !!snapshot.value &&
    snapshot.value.fields.some((f) => draft.value[f.key] !== snapshot.value!.values[f.key]),
);

const valid = computed(() => {
  const v = draft.value;

  return (
    !!snapshot.value &&
    snapshot.value.fields.every(
      (f) =>
        typeof v[f.key] === 'number' &&
        Number.isFinite(v[f.key]) &&
        v[f.key]! >= f.min &&
        v[f.key]! <= f.max,
    ) &&
    v.health_critical! < v.health_warning! &&
    v.voltage_drop! < v.overvoltage! &&
    v.short_circuit! >= v.overload!
  );
});

function accept(data: ThresholdSettings) {
  snapshot.value = data;
  thresholdSettings.value = data;
  draft.value = { ...data.values };
}

watch(thresholdSettings, (data) => {
  if (data && snapshot.value && !busy.value && !dirty.value) {
    snapshot.value = data;
    draft.value = { ...data.values };
  }
});

function discard() {
  if (snapshot.value) draft.value = { ...snapshot.value.values };

  success.value = '';
  error.value = '';
}

async function load() {
  loading.value = true;
  error.value = '';

  try {
    accept(await fetchThresholdSettings());
  } catch {
    error.value = t('settings.error');
  } finally {
    loading.value = false;
  }
}

async function save(reset: boolean) {
  busy.value = true;
  error.value = '';
  success.value = '';

  try {
    accept(reset ? await resetThresholdSettings() : await saveThresholdSettings(draft.value));
    success.value = t(reset ? 'settings.resetDone' : 'settings.saved');

    if (!store.connection.websocketConnected) void store.refreshAll();
  } catch (err: any) {
    error.value =
      typeof err.response?.data?.detail === 'string'
        ? err.response.data.detail
        : t('settings.error');
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>
