<template>
  <div
    class="sidebar-empty-state column items-center justify-center text-center text-blue-grey-3"
    role="status"
  >
    <q-spinner
      v-if="loading"
      color="blue-grey-4"
      size="30px"
    />
    <q-icon
      v-else
      :name="icon"
      :color="color"
      size="30px"
    />
    <span class="text-caption">{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ message: string; icon?: string; color?: string; loading?: boolean }>(), {
  icon: 'sensors_off',
  color: 'blue-grey-4',
  loading: false,
});
</script>

<style scoped>
.sidebar-empty-state {
  flex: 1 1 auto;
  min-height: 0;
  gap: 12px;
  padding: 20px 24px;
  line-height: 1.6;
}
</style>
