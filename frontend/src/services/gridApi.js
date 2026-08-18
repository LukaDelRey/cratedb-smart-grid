import axios from 'axios'

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000
})

export async function fetchLatestStations(){

  const response = await api.get('/latest-stations')

  return response.data.data || []
}

export async function fetchGridSummary(){

  const response = await api.get('/grid/summary')

  return response.data
}

export async function fetchRegions(){

  const response = await api.get('/regions')

  return response.data.regions || []
}

export async function fetchBlackout(){

  const response = await api.get('/blackout')

  return response.data
}

export async function fetchPowerLines(){

  const response = await api.get('/power-lines')

  return response.data.data || []
}

export async function fetchForecast(){

  const response = await api.get('/grid/forecast')

  return response.data.points || []
}

export async function fetchAIInsights(){

  const response = await api.get('/ai/insights')

  return response.data.insights || []
}

export async function fetchWeatherImpact(){

  const response = await api.get('/weather/grid-impact')

  return response.data
}

export async function fetchAlarmCorrelations(){

  const response = await api.get('/alarm-correlations')

  return response.data.correlations || []
}

export async function fetchRootCause(correlationId){

  const response = await api.get(`/root-cause/${correlationId}`)

  return response.data
}

export async function fetchContingency(assetId){

  const response = await api.get(`/n-1/${assetId}`)

  return response.data
}

export async function fetchSystemTopology(){

  const response = await api.get('/system/topology')

  return response.data
}

export async function fetchCrateHealth(){

  const response = await api.get('/api/health/cratedb')

  return response.data
}

export function getWebSocketUrl(){

  return API_URL
    .replace('http://', 'ws://')
    .replace('https://', 'wss://') + '/ws'
}
