import axios from 'axios'
import type {
  AlarmCorrelation,
  BlackoutPrediction,
  ContingencyResult,
  ForecastPoint,
  GridSummary,
  Insight,
  PowerLine,
  Region,
  RootCause,
  Station,
  Topology,
  WeatherImpact
} from '../types/dashboard'

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

export async function fetchForecast():Promise<ForecastPoint[]>{

  const response = await api.get('/grid/forecast')

  return response.data.points || []
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

export async function fetchCrateHealth():Promise<{ connected?: boolean; latencyMs?: number }>{

  const response = await api.get('/api/health/cratedb')

  return response.data
}

export function getWebSocketUrl():string{

  return API_URL
    .replace('http://', 'ws://')
    .replace('https://', 'wss://') + '/ws'
}
