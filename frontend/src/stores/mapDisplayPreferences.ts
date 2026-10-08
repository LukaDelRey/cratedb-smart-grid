import { computed } from 'vue';
import { thresholdValue } from './thresholdSettings';

export const DEFAULT_COMPACT_PIN_ZOOM = 11;
export const compactPinZoom = computed(() =>
  thresholdValue('compact_pin_zoom', DEFAULT_COMPACT_PIN_ZOOM),
);
