<template>
  <div class="station-display-control absolute">
    <div class="station-display-title">
      <q-icon
        name="hub"
        size="14px"
      />
      {{ t('dashboard.stationGrouping') }}
    </div>
    <div class="station-display-modes">
      <button
        v-for="mode in stationDisplayModes"
        :key="String(mode.value)"
        type="button"
        :class="{ active: model === mode.value }"
        :aria-pressed="model === mode.value"
        @click="model = mode.value"
      >
        <q-icon
          :name="mode.icon"
          size="17px"
        />
        {{ mode.label }}
      </button>
    </div>
    <q-tooltip>{{ t('dashboard.stationDisplayHint') }}</q-tooltip>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../../../i18n';
const model = defineModel<boolean>({ default: false });
const { t } = useI18n();
const stationDisplayModes = computed(() => [
  { value: false, icon: 'scatter_plot', label: t('dashboard.individualPins') },
  { value: true, icon: 'bubble_chart', label: t('dashboard.groupedPins') },
]);
</script>
<style scoped>
.station-display-control {
  top: 14px;
  right: 14px;
  z-index: 2;
  padding: 10px;
  border: 1px solid rgba(148, 190, 214, 0.22);
  border-radius: 12px;
  background: rgba(5, 11, 20, 0.94);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(12px);
  color: #b0c6d4;
}
.station-display-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.station-display-modes {
  display: flex;
  gap: 4px;
}
.station-display-modes button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 10px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: rgba(148, 190, 214, 0.06);
  color: #96adbd;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}
.station-display-modes button.active {
  border-color: rgba(113, 242, 63, 0.35);
  background: rgba(113, 242, 63, 0.1);
  color: #b8f6a1;
}
.station-display-modes button:hover {
  background: rgba(148, 190, 214, 0.16);
}
.station-display-modes button:focus-visible {
  outline: 2px solid #b8f6a1;
  outline-offset: 2px;
}
@media (max-width: 600px) {
  .station-display-control {
    top: auto;
    bottom: 14px;
    right: 54px;
  }
}
</style>
