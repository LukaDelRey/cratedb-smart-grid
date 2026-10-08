import { healthThreshold } from '../stores/thresholdSettings';
import { clamp } from './numbers';

// Aggregate health is separate from the severity of individual station alarms.
export function gridHealthStatus(score: unknown): 'normal' | 'warning' | 'critical' {
  const health = Math.round(clamp(score));

  if (health >= healthThreshold('health_warning')) return 'normal';

  if (health >= healthThreshold('health_critical')) return 'warning';

  return 'critical';
}
