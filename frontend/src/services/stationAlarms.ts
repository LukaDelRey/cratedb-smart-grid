import type { Station } from '../types/dashboard'

export type StationAlarm = { type:string; title:string; severity:'WARNING'|'CRITICAL'; value:number|null; unit:string|null }

// Backend conditions are authoritative for pins, popups, active rows and counts.
export function stationAlarms(station:Station):StationAlarm[]{
  return station.active_alarms ?? []
}
