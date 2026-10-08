import { ref } from 'vue';
import { fetchThresholdSettings, type ThresholdSettings } from '../services/gridApi';

// One reactive snapshot shared by every component; backend owns persistence.
export const thresholdSettings = ref<ThresholdSettings | null>(null);

export async function refreshThresholdSettings() {
  thresholdSettings.value = await fetchThresholdSettings();
}

export function healthThreshold(key: 'health_warning' | 'health_critical') {
  return thresholdSettings.value?.values[key] ?? (key === 'health_warning' ? 70 : 40);
}

export function thresholdValue(key: string, defaultValue: number) {
  return thresholdSettings.value?.values[key] ?? defaultValue;
}
