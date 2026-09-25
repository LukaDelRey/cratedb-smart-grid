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
  getWebSocketUrl
} from '../services/gridApi'
import { t } from '../i18n'

const DEFAULT_CENTER = {
  lng:16.4339,
  lat:46.3844
}

function clamp(value,min = 0,max = 100){
  return Math.min(max, Math.max(min, value))
}

function average(values, fallback = 0){
  const clean = values.filter(value => Number.isFinite(value))

  if(!clean.length){
    return fallback
  }

  return Math.round(
    clean.reduce((sum,value) => sum + value, 0) / clean.length
  )
}

function alarmList(station){
  const alarms = station?.alarms || {}

  return Object.entries(alarms)
    .filter(([,enabled]) => enabled)
    .map(([key]) => key)
}

function assetNumber(id){
  const match = String(id || '').match(/(\d+)/)

  return match
    ? Number(match[1])
    : Number.MAX_SAFE_INTEGER
}

function normalizeTransformerId(id){
  const match = String(id || '').toUpperCase().match(/TR-?0*(\d+)/)

  return match
    ? `TR-${Number(match[1])}`
    : String(id || '').toUpperCase()
}

export const useSensorStore = defineStore('sensorStore', () => {

  const stationsMap = ref({})
  const regions = ref([])
  const powerLines = ref([])
  const forecast = ref([])
  const insights = ref([])
  const weather = ref({
    temperatureC:24,
    windRisk:0,
    lightningRisk:0,
    stormRisk:0,
    gridImpact:0,
    alerts:[]
  })
  const correlations = ref([])
  const selectedRootCause = ref(null)
  const contingency = ref(null)
  const topology = ref({
    platformHealth:0,
    nodes:[],
    edges:[]
  })

  const summary = ref({
    gridHealth:100,
    blackoutRisk:0,
    activeAlarms:0,
    stations:0
  })

  const blackout = ref({
    probability:0,
    affectedStations:0,
    estimatedMinutes:0
  })

  const connection = ref({
    websocketConnected:false,
    crateConnected:false,
    mqttConnected:true,
    latencyMs:0,
    messagesPerSecond:0,
    lastEventAt:null,
    quality:'offline'
  })

  const eventStream = ref([])
  const loading = ref(false)
  const error = ref(null)
  const metricHistory = ref({
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

  let ws = null
  let refreshTimer = null
  let eventSequence = 0
  const stationAlarmSignatures = new Map()
  const HISTORY_WINDOW_MS = 60 * 60 * 1000

  function pushHistoryPoint(key,value,windowMs = HISTORY_WINDOW_MS){
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
    ].filter(item => {
      const itemTimestamp = typeof item === 'number'
        ? timestamp
        : item.timestamp || timestamp

      return itemTimestamp >= cutoff
    })
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
    const gridHealth = Number(summary.value.gridHealth) || 0
    const blackoutProbability = Number(blackout.value.probability) || 0
    const activeAlarmCount = Number(summary.value.activeAlarms) || alarms.value.length
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

  function parseLocation(station){
    const loc = station?.location

    if(!loc){
      return DEFAULT_CENTER
    }

    const match = loc.match(/\((.*),(.*)\)/)

    if(!match){
      return DEFAULT_CENTER
    }

    return {
      lng:parseFloat(match[1]),
      lat:parseFloat(match[2])
    }
  }

  function getStationHealth(station){
    let score = 100

    score -= (station.thermal?.oil_temp_c || 0) * 0.28
    score -= Math.max(0, (station.electrical?.current_a || 0) - 420) * 0.08
    score -= (station.electrical?.harmonics_thd || 0) * 1.5

    if(station.alarms?.overload) score -= 12
    if(station.alarms?.overheating) score -= 14
    if(station.alarms?.voltage_drop) score -= 8
    if(station.alarms?.sensor_failure) score -= 10
    if(station.alarms?.offline) score -= 30

    return Math.round(clamp(score))
  }

  function getStationRisk(station){
    let risk = 4

    risk += (station.thermal?.oil_temp_c || 0) * 0.32
    risk += (station.electrical?.current_a || 0) * 0.045
    risk += Math.max(0, (station.electrical?.active_power_kw || 0) - 2600) * 0.012
    risk += (station.electrical?.harmonics_thd || 0) * 1.8

    if(station.alarms?.overload) risk += 18
    if(station.alarms?.overheating) risk += 20
    if(station.alarms?.voltage_drop) risk += 10
    if(station.alarms?.sensor_failure) risk += 7
    if(station.alarms?.offline) risk += 35

    return Math.round(clamp(risk))
  }

  function getStationStatus(station){
    if(
      station.alarms?.offline ||
      station.alarms?.sensor_failure
    ){
      return 'offline'
    }

    if(getStationRisk(station) >= 70){
      return 'critical'
    }

    if(getStationRisk(station) >= 38){
      return 'warning'
    }

    return 'normal'
  }

  function pushEvent(event){
    eventSequence += 1

    eventStream.value.unshift({
      id:event.id || `${Date.now()}-${eventSequence}`,
      timestamp:event.timestamp || new Date().toISOString(),
      severity:event.severity || 'INFO',
      source:event.source || 'SCADA',
      title:event.title,
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

  function updateStation(station){
    if(!station?.station_id){
      return
    }

    stationsMap.value[station.station_id] = station

    const alarms = alarmList(station)

    if(alarms.length){
      const risk = getStationRisk(station)
      const signature = [
        station.station_id,
        alarms.join(','),
        risk,
        getStationStatus(station)
      ].join('|')

      if(stationAlarmSignatures.get(station.station_id) === signature){
        return
      }

      stationAlarmSignatures.set(
        station.station_id,
        signature
      )

      pushEvent({
        severity:risk > 70 ? 'CRITICAL' : 'WARNING',
        source:'SCADA',
        title:'Alarm update',
        description:alarms.join(', '),
        assetId:station.station_id
      })
    }
  }

  async function refreshAll(){
    loading.value = true

    const requests = {
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
      crateData:fetchCrateHealth()
    }

    try{
      const entries = Object.entries(requests)
      const settled = await Promise.allSettled(
        entries.map(async ([key,promise]) => [key, await promise])
      )

      const data = {}
      const failed = []

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
      if(data.weatherData) weather.value = data.weatherData
      if(data.correlationData) correlations.value = data.correlationData
      if(data.topologyData) topology.value = data.topologyData

      if(data.crateData){
        connection.value.crateConnected = Boolean(data.crateData.connected)
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
    if(ws && ws.readyState === WebSocket.OPEN){
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

    ws.onmessage = event => {
      const payload = JSON.parse(event.data)

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

  async function openRootCause(correlationId){
    selectedRootCause.value = await fetchRootCause(correlationId)
  }

  async function runContingency(assetId){
    contingency.value = await fetchContingency(assetId)
  }

  const stations = computed(() =>
    Object.values(stationsMap.value)
      .sort((a,b) => assetNumber(a.station_id) - assetNumber(b.station_id))
  )

  const alarms = computed(() =>
    stations.value.filter(station => alarmList(station).length)
  )

  const totalLoadMW = computed(() => {
    const totalKW = stations.value.reduce(
      (sum,station) => sum + (station.electrical?.active_power_kw || 0),
      0
    )

    return Math.round(totalKW / 1000)
  })

  const transformers = computed(() =>
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
        status:getStationStatus(station)
      }
    })
  )

  const customers = computed(() =>
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

  const topRiskSubstations = computed(() =>
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

  const activeRootCause = computed(() =>
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

  function getSubstationById(id){
    const requestedNumber = assetNumber(id)

    return stations.value.find(station =>
      station.station_id === id ||
      assetNumber(station.station_id) === requestedNumber
    ) || stations.value[0]
  }

  function getTransformerById(id){
    const normalizedId = normalizeTransformerId(id)

    const match = transformers.value.find(transformer =>
      normalizeTransformerId(transformer.id) === normalizedId ||
      normalizeTransformerId(transformer.stationCode) === normalizedId.replace('TR-', 'TS-')
    )

    return match || (id ? null : transformers.value[0])
  }

  function getRegionById(id){
    return regions.value.find(region => region.id === id) || regions.value[0]
  }

  function buildTrend(seed = 50,length = 12){
    return Array.from({ length },(_,index) => ({
      label:index === 0 ? t('dashboard.now') : `-${index}h`,
      value:Math.round(clamp(seed + Math.sin(index * 0.85) * 8 + (index % 3) * 2))
    })).reverse()
  }

  return {
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
