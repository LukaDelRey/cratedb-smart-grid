import { refreshThresholdSettings, thresholdSettings } from './thresholdSettings'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import {
  fetchLatestStations,
  fetchGridSummary,
  fetchRegions,
  fetchBlackout,
  fetchPowerLines,
  fetchForecast,
  fetchAIInsights,
  fetchWeatherImpact,
  fetchAlarmCorrelations,
  fetchRootCause,
  fetchContingency,
  fetchSystemTopology,
  fetchCrateHealth,
  fetchPersistentAlarms,
  getWebSocketUrl
} from '../services/gridApi'
import { t } from '../i18n'
import { stationAlarms } from '../services/stationAlarms'
import {
  getHealth as calculateStationHealth,
  getRisk as calculateStationRisk
} from '../services/stationAnalytics'
import { average, clamp } from '../utils/numbers'
import type {
  AlarmCorrelation,
  AlarmEvent,
  AssetStatus,
  BlackoutPrediction,
  ConnectionState,
  ContingencyResult,
  Coordinates,
  CustomerCluster,
  ForecastPoint,
  GridSummary,
  Insight,
  MetricHistory,
  MetricHistoryKey,
  MetricHistoryValue,
  PowerLine,
  Region,
  RootCause,
  Station,
  Topology,
  TopRiskSubstation,
  TransformerAsset,
  WeatherImpact,
  PersistentAlarm
} from '../types/dashboard'

const DEFAULT_CENTER: Coordinates = {
  lng:16.4339,
  lat:46.3844
}

function alarmList(station?:Station | null){
  return station ? stationAlarms(station).map(alarm => alarm.type) : []
}

function assetNumber(id:unknown){
  const match = String(id || '').match(/(\d+)/)

  return match
    ? Number(match[1])
    : Number.MAX_SAFE_INTEGER
}

function normalizeTransformerId(id:unknown){
  const match = String(id || '').toUpperCase().match(/TR-?0*(\d+)/)

  return match
    ? `TR-${Number(match[1])}`
    : String(id || '').toUpperCase()
}

export const useSensorStore = defineStore('sensorStore', () => {

  const stationsMap = ref<Record<string, Station>>({})
  const persistentAlarms = ref<PersistentAlarm[]>([])
  const regions = ref<Region[]>([])
  const powerLines = ref<PowerLine[]>([])
  const forecast = ref<ForecastPoint[]>([])
  const insights = ref<Insight[]>([])
  const weather = ref<WeatherImpact>({
    temperatureC:24,
    windRisk:0,
    lightningRisk:0,
    stormRisk:0,
    gridImpact:0,
    alerts:[]
  })
  const correlations = ref<AlarmCorrelation[]>([])
  const selectedRootCause = ref<RootCause | null>(null)
  const contingency = ref<ContingencyResult | null>(null)
  const topology = ref<Topology>({
    platformHealth:0,
    nodes:[],
    edges:[]
  })

  const summary = ref<GridSummary>({
    gridHealth:100,
    blackoutRisk:0,
    activeAlarms:0,
    stations:0
  })

  const blackout = ref<BlackoutPrediction>({
    probability:0,
    affectedStations:0,
    estimatedMinutes:0
  })

  const connection = ref<ConnectionState>({
    websocketConnected:false,
    crateConnected:false,
    mqttConnected:false,
    latencyMs:0,
    messagesPerSecond:0,
    lastEventAt:null,
    quality:'offline'
  })

  const eventStream = ref<AlarmEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const metricHistory = ref<MetricHistory>({
    totalLoadMW:[],
    systemLoadPct:[],
    gridHealth:[],
    blackoutRisk:[],
    activeAlarms:[],
    powerQuality:[],
    voltageStability:[],
    energyEfficiency:[],
    frequency:[]
  })

  let ws:WebSocket | null = null
  let refreshTimer:ReturnType<typeof setInterval> | null = null
  let eventSequence = 0
  const HISTORY_WINDOW_MS = 60 * 60 * 1000
  const MAX_HISTORY_POINTS = 720

  function pushHistoryPoint(key:MetricHistoryKey,value:number,windowMs = HISTORY_WINDOW_MS){
    if(!Number.isFinite(value)){
      return
    }

    const timestamp = Date.now()
    const cutoff = timestamp - windowMs
    const point = {
      timestamp,
      value:Math.round(value * 100) / 100
    }

    metricHistory.value[key] = [
      ...(metricHistory.value[key] || []),
      point
    ].filter((item:MetricHistoryValue) => {
      const itemTimestamp = typeof item === 'number'
        ? timestamp
        : Number(item.timestamp) || timestamp

      return itemTimestamp >= cutoff
    }).slice(-MAX_HISTORY_POINTS)
  }

  function recordMetricSnapshot(){
    const stationCount = Math.max(stations.value.length, 1)
    const nominalMW = stationCount * 3
    const systemLoadPct = nominalMW
      ? clamp((totalLoadMW.value / nominalMW) * 100)
      : 0
    const thdValues = stations.value
      .map(station => station.electrical?.harmonics_thd)
      .filter(Number.isFinite)
    const avgThd = thdValues.length
      ? Math.round((thdValues.reduce((sum,value) => sum + value, 0) / thdValues.length) * 10) / 10
      : 3.2
    const gridHealth = currentGridHealth.value
    const blackoutProbability = currentBlackoutProbability.value
    const activeAlarmCount = currentAlarmCount.value
    const timestamp = Date.now()
    const gridPulse = Math.sin(timestamp / 47000)
    const loadPulse = Math.cos(timestamp / 73000)
    const frequency = 50 + (systemLoadPct - 50) * 0.0012 - blackoutProbability * 0.0005 + gridPulse * 0.014
    const voltageStabilityValue = clamp(
      gridHealth + 3.4 - avgThd * 0.12 + (100 - systemLoadPct) * 0.01 + gridPulse * 0.35,
      91,
      99
    )
    const energyEfficiencyValue = clamp(
      gridHealth - 5 + (100 - systemLoadPct) * 0.035 - blackoutProbability * 0.025 + loadPulse * 0.45,
      70,
      96
    )

    pushHistoryPoint('totalLoadMW', totalLoadMW.value)
    pushHistoryPoint('systemLoadPct', systemLoadPct)
    pushHistoryPoint('gridHealth', gridHealth)
    pushHistoryPoint('blackoutRisk', blackoutProbability)
    pushHistoryPoint('activeAlarms', activeAlarmCount)
    pushHistoryPoint('powerQuality', avgThd)
    pushHistoryPoint('voltageStability', voltageStabilityValue)
    pushHistoryPoint('energyEfficiency', energyEfficiencyValue)
    pushHistoryPoint('frequency', frequency)
  }

  function parseLocation(station?:Station | null):Coordinates{
    const loc = station?.location

    const match = typeof loc === 'string' ? loc.match(/^\s*\(([^,]+),([^,]+)\)\s*$/) : null
    const coordinates = loc && typeof loc === 'object' ? loc.coordinates : null
    const lng = Number(match?.[1] ?? coordinates?.[0])
    const lat = Number(match?.[2] ?? coordinates?.[1])
    return Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90
      ? {lng,lat} : DEFAULT_CENTER
  }

  function getStationHealth(station:Station){
    return calculateStationHealth(station)
  }

  function getStationRisk(station:Station){
    return calculateStationRisk(station)
  }

  function getStationStatus(station:Station):AssetStatus{
    return station.status ?? 'normal'
  }

  function pushEvent(event:Partial<AlarmEvent>){
    eventSequence += 1

    eventStream.value.unshift({
      id:event.id || `${Date.now()}-${eventSequence}`,
      timestamp:event.timestamp || new Date().toISOString(),
      severity:event.severity || 'INFO',
      source:event.source || 'SCADA',
      title:event.title || 'Realtime event',
      description:event.description,
      assetId:event.assetId
    })

    eventStream.value = eventStream.value.slice(0, 80)
    connection.value.lastEventAt = new Date().toISOString()
    connection.value.messagesPerSecond = Math.max(
      1,
      Math.round(eventStream.value.length / 4)
    )
  }

  function updateStation(station:Station){
    if(!station?.station_id){
      return
    }

    const existing = stationsMap.value[station.station_id]
    const timestamp = (value:unknown) => typeof value === 'number'
      ? value
      : typeof value === 'string' ? Date.parse(value) : NaN
    const previousTime = timestamp(existing?.timestamp)
    const incomingTime = timestamp(station.timestamp)
    if(Number.isFinite(previousTime) && Number.isFinite(incomingTime) && incomingTime < previousTime){
      return
    }
    stationsMap.value[station.station_id] = station

    const previous = stationAlarms(existing ?? {station_id:station.station_id})
    const current = stationAlarms(station)
    const timestampText = typeof station.timestamp === 'number'
      ? new Date(station.timestamp).toISOString() : station.timestamp
    for(const alarm of current){
      if(!previous.some(condition => condition.type === alarm.type)){
        pushEvent({severity:alarm.severity, source:'SCADA', title:alarm.title,
          description:`Alarm raised: ${alarm.type}`, assetId:station.station_id, timestamp:timestampText})
      }
    }
    for(const alarm of previous){
      if(!current.some(condition => condition.type === alarm.type)){
        pushEvent({severity:'INFO', source:'SCADA', title:`Cleared: ${alarm.title}`,
          description:`Alarm resolved: ${alarm.type}`, assetId:station.station_id, timestamp:timestampText})
      }
    }
  }

  async function refreshAll(){
    loading.value = true

    const requests = {
      thresholdData:refreshThresholdSettings(),
      stationData:fetchLatestStations(),
      summaryData:fetchGridSummary(),
      regionData:fetchRegions(),
      blackoutData:fetchBlackout(),
      lineData:fetchPowerLines(),
      forecastData:fetchForecast(),
      insightData:fetchAIInsights(),
      weatherData:fetchWeatherImpact(),
      correlationData:fetchAlarmCorrelations(),
      topologyData:fetchSystemTopology(),
      crateData:fetchCrateHealth(),
      alarmData:fetchPersistentAlarms({status:'ACTIVE,ACK,WORK_ORDER',limit:1000})
    }

    try{
      const entries = Object.entries(requests)
      const settled = await Promise.allSettled(
        entries.map(async ([key,promise]) => [key, await promise])
      )

      const data:Record<string, any> = {}
      const failed:string[] = []

      settled.forEach((result,index) => {
        const key = entries[index]?.[0] || 'endpoint'

        if(result.status === 'fulfilled'){
          const [,value] = result.value
          data[key] = value
          return
        }

        failed.push(`${key}: ${result.reason?.message || 'request failed'}`)
      })

      if(Array.isArray(data.stationData)){
        data.stationData.forEach(updateStation)
      }

      if(data.summaryData) summary.value = data.summaryData
      if(data.regionData) regions.value = data.regionData
      if(data.blackoutData) blackout.value = data.blackoutData
      if(data.lineData) powerLines.value = data.lineData
      if(data.forecastData) forecast.value = data.forecastData
      if(data.insightData) insights.value = data.insightData
      if(data.alarmData) persistentAlarms.value = data.alarmData
      if(data.weatherData) weather.value = data.weatherData
      if(data.correlationData) correlations.value = data.correlationData
      if(data.topologyData) topology.value = data.topologyData

      if(data.crateData){
        connection.value.crateConnected = Boolean(data.crateData.connected)
        connection.value.mqttConnected = Boolean(data.crateData.mqttConnected)
        connection.value.latencyMs = data.crateData.latencyMs || 0
      }else if(failed.some(item => item.startsWith('crateData'))){
        connection.value.crateConnected = false
      }

      connection.value.quality = connection.value.websocketConnected
        ? failed.length
          ? 'degraded'
          : 'excellent'
        : connection.value.crateConnected
          ? 'degraded'
          : 'offline'

      error.value = failed.length
        ? `Some realtime endpoints failed: ${failed.slice(0, 2).join('; ')}`
        : null

      if(failed.length){
        console.warn(error.value)
      }

      recordMetricSnapshot()

      if(!eventStream.value.length){
        pushEvent({
          severity:'INFO',
          source:'SYSTEM',
          title:'Dashboard telemetry online',
          description:'CrateDB analytics, EMQX feed and AI layers initialized.'
        })
      }

    }finally{
      loading.value = false
    }
  }
  function connectWebSocket(){
    if(ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)){
      return
    }

    ws = new WebSocket(getWebSocketUrl())

    ws.onopen = () => {
      connection.value.websocketConnected = true
      connection.value.quality = 'excellent'

      pushEvent({
        severity:'INFO',
        source:'WEBSOCKET',
        title:'Realtime feed connected',
        description:'FastAPI gateway is streaming live station updates.'
      })
    }

    ws.onmessage = (event:MessageEvent<string>) => {
      let payload
      try{
        payload = JSON.parse(event.data)
        if(!payload || typeof payload !== 'object' || Array.isArray(payload)){
          throw new Error('Expected a realtime object')
        }
      }catch{
        error.value = 'Invalid realtime message received'
        connection.value.quality = 'degraded'
        return
      }

      if(payload.type === 'threshold_settings' && payload.settings){
        thresholdSettings.value = payload.settings
        void refreshAll()
        return
      }

      if(payload.station_id){
        updateStation(payload)
        recordMetricSnapshot()
        return
      }

      pushEvent({
        severity:payload.severity || 'INFO',
        source:payload.type || 'MQTT',
        title:payload.title || 'Realtime event',
        description:payload.description || JSON.stringify(payload),
        assetId:payload.assetId
      })
    }

    ws.onclose = () => {
      connection.value.websocketConnected = false
      connection.value.quality = connection.value.crateConnected
        ? 'degraded'
        : 'offline'

      setTimeout(connectWebSocket, 3000)
    }
  }

  async function start(){
    await refreshAll()
    connectWebSocket()

    if(!refreshTimer){
      refreshTimer = setInterval(refreshAll, 15000)
    }
  }

  async function openRootCause(correlationId:string){
    selectedRootCause.value = await fetchRootCause(correlationId)
  }

  async function runContingency(assetId:string){
    contingency.value = await fetchContingency(assetId)
  }

  const stations = computed<Station[]>(() =>
    Object.values(stationsMap.value)
      .sort((a,b) => assetNumber(a.station_id) - assetNumber(b.station_id))
  )

  const alarms = computed<Station[]>(() =>
    stations.value.filter(station => alarmList(station).length)
  )
  const currentAlarmCount = computed(() =>
    stations.value.reduce((sum,station) => sum + stationAlarms(station).length,0)
  )
  const currentGridHealth = computed(() => stations.value.length
    ? average(stations.value.map(getStationHealth)) : summary.value.gridHealth)
  const currentBlackoutProbability = computed(() => stations.value.length
    ? Math.round(stations.value.filter(station => (station.thermal?.oil_temp_c ?? 0)>90 || (station.electrical?.current_a ?? 0)>500).length / stations.value.length * 1000)/10
    : blackout.value.probability)

  const totalLoadMW = computed(() => {
    const totalKW = stations.value.reduce(
      (sum,station) => sum + (station.electrical?.active_power_kw || 0),
      0
    )

    return Math.round(totalKW / 1000)
  })

  const transformers = computed<TransformerAsset[]>(() =>
    stations.value.map((station,index) => {
      const location = parseLocation(station)
      const health = getStationHealth(station)
      const risk = getStationRisk(station)
      const stationNumber = assetNumber(station.station_id)

      return {
        id:`TR-${stationNumber}`,
        name:`Transformer ${station.station_id}`,
        stationCode:station.station_id,
        substation:station.station_id,
        lng:location.lng + ((index % 4) - 2) * 0.0008,
        lat:location.lat + ((index % 3) - 1) * 0.0008,
        loadPct:Math.min(100, Math.round((station.electrical?.current_a || 0) / 6)),
        oilTemp:station.thermal?.oil_temp_c || 0,
        windingTemp:station.thermal?.winding_temp_c || 0,
        healthScore:health,
        failureProbability:risk,
        rulYears:Math.max(1, Math.round((health / 100) * 20)),
        status:getStationStatus(station),
        alarmSummary:stationAlarms(station).map(alarm => alarm.title).join(', ')
      }
    })
  )

  const customers = computed<CustomerCluster[]>(() =>
    stations.value
      .filter((_,index) => index % 10 === 0)
      .map((station,index) => {
        const location = parseLocation(station)
        const types = ['residential','commercial','industrial','critical']
        const type = types[index % types.length]

        return {
          id:`CUST-${index + 1}`,
          name:type === 'critical'
            ? `${t('dashboard.criticalFacility')} ${index + 1}`
            : `${t('dashboard.customerCluster')} ${index + 1}`,
          type,
          lng:location.lng + 0.003,
          lat:location.lat - 0.003,
          consumption:Math.round(((station.electrical?.active_power_kw || 0) / 1000) * 10) / 10,
          outageRisk:getStationRisk(station),
          substation:station.station_id
        }
      })
  )

  const topRiskSubstations = computed<TopRiskSubstation[]>(() =>
    stations.value
      .map(station => ({
        id:station.station_id,
        name:station.station_name,
        risk:getStationRisk(station),
        health:getStationHealth(station),
        status:getStationStatus(station)
      }))
      .sort((a,b) => b.risk - a.risk)
  )

  const activeRootCause = computed<RootCause | null>(() =>
    selectedRootCause.value ||
    (
      correlations.value[0]
        ? {
            id:correlations.value[0].id,
            summary:correlations.value[0].title,
            severity:correlations.value[0].severity,
            confidence:correlations.value[0].confidence,
            affectedAssets:correlations.value[0].affectedAssets,
            chain:[
              { step:'Signal', title:'Realtime alarm burst', confidence:92 },
              { step:'Cause', title:correlations.value[0].rootCause, confidence:correlations.value[0].confidence },
              { step:'Action', title:correlations.value[0].nextAction, confidence:76 }
            ]
          }
        : null
    )
  )

  function getSubstationById(id:unknown){
    const requestedNumber = assetNumber(id)

    const match = stations.value.find(station =>
      station.station_id === id ||
      assetNumber(station.station_id) === requestedNumber
    )

    return match || (id ? undefined : stations.value[0])
  }

  function getTransformerById(id:unknown){
    const normalizedId = normalizeTransformerId(id)

    const match = transformers.value.find(transformer =>
      normalizeTransformerId(transformer.id) === normalizedId ||
      normalizeTransformerId(transformer.stationCode) === normalizedId.replace('TR-', 'TS-')
    )

    return match || (id ? null : transformers.value[0])
  }

  function getRegionById(id:unknown){
    const match = regions.value.find(region => region.id === id)

    return match || (id ? undefined : regions.value[0])
  }

  function buildTrend(seed = 50,length = 12){
    return Array.from({ length },(_,index) => ({
      label:index === 0 ? t('dashboard.now') : `-${index}h`,
      value:Math.round(clamp(seed + Math.sin(index * 0.85) * 8 + (index % 3) * 2))
    })).reverse()
  }

  return {
    persistentAlarms,
    currentAlarmCount,
    currentGridHealth,
    currentBlackoutProbability,
    stations,
    regions,
    powerLines,
    forecast,
    insights,
    weather,
    correlations,
    selectedRootCause,
    activeRootCause,
    contingency,
    topology,
    summary,
    blackout,
    connection,
    eventStream,
    loading,
    error,
    metricHistory,
    alarms,
    totalLoadMW,
    transformers,
    customers,
    topRiskSubstations,
    start,
    refreshAll,
    recordMetricSnapshot,
    openRootCause,
    runContingency,
    parseLocation,
    getStationHealth,
    getStationRisk,
    getStationStatus,
    getSubstationById,
    getTransformerById,
    getRegionById,
    buildTrend,
    average
  }
})
