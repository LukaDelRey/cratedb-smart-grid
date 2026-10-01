import { clamp } from './numbers'

// Aggregate health is separate from the severity of individual station alarms.
export function gridHealthStatus(score:unknown):'normal'|'warning'|'critical'{
  const health = Math.round(clamp(score))
  if(health >= 70) return 'normal'
  if(health >= 40) return 'warning'
  return 'critical'
}
