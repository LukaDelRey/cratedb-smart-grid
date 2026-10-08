<template>
  <div class="twin-header row no-wrap justify-between q-mb-none q-gutter-x-md q-ml-none">
    <div class="row items-center q-gutter-md">
      <q-btn
        color="blue-grey-2"
        flat
        icon="arrow_back"
        round
        to="/"
      />

      <q-avatar
        color="cyan"
        text-color="black"
        :icon="icon"
      />

      <div>
        <div class="section-kicker text-weight-bold text-uppercase">
          {{ assetId || t('dashboard.loadingAssetData') }}
        </div>

        <div class="text-h4 text-weight-bold">{{ translateText(title) }}</div>
      </div>
    </div>

    <div class="row q-gutter-sm">
      <q-chip
        color="positive"
        icon="health_and_safety"
        text-color="white"
      >
        {{ t('dashboard.health') }} {{ health ?? 0 }}%
      </q-chip>

      <q-chip
        color="negative"
        icon="crisis_alert"
        text-color="white"
      >
        {{ t('dashboard.risk') }} {{ risk ?? 0 }}%
      </q-chip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../../i18n';

const { t, translateText } = useI18n();

defineProps({
  title: {
    type: String,
    required: true,
  },
  assetId: {
    type: String,
    default: 'Asset',
  },
  health: {
    type: Number,
    default: 0,
  },
  risk: {
    type: Number,
    default: 0,
  },
  icon: {
    type: String,
    default: 'hub',
  },
});
</script>
