import type { Station } from '../types/dashboard'

const STANDARD_VOLTAGES_KV = [10,20,35,110,220,400]

const HEALTH_ALARM_PENALTIES:Record<string,number> = {
  overload:12,
  overheating:14,
  voltage_drop:8,
  overvoltage:8,
  voltage_instability:12,
  frequency_instability:12,
  harmonics_spike:10,
  sensor_failure:10,
  cooling_failure:18,
  insulation_degradation:15,
  oil_leak:18,
  arc_discharge:24,
  short_circuit:35,
  feeder_failure:28,
  transformer_trip:35,
  offline:30
}

const RISK_ALARM_PENALTIES:Record<string,number> = {
  overload:18,
  overheating:20,
  voltage_drop:10,
  overvoltage:10,
  voltage_instability:16,
  frequency_instability:16,
  harmonics_spike:12,
  sensor_failure:7,
  cooling_failure:22,
  insulation_degradation:20,
  oil_leak:24,
  arc_discharge:32,
  short_circuit:40,
  feeder_failure:34,
  transformer_trip:40,
  offline:35
}

function voltagePenalty(voltage:unknown){
  const value = Number(voltage)
  if(!Number.isFinite(value) || value <= 0) return 0

  const nominal = STANDARD_VOLTAGES_KV.reduce((closest,candidate) =>
    Math.abs(candidate - value) < Math.abs(closest - value) ? candidate : closest
  )

  return Math.max(0,(Math.abs(value - nominal) / nominal * 100) - 5) * 0.8
}

export function getHealth(station:Station){
  let score = 100

  score -= (station.thermal?.oil_temp_c || 0) * 0.28
  score -= Math.max(0,(station.electrical?.current_a || 0) - 420) * 0.08

  score -= voltagePenalty(station.electrical?.voltage_kv)
  score -= (station.electrical?.harmonics_thd || 0) * 1.5

  Object.entries(station.alarms || {}).forEach(([alarm,enabled]) => {
    if(enabled) score -= HEALTH_ALARM_PENALTIES[alarm] || 0
  })

  return Math.max(0,Math.min(100,Math.round(score)))
}

export function getRisk(station:Station){
  let risk = 5

  risk += Math.max(0,(station.thermal?.oil_temp_c || 0) - 60) * 0.8
  risk += Math.max(0,(station.electrical?.current_a || 0) - 350) * 0.1
  risk += Math.max(0,(station.electrical?.active_power_kw || 0) - 2600) * 0.01
  risk += Math.max(0,(station.electrical?.harmonics_thd || 0) - 3) * 3
  risk += Math.max(0,(station.oil_gas?.hydrogen_ppm || 0) - 15) * 0.8

  Object.entries(station.alarms || {}).forEach(([alarm,enabled]) => {
    if(enabled) risk += RISK_ALARM_PENALTIES[alarm] || 0
  })

  return Math.max(0,Math.min(100,Math.round(risk)))
}
