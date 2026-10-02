import axios from 'axios'
import type {
  AlarmCorrelation,
  AlarmAuditEntry,
  AlarmStats,
  BlackoutPrediction,
  ContingencyResult,
  ForecastPoint,
  GridSummary,
  Insight,
  PowerLine,
  PersistentAlarm,
  Region,
  RootCause,
  ScenarioDefinition,
  ScenarioRun,
  ScenarioRunRequest,
  Station,
  StationHistoryPoint,
  Topology,
  WeatherImpact
} from '../types/dashboard'

export type AlarmQuery = {
  status?: string
  severity?: string
  stationId?: string
  limit?: number
}

export type AlarmAction = {
  actor?: string
  note?: string
}

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000
})

export async function fetchLatestStations():Promise<Station[]>{

  const response = await api.get('/latest-stations')

  return response.data.data || []
}

export async function fetchStationHistory(
  stationId:string,
  hours = 24,
  limit = 500
):Promise<StationHistoryPoint[]>{
  const response = await api.get(`/api/stations/${encodeURIComponent(stationId)}/history`, {
    params:{ hours, limit }
  })

  return response.data.data || []
}

export async function fetchGridSummary():Promise<GridSummary>{

  const response = await api.get('/grid/summary')

  return response.data
}

export async function fetchRegions():Promise<Region[]>{

  const response = await api.get('/regions')

  return response.data.regions || []
}

export async function fetchBlackout():Promise<BlackoutPrediction>{

  const response = await api.get('/blackout')

  return response.data
}

export async function fetchPowerLines():Promise<PowerLine[]>{

  const response = await api.get('/power-lines')

  return response.data.data || []
}

export type GridLoadForecast = {
  points:ForecastPoint[]; available:boolean; availableHorizons:number[]
  historyHours:number; method:string; horizonHours:number; reason:string|null
}

export async function fetchGridLoadForecast(hours:number):Promise<GridLoadForecast>{
  const response = await api.get('/grid/forecast', {params:{hours}})
  return response.data
}

export async function fetchForecast():Promise<ForecastPoint[]>{
  return (await fetchGridLoadForecast(12)).points || []
}

export async function fetchAIInsights():Promise<Insight[]>{

  const response = await api.get('/ai/insights')

  return response.data.insights || []
}

export async function fetchWeatherImpact():Promise<WeatherImpact>{

  const response = await api.get('/weather/grid-impact')

  return response.data
}

export async function fetchAlarmCorrelations():Promise<AlarmCorrelation[]>{

  const response = await api.get('/alarm-correlations')

  return response.data.correlations || []
}

export async function fetchPersistentAlarms(query:AlarmQuery = {}):Promise<PersistentAlarm[]>{
  const response = await api.get('/api/alarms', {
    params:{
      status:query.status,
      severity:query.severity,
      station_id:query.stationId,
      limit:query.limit
    }
  })

  return response.data.data || []
}

export async function fetchAlarmStats():Promise<AlarmStats>{
  const response = await api.get('/api/alarms/stats')

  return response.data
}

export async function fetchAlarmAudit(alarmId:string):Promise<AlarmAuditEntry[]>{
  const response = await api.get(`/api/alarms/${alarmId}/audit`)

  return response.data.data || []
}

export async function acknowledgePersistentAlarm(
  alarmId:string,
  action:AlarmAction = {}
):Promise<PersistentAlarm>{
  const response = await api.post(`/api/alarms/${alarmId}/acknowledge`, action)

  return response.data
}

export async function createPersistentAlarmWorkOrder(
  alarmId:string,
  action:AlarmAction = {}
):Promise<PersistentAlarm>{
  const response = await api.post(`/api/alarms/${alarmId}/work-order`, action)

  return response.data
}

export async function resolvePersistentAlarm(
  alarmId:string,
  action:AlarmAction = {}
):Promise<PersistentAlarm>{
  const response = await api.post(`/api/alarms/${alarmId}/resolve`, action)

  return response.data
}

export async function fetchScenarioDefinitions():Promise<ScenarioDefinition[]>{
  const response = await api.get('/api/scenarios/definitions')

  return response.data.data || []
}

export async function fetchScenarioRuns(limit = 50):Promise<ScenarioRun[]>{
  const response = await api.get('/api/scenarios', { params:{ limit } })

  return response.data.data || []
}

export async function runScenario(request:ScenarioRunRequest):Promise<ScenarioRun>{
  const response = await api.post('/api/scenarios/run', request)

  return response.data
}

export async function stopScenario(scenarioId:string):Promise<ScenarioRun>{
  const response = await api.post(`/api/scenarios/${scenarioId}/stop`)

  return response.data
}

export async function fetchRootCause(correlationId:string):Promise<RootCause>{

  const response = await api.get(`/root-cause/${correlationId}`)

  return response.data
}

export async function fetchContingency(assetId:string):Promise<ContingencyResult>{

  const response = await api.get(`/n-1/${assetId}`)

  return response.data
}

export async function fetchSystemTopology():Promise<Topology>{

  const response = await api.get('/system/topology')

  return response.data
}

export async function fetchCrateHealth():Promise<{
  connected?: boolean
  latencyMs?: number
  mqttConnected?: boolean
  telemetryPersistence?: string
}>{

  const response = await api.get('/api/health/cratedb')

  return response.data
}

export function getWebSocketUrl():string{

  return API_URL
    .replace('http://', 'ws://')
    .replace('https://', 'wss://') + '/ws'
}

export type ThresholdSettings = {
  values:Record<string, number>
  defaults:Record<string, number>
  fields:{ key:string; label:string; unit:string; default:number; min:number; max:number; comparison:string }[]
}
export async function fetchThresholdSettings():Promise<ThresholdSettings>{
  return (await api.get('/api/settings/thresholds')).data
}
export async function saveThresholdSettings(values:Record<string, number>):Promise<ThresholdSettings>{
  return (await api.put('/api/settings/thresholds', {values})).data
}
export async function resetThresholdSettings():Promise<ThresholdSettings>{
  return (await api.post('/api/settings/thresholds/reset')).data
}
