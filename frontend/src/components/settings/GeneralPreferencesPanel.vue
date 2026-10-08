<template>
  <section class="preferences-panel scada-card q-pa-lg">
    <h2 class="q-mt-none q-mb-sm q-mx-none text-h5">{{ t('settings.general') }}</h2>

    <p
      class="q-my-sm q-mx-none text-body2"
      style="line-height: 1.6"
    >
      {{ t('settings.generalDescription') }}
    </p>

    <section class="preference-group">
      <h3>{{ t('settings.language') }}</h3>

      <div class="preference-row items-center justify-between row no-wrap">
        <div>
          <strong class="text-body2">{{ t('settings.language') }}</strong>

          <p
            class="q-my-sm q-mx-none text-body2"
            style="line-height: 1.6"
          >
            {{ t('settings.languageDescription') }}
          </p>
        </div>

        <q-select
          :model-value="language"
          class="language-select"
          dark
          dense
          emit-value
          map-options
          option-label="label"
          option-value="code"
          outlined
          style="width: 180px"
          :label="t('settings.language')"
          :options="languageOptions"
          @update:model-value="emit('update:language', $event)"
        />
      </div>
    </section>

    <div
      class="preference-note row no-wrap items-center q-mt-lg q-gutter-x-sm q-ml-none text-caption"
      style="color: #8faabd"
    >
      <q-icon
        class="q-mr-sm"
        color="cyan"
        name="check_circle"
      />
      {{ t('settings.autoSaved') }}
    </div>
  </section>
</template>

<script setup lang="ts">
defineOptions({ __scopeId: 'data-v-ui-e649836e' });

import { useI18n } from '../../i18n';

defineProps<{
  language: string;
  languageOptions: readonly { code: string; label: string }[];
}>();

const emit = defineEmits<{ 'update:language': [language: string] }>();
const { t } = useI18n();
</script>
