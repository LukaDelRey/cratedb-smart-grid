<template>
  <Teleport
    v-if="target"
    :to="target"
  >
    <button
      type="button"
      class="map-expand-button"
      :aria-label="label"
      :aria-pressed="model"
      @click="model = !model"
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <path
          :d="
            model ? 'M3 9h6V3m12 6h-6V3M3 15h6v6m12-6h-6v6' : 'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6'
          "
        />
      </svg>
      <q-tooltip
        anchor="center left"
        self="center right"
      >
        {{ label }}
      </q-tooltip>
    </button>
  </Teleport>
</template>
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import type { Map, IControl } from 'mapbox-gl';
import { useI18n } from '../../../../i18n';
const props = defineProps<{ map: Map }>();
const model = defineModel<boolean>({ default: false });
const { t } = useI18n();
const label = computed(() => t(model.value ? 'dashboard.minimizeMap' : 'dashboard.expandMap'));
const target = shallowRef<HTMLDivElement | null>(null);
const control: IControl = {
  onAdd() {
    const element = document.createElement('div');
    element.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    target.value = element;
    return element;
  },
  onRemove() {
    target.value?.remove();
    target.value = null;
  },
};
onMounted(() => props.map.addControl(control, 'bottom-right'));
onBeforeUnmount(() => {
  if (props.map.hasControl(control)) props.map.removeControl(control);
});
</script>
<style scoped>
.map-expand-button {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
}
</style>
