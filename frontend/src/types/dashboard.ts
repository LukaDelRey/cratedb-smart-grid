export type AssetStatus = 'normal' | 'warning' | 'critical' | 'offline'

export type AlarmSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'ERROR' | string

export type Coordinates = {
  lng: number
  lat: number
}

export type StationAlarms = Record<string, boolean | undefined>

export type Station = {
  status?: AssetStatus
  severity?: AlarmSeverity
  active_alarms?: { type:string; title:string; severity:'WARNING'|'CRITICAL'; value:number|null; unit:string|null }[]
  timestamp?: string | number
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

export type ForecastPoint = {
  label: string
  loadMW: number
  risk: number
  confidence: number | null
  method?: string
  timestamp?: string | number
}

export type Insight = {
  id?: string
  title?: string
  description?: string
  body?: string
  severity?: AlarmSeverity
  confidence?: number | null
  assetId?: string
  type?: string
  impact?: string
  recommendation?: string
}

export type WeatherAlert = {
  title: string
  severity: AlarmSeverity
  asset: string
}

export type WeatherImpact = {
  estimated?: boolean
  method?: string
  temperatureC: number
  windRisk: number
  lightningRisk: number
  stormRisk: number
  gridImpact: number
  alerts: WeatherAlert[]
}

export type StationHistoryPoint = {
  timestamp: string | number
  electrical?: Station['electrical']
  thermal?: Station['thermal']
  oil_gas?: Station['oil_gas']
  alarms?: StationAlarms
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

export type AlarmLifecycleStatus = 'ACTIVE' | 'ACK' | 'WORK_ORDER' | 'RESOLVED'

export type PersistentAlarm = {
  id: string
  station_id: string
  alarm_type: string
  title: string
  severity: AlarmSeverity
  status: AlarmLifecycleStatus
  source: string
  value?: number | null
  unit?: string | null
  first_seen: string | number
  last_seen: string | number
  occurrence_count: number
  acknowledged_at?: string | number | null
  acknowledged_by?: string | null
  work_order_id?: string | null
  work_order_created_at?: string | number | null
  resolved_at?: string | number | null
  metadata?: Record<string, unknown>
}

export type AlarmStats = {
  active: number
  acknowledged: number
  workOrders: number
  resolved: number
  critical: number
  warning: number
}

export type AlarmAuditEntry = {
  id: string
  alarm_id: string
  action: string
  actor: string
  note?: string | null
  timestamp: string | number
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
  alarmSummary?: string
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

export type ScenarioType =
  | 'overload'
  | 'overheating'
  | 'short_circuit'
  | 'voltage_instability'
  | 'harmonics_spike'
  | 'cooling_failure'
  | 'insulation_degradation'
  | 'oil_leak'
  | 'arc_discharge'
  | 'feeder_failure'
  | 'transformer_trip'
  | 'heatwave'
  | 'peak_consumption'
  | 'storm'
  | 'voltage_drop'
  | 'sensor_failure'
  | 'offline'
  | 'blackout'
  | 'cascade'

export type ScenarioStatus = 'RUNNING' | 'COMPLETED' | 'STOPPED' | 'FAILED'

export type ScenarioDefinition = {
  type: ScenarioType
  label: string
  description: string
  icon: string
  defaultDuration: number
  multiAsset: boolean
}

export type ScenarioRun = {
  id: string
  scenario_type: ScenarioType
  status: ScenarioStatus
  requested_by: string
  started_at: string | number
  ends_at: string | number
  completed_at?: string | number | null
  duration_seconds: number
  target_station_ids: string[]
  emitted_events: number
  progress: number
  error?: string | null
}

export type ScenarioRunRequest = {
  scenario_type: ScenarioType
  station_id?: string
  duration_seconds: number
  target_count: number
  requested_by?: string
}
