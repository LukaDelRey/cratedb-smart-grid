export type AssetStatus = 'normal' | 'warning' | 'critical' | 'offline'

export type AlarmSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'ERROR' | string

export type Coordinates = {
  lng: number
  lat: number
}

export type StationAlarms = Record<string, boolean | undefined>

export type Station = {
  station_id: string
  station_name?: string
  location?: string | {
    coordinates?: [number, number]
  }
  electrical?: {
    voltage_v?: number
    voltage_kv?: number
    current_a?: number
    active_power_kw?: number
    reactive_power_kvar?: number
    frequency_hz?: number
    harmonics_thd?: number
  }
  thermal?: {
    oil_temp_c?: number
    winding_temp_c?: number
    ambient_temp_c?: number
    busbar_temp_c?: number
  }
  oil_gas?: {
    hydrogen_ppm?: number
    methane_ppm?: number
    ethylene_ppm?: number
    acetylene_ppm?: number
  }
  alarms?: StationAlarms
}

export type Region = {
  id: string
  name?: string
  stations?: number
  healthScore?: number
  blackoutRisk?: number
  activeAlarms?: number
}

export type PowerLine = {
  id?: string
  name?: string
  from?: string
  to?: string
  fromStation?: string
  toStation?: string
  loadPct?: number
  capacityMW?: number
  status?: AssetStatus | string
}

export type ForecastPoint = Record<string, string | number | null | undefined>

export type Insight = {
  id?: string
  title?: string
  description?: string
  body?: string
  severity?: AlarmSeverity
  confidence?: number
  assetId?: string
}

export type WeatherImpact = {
  temperatureC: number
  windRisk: number
  lightningRisk: number
  stormRisk: number
  gridImpact: number
  alerts: string[]
}

export type AlarmCorrelation = {
  id: string
  title: string
  severity: AlarmSeverity
  confidence: number
  affectedAssets?: string[]
  rootCause?: string
  nextAction?: string
}

export type RootCause = {
  id?: string
  summary?: string
  severity?: AlarmSeverity
  confidence?: number
  affectedAssets?: string[]
  chain?: Array<{
    step: string
    title: string
    confidence: number
  }>
}

export type ContingencyResult = {
  assetId?: string
  affectedCustomers?: number
  overloadedAssets?: number
  risk?: number | string
  [key: string]: unknown
}

export type Topology = {
  platformHealth: number
  nodes: unknown[]
  edges: unknown[]
}

export type GridSummary = {
  gridHealth: number
  blackoutRisk: number
  activeAlarms: number
  stations: number
}

export type BlackoutPrediction = {
  probability: number
  affectedStations: number
  estimatedMinutes: number
}

export type ConnectionQuality = 'offline' | 'degraded' | 'excellent'

export type ConnectionState = {
  websocketConnected: boolean
  crateConnected: boolean
  mqttConnected: boolean
  latencyMs: number
  messagesPerSecond: number
  lastEventAt: string | null
  quality: ConnectionQuality
}

export type AlarmEvent = {
  id: string
  timestamp: string
  severity: AlarmSeverity
  source: string
  title?: string
  description?: string
  assetId?: string
}

export type MetricHistoryPoint = {
  timestamp: number | string
  value: number
}

export type MetricHistoryKey =
  | 'totalLoadMW'
  | 'systemLoadPct'
  | 'gridHealth'
  | 'blackoutRisk'
  | 'activeAlarms'
  | 'powerQuality'
  | 'voltageStability'
  | 'energyEfficiency'
  | 'frequency'

export type MetricHistoryValue = number | MetricHistoryPoint

export type MetricHistory = Record<MetricHistoryKey, MetricHistoryValue[]>

export type TransformerAsset = {
  id: string
  name: string
  stationCode: string
  substation: string
  lng: number
  lat: number
  loadPct: number
  oilTemp: number
  windingTemp: number
  healthScore: number
  failureProbability: number
  rulYears: number
  status: AssetStatus
}

export type CustomerCluster = {
  id: string
  name: string
  type: string
  lng: number
  lat: number
  consumption: number
  outageRisk: number
  substation: string
}

export type TopRiskSubstation = {
  id: string
  name?: string
  risk: number
  health: number
  status: AssetStatus
}

export type FocusStationRequest = {
  id: string
  requestedAt: number
}

export type DashboardMapLayers = {
  regions: boolean
  substations: boolean
  transformers: boolean
  lines: boolean
  customers: boolean
  risk: boolean
  heatmap: boolean
  weather: boolean
  contingency: boolean
}

export type MarkerFilters = Record<AssetStatus, boolean>
