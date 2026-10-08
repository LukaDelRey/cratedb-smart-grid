<template>
  <WorkspacePreferencesPanel
    section="notifications"
    :preferences="preferences"
    @reset="emit('reset')"
  />
</template>
<script setup lang="ts">
import WorkspacePreferencesPanel from './WorkspacePreferencesPanel.vue';
import type { workspacePreferences } from '../../stores/workspacePreferences';

defineProps<{ preferences: typeof workspacePreferences }>();
const emit = defineEmits<{ reset: [] }>();
</script>
