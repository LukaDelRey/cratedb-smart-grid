import assert from 'node:assert/strict'
import { test, beforeEach, afterEach, describe } from 'node:test'
import axios from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { createRenderer, h, nextTick, ref } from 'vue'
import * as api from '../src/services/gridApi.ts'
import { useSensorStore } from '../src/stores/sensorStore.ts'
import { useStationHistory } from '../src/composables/useStationHistory.ts'
import { useAlarmCenter } from '../src/composables/useAlarmCenter.ts'
import { useScenarioControl } from '../src/composables/useScenarioControl.ts'
import { useForecastWorkspace } from '../src/composables/useForecastWorkspace.ts'
import { useLoadForecast } from '../src/composables/useLoadForecast.ts'
import { useAlarmRegister } from '../src/composables/useAlarmRegister.ts'
import { useDashboardMapPreferences } from '../src/composables/useDashboardMapPreferences.ts'
import { useDashboardTopbar } from '../src/composables/useDashboardTopbar.ts'
import { useOperatorMetrics } from '../src/composables/useOperatorMetrics.ts'
import { t, setLanguage } from '../src/i18n/index.ts'

describe('application unit suite', () => {

// Real Vue lifecycle and Pinia, with a minimal renderer. No browser or network required.
const renderer = createRenderer({
  createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
  insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {},
  parentNode: () => null, nextSibling: () => null
})
let mounted = []
function mount(factory) {
  let value
  const app = renderer.createApp({ setup() { value = factory(); return () => h('div') } })
  app.mount({})
  mounted.push(app)
  return value
}
let calls, responses, failures
const station = (id='TS-0001', overrides={}) => ({
  station_id:id, station_name:id, location:'(16.4,46.4)',
  electrical:{current_a:300, active_power_kw:1800, voltage_kv:10.1, frequency_hz:50, harmonics_thd:2.2},
  thermal:{oil_temp_c:62,winding_temp_c:73},oil_gas:{},alarms:{}, ...overrides
})
beforeEach(() => {
  setActivePinia(createPinia())
  calls=[]; failures={}; responses={
    '/latest-stations':{data:[station()]}, '/grid/summary':{gridHealth:90,blackoutRisk:7,activeAlarms:0,stations:1},
    '/regions':{regions:[]}, '/blackout':{probability:7}, '/power-lines':{data:[]},
    '/grid/forecast':{points:[]}, '/ai/insights':{insights:[]}, '/weather/grid-impact':{alerts:[]},
    '/alarm-correlations':{correlations:[]}, '/system/topology':{nodes:[],edges:[]},
    '/api/health/cratedb':{connected:true,mqttConnected:true,latencyMs:2},
    '/api/alarms':{data:[]}, '/api/alarms/stats':{active:0}, '/api/scenarios':{data:[]},
    '/api/scenarios/definitions':{data:[]}
  }
  // gridApi's Axios instance uses the global fallback adapter dynamically.
  globalThis.__testHttpAdapter = async config => {
    calls.push(config)
    if(failures[config.url]) throw failures[config.url]
    let data=responses[config.url] ?? {}
    if(typeof data==='function') data=await data(config)
    return {data,status:200,statusText:'OK',headers:{},config}
  }
})
afterEach(() => { mounted.forEach(app => app.unmount()); mounted=[]; setLanguage('en') })
const flush = () => new Promise(resolve => setImmediate(resolve))

const listContracts = [
  ['fetchLatestStations','/latest-stations','data'], ['fetchRegions','/regions','regions'],
  ['fetchPowerLines','/power-lines','data'], ['fetchForecast','/grid/forecast','points'],
  ['fetchAIInsights','/ai/insights','insights'], ['fetchAlarmCorrelations','/alarm-correlations','correlations'],
  ['fetchPersistentAlarms','/api/alarms','data'], ['fetchScenarioDefinitions','/api/scenarios/definitions','data'],
  ['fetchScenarioRuns','/api/scenarios','data']
]
for(const [name,path,key] of listContracts) {
  test(`API ${name} unwraps ${key} and handles an empty envelope`,async () => {
    responses[path]={[key]:[{id:'item'}]}
    assert.deepEqual(await api[name](),[{id:'item'}])
    responses[path]={}
    assert.deepEqual(await api[name](),[])
    assert.equal(calls[0].timeout,10000)
  })
}
for(const [name,path] of [['fetchGridSummary','/grid/summary'],['fetchBlackout','/blackout'],
  ['fetchWeatherImpact','/weather/grid-impact'],['fetchAlarmStats','/api/alarms/stats'],
  ['fetchSystemTopology','/system/topology'],['fetchCrateHealth','/api/health/cratedb']]) {
  test(`API ${name} preserves response body`,async () => {
    responses[path]={value:42}
    assert.deepEqual(await api[name](),{value:42})
  })
}
test('API history encodes asset ID and sends hours and limit',async () => {
  responses['/api/stations/TS%2F1/history']={data:[]}
  await api.fetchStationHistory('TS/1',48,25)
  assert.equal(calls[0].url,'/api/stations/TS%2F1/history')
  assert.deepEqual(calls[0].params,{hours:48,limit:25})
})
test('API alarm filters use backend parameter names',async () => {
  await api.fetchPersistentAlarms({status:'ACK',severity:'CRITICAL',stationId:'TS-1',limit:10})
  assert.deepEqual(calls[0].params,{status:'ACK',severity:'CRITICAL',station_id:'TS-1',limit:10})
})
for(const [name,suffix] of [['acknowledgePersistentAlarm','acknowledge'],['createPersistentAlarmWorkOrder','work-order'],['resolvePersistentAlarm','resolve']]) {
  test(`API ${name} posts actor and note`,async () => {
    await api[name]('alarm-1',{actor:'dispatcher',note:'checked'})
    assert.equal(calls[0].url,`/api/alarms/alarm-1/${suffix}`)
    assert.equal(calls[0].method,'post')
    assert.deepEqual(JSON.parse(calls[0].data),{actor:'dispatcher',note:'checked'})
  })
}
for(const status of [400,401,403,404,409,422,500]) {
  test(`API propagates HTTP ${status} without mock fallback`,async () => {
    failures['/latest-stations']=new axios.AxiosError(`HTTP ${status}`,'ERR_BAD_RESPONSE',{},null,{status})
    await assert.rejects(api.fetchLatestStations(),error => error.response.status===status)
  })
}
test('API propagates timeout and network failure',async () => {
  for(const code of ['ECONNABORTED','ERR_NETWORK']) {
    failures['/latest-stations']=new axios.AxiosError(code,code)
    await assert.rejects(api.fetchLatestStations(),{code})
  }
})
test('WebSocket URL follows the configured HTTP endpoint',() => assert.equal(api.getWebSocketUrl(),'ws://localhost:8000/ws'))

test('store derives load, station identity, alarms and risk from REST telemetry',async () => {
  responses['/latest-stations']={data:[station('TS-0002'),station('TS-0001',{alarms:{offline:true}})]}
  const store=useSensorStore()
  await store.refreshAll()
  assert.equal(store.totalLoadMW,4)
  assert.deepEqual(store.stations.map(s=>s.station_id),['TS-0001','TS-0002'])
  assert.equal(store.alarms.length,1)
  assert.equal(store.getSubstationById('TS-9999'),undefined)
  assert.equal(store.getTransformerById('TR-9999'),null)
  assert.equal(store.topRiskSubstations[0].id,'TS-0001')
  assert.equal(store.connection.crateConnected,true)
  assert.equal(store.loading,false)
})
test('store partial API failure preserves successful data and reports degradation',async () => {
  failures['/regions']=new Error('regions unavailable')
  const store=useSensorStore(); await store.refreshAll()
  assert.equal(store.stations.length,1)
  assert.match(store.error,/regions unavailable/)
  assert.equal(store.connection.quality,'degraded')
})
test('store DB health failure marks database disconnected',async () => {
  failures['/api/health/cratedb']=new Error('offline')
  const store=useSensorStore(); await store.refreshAll()
  assert.equal(store.connection.crateConnected,false)
  assert.equal(store.connection.quality,'offline')
})
test('store history is bounded to 720 samples',() => {
  const store=useSensorStore()
  for(let i=0;i<730;i++) store.recordMetricSnapshot()
  assert.equal(store.metricHistory.totalLoadMW.length,720)
})
test('forecast workspace aggregates actual forecast and threshold boundaries',() => {
  const store=useSensorStore()
  store.forecast=[{loadMW:10,risk:60,confidence:90},{loadMW:20,risk:30,confidence:80}]
  const model=useForecastWorkspace()
  assert.equal(model.peakLoad.value,20)
  assert.equal(model.averageRisk.value,45)
  assert.equal(model.averageConfidence.value,85)
  assert.equal(model.highRiskWindows.value,1)
  assert.equal(model.riskColor(70),'negative')
  assert.equal(model.riskColor(40),'warning')
  assert.equal(model.riskColor(39),'positive')
})
test('forecast workspace empty data gives zero totals',() => {
  const model=useForecastWorkspace()
  assert.equal(model.peakLoad.value,0)
  assert.equal(model.averageRisk.value,0)
})
test('load forecast uses telemetry history and produces finite SVG coordinates',() => {
  const store=useSensorStore()
  store.metricHistory.totalLoadMW=[{timestamp:1000,value:2},{timestamp:2000,value:3}]
  store.metricHistory.blackoutRisk=[1,2]
  const model=useLoadForecast(()=>[],key=>key)
  assert.equal(model.peakLoad.value,3)
  assert.equal(model.linePath.value.split(' ').length,2)
  assert.doesNotMatch(model.areaPath.value,/NaN|Infinity/)
  model.mode.value='7d'
  // History alone does not establish future measurements or a seven-day forecast.
  assert.equal(model.linePath.value,'')
})
test('heuristic forecast confidence stays unavailable instead of becoming a percentage',()=>{
  const store=useSensorStore()
  store.forecast=[{loadMW:0,risk:0,confidence:null}]
  const workspace=useForecastWorkspace()
  assert.equal(workspace.rows.value[0].confidence,null)
  assert.equal(workspace.confidenceAvailable.value,false)
  const chart=useLoadForecast(()=>store.forecast,key=>key)
  assert.equal(chart.confidenceAvailable.value,false)
  assert.equal(chart.peakLoad.value,0)
})
test('alarm center filters case-insensitive search and severity',async () => {
  responses['/api/alarms']={data:[{id:'a',station_id:'TS-1',title:'Overload',severity:'CRITICAL',status:'ACTIVE'},
    {id:'b',station_id:'TS-2',title:'Sensor failure',severity:'WARNING',status:'ACK'}]}
  const model=mount(()=>useAlarmCenter(false)); await flush()
  assert.equal(model.alarms.value.length,2)
  model.search.value=' overload '; model.severityFilter.value='CRITICAL'
  assert.deepEqual(model.filteredAlarms.value.map(a=>a.id),['a'])
  assert.equal(calls.find(c=>c.url==='/api/alarms').params.status,'ACTIVE,ACK,WORK_ORDER')
})
test('alarm action rejection never changes server-confirmed state',async () => {
  const alarm={id:'a',status:'ACTIVE'}
  responses['/api/alarms']={data:[alarm]}
  failures['/api/alarms/a/acknowledge']=new Error('forbidden')
  const model=mount(()=>useAlarmCenter(false)); await flush()
  await assert.rejects(model.acknowledge(alarm),/forbidden/)
  assert.equal(model.alarms.value[0].status,'ACTIVE')
  assert.equal(model.actionAlarmId.value,null)
})
test('alarm center refresh failure clears loading and exposes error',async () => {
  failures['/api/alarms']=new Error('offline')
  const model=mount(()=>useAlarmCenter(false)); await flush()
  assert.equal(model.loading.value,false)
  assert.equal(model.error.value,'offline')
})
test('alarm register deduplicates risk rows for persistent station and sorts severity',async () => {
  responses['/api/alarms']={data:[{id:'a',station_id:'TS-1',status:'ACTIVE',severity:'CRITICAL',title:'Overload',last_seen:'2026-10-01T00:00:00Z',value:0,unit:'A'}]}
  const model=mount(()=>useAlarmRegister({getTopRiskSubstations:()=>[{id:'TS-1',risk:50},{id:'TS-2',risk:50}],getMaxVisible:()=>1,onFocusStation:()=>{}}))
  await flush()
  assert.equal(model.rows.value.length,2)
  assert.equal(model.rows.value.find(r=>r.id==='a').value,'0 A')
  model.toggleSeveritySort()
  assert.equal(model.visibleRows.value[0].id,'a')
  assert.equal(model.activeCount.value,1)
})
test('voltage drop updates active rows, map status and topbar then disappears on recovery',async context=>{
  const sockets=fakeSocket(context)
  const store=useSensorStore();await store.start()
  const register=mount(()=>useAlarmRegister({getTopRiskSubstations:()=>[],getMaxVisible:()=>20,onFocusStation:()=>{}}))
  const topbar=mount(()=>useDashboardTopbar());await flush()
  const fault=station('TS-0001',{timestamp:'2026-10-01T12:00:00Z',electrical:{current_a:300,active_power_kw:1800,voltage_kv:8.9,frequency_hz:50,harmonics_thd:2},alarms:{voltage_drop:false}})
  sockets[0].onmessage({data:JSON.stringify(fault)})
  assert.equal(store.getStationStatus(store.stations[0]),'warning')
  assert.equal(register.rows.value.length,1)
  assert.equal(register.rows.value[0].title,'Voltage drop')
  assert.equal(register.activeCount.value,1)
  assert.equal(topbar.topStatus.value[3].value,1)
  assert.equal(topbar.topStatus.value[0].class,'text-warning')
  // DB poll still reports the old alarm; current telemetry must win immediately.
  store.persistentAlarms=[{id:'old',station_id:'TS-0001',alarm_type:'voltage_drop',status:'ACK',severity:'WARNING',title:'Voltage drop',last_seen:'2026-10-01T12:00:00Z'}]
  sockets[0].onmessage({data:JSON.stringify(station('TS-0001',{timestamp:'2026-10-01T12:00:01Z'}))})
  assert.equal(register.rows.value.length,0)
  assert.equal(store.getStationStatus(store.stations[0]),'normal')
  assert.equal(topbar.topStatus.value[3].value,0)
  assert.equal(topbar.topStatus.value[0].class,'text-positive')
  sockets[0].onmessage({data:JSON.stringify({...fault,timestamp:'2026-10-01T12:00:02Z'})})
  assert.equal(register.rows.value.length,1)
  assert.equal(store.eventStream.filter(event=>event.title==='Alarm update').length,2)
})
test('scenario control forwards single-station request and handles server error',async () => {
  const model=mount(()=>useScenarioControl({getStationId:()=> 'TS-1'})); await flush()
  failures['/api/scenarios/run']=new Error('broker offline')
  await model.execute()
  const sent=JSON.parse(calls.find(c=>c.url==='/api/scenarios/run').data)
  assert.equal(sent.station_id,'TS-1'); assert.equal(sent.target_count,1)
  assert.equal(model.running.value,false); assert.equal(model.error.value,'broker offline')
})
test('scenario multi-asset selection uses minimum three targets',async () => {
  const model=mount(()=>useScenarioControl()); await flush()
  model.selectType('blackout')
  assert.equal(model.durationSeconds.value,45)
  assert.ok(model.targetCount.value>=3)
})
test('station history filters invalid samples and bounds series to 48',async () => {
  responses['/api/stations/TS-1/history']={data:Array.from({length:60},(_,i)=>({value:i}))}
  const model=mount(()=>useStationHistory(()=> 'TS-1')); await flush()
  assert.equal(model.series(p=>p.value).value.length,48)
  assert.equal(model.series(p=>p.value).value[0],12)
})
test('station history failure reports an error',async () => {
  failures['/api/stations/TS-1/history']=new Error('history offline')
  const model=mount(()=>useStationHistory(()=> 'TS-1')); await flush()
  assert.equal(model.error.value,'history offline')
  assert.equal(model.loading.value,false)
})
test('station history discards responses from a previously selected station',async (context) => {
  let resolveOld
  responses['/api/stations/TS-1/history']=()=>new Promise(resolve=>{resolveOld=resolve})
  responses['/api/stations/TS-2/history']={data:[{value:2}]}
  // Always resolve the delayed boundary even when an assertion fails.
  context.after(() => resolveOld?.({data:[]}))
  const id=ref('TS-1')
  const model=mount(()=>useStationHistory(()=>id.value)); await flush()
  id.value='TS-2'; await nextTick(); await flush()
  resolveOld({data:[{value:1}]}); await flush()
  assert.deepEqual(model.points.value,[{value:2}])
})
test('station history clears data after asset selection is removed',async () => {
  responses['/api/stations/TS-1/history']={data:[{value:1}]}
  const id=ref('TS-1')
  const model=mount(()=>useStationHistory(()=>id.value)); await flush()
  id.value=undefined; await nextTick(); await flush()
  assert.deepEqual(model.points.value,[])
})
test('i18n language selection falls back for unsupported language',() => {
  setLanguage('en'); const english=t('dashboard.now')
  setLanguage('hr'); assert.notEqual(t('dashboard.now'),english)
  setLanguage('unsupported'); assert.equal(t('dashboard.now'),english)
  assert.equal(t('missing.translation'),'missing.translation')
})

function fakeSocket(context) {
  const sockets=[]
  class Socket {
    static OPEN=1
    static CONNECTING=0
    readyState=0
    constructor(url) { this.url=url; sockets.push(this) }
  }
  context.mock.method(globalThis,'setInterval',()=>123)
  context.mock.method(globalThis,'setTimeout',()=>456)
  const old=globalThis.WebSocket
  globalThis.WebSocket=Socket
  context.after(()=>{globalThis.WebSocket=old})
  return sockets
}
test('WebSocket telemetry updates station and deduplicates repeated alarm events',async context => {
  const sockets=fakeSocket(context)
  const store=useSensorStore(); await store.start()
  const socket=sockets[0]; socket.readyState=1; socket.onopen()
  assert.equal(store.connection.websocketConnected,true)
  const payload=station('TS-0001',{alarms:{offline:true}})
  socket.onmessage({data:JSON.stringify(payload)})
  const count=store.eventStream.length
  socket.onmessage({data:JSON.stringify(payload)})
  assert.equal(store.eventStream.length,count)
  assert.equal(store.alarms.length,1)
  assert.equal(store.stations.length,1)
})
test('WebSocket disconnect schedules reconnect and marks degraded state',async context => {
  const sockets=fakeSocket(context)
  const store=useSensorStore(); await store.start()
  sockets[0].onclose()
  assert.equal(store.connection.websocketConnected,false)
  assert.equal(store.connection.quality,'degraded')
  assert.equal(globalThis.setTimeout.mock.calls[0].arguments[1],3000)
})
test('WebSocket malformed JSON is handled without an uncaught exception',async context => {
  const sockets=fakeSocket(context)
  const store=useSensorStore(); await store.start()
  assert.doesNotThrow(()=>sockets[0].onmessage({data:'not-json'}))
})
test('repeated start while WebSocket connects does not open a duplicate connection',async context => {
  const sockets=fakeSocket(context)
  const store=useSensorStore(); await store.start(); await store.start()
  assert.equal(sockets.length,1)
})
test('older WebSocket telemetry never replaces newer station state',async context => {
  const sockets=fakeSocket(context)
  const store=useSensorStore(); await store.start()
  sockets[0].onmessage({data:JSON.stringify(station('TS-0001',{timestamp:'2026-10-01T12:00:00Z'}))})
  sockets[0].onmessage({data:JSON.stringify(station('TS-0001',{timestamp:'2026-10-01T11:00:00Z'}))})
  assert.equal(store.stations[0].timestamp,'2026-10-01T12:00:00Z')
})
test('map preference changes survive composable recreation',async () => {
  const first=mount(()=>useDashboardMapPreferences({transformers:true},{critical:true}))
  first.layers.value.transformers=false
  await nextTick()
  const second=mount(()=>useDashboardMapPreferences({transformers:true},{critical:true}))
  assert.equal(second.layers.value.transformers,false)
})
test('scenario control polling is removed on unmount',context => {
  context.mock.method(globalThis,'setInterval',()=>987)
  context.mock.method(globalThis,'clearInterval',()=>{})
  mount(()=>useScenarioControl())
  mounted.pop().unmount()
  assert.equal(globalThis.clearInterval.mock.calls[0].arguments[0],987)
})
test('alarm center polling is removed on unmount',context => {
  context.mock.method(globalThis,'setInterval',()=>876)
  context.mock.method(globalThis,'clearInterval',()=>{})
  mount(()=>useAlarmCenter())
  mounted.pop().unmount()
  assert.equal(globalThis.clearInterval.mock.calls[0].arguments[0],876)
})
test('API audit, root cause, contingency and scenario actions target requested IDs',async () => {
  responses['/api/alarms/a/audit']={data:[{action:'ACK'}]}
  assert.deepEqual(await api.fetchAlarmAudit('a'),[{action:'ACK'}])
  await api.fetchRootCause('corr-overload')
  await api.fetchContingency('TS-1')
  await api.runScenario({scenario_type:'overload',station_id:'TS-1'})
  await api.stopScenario('scenario-1')
  assert.deepEqual(calls.map(c=>c.url),['/api/alarms/a/audit','/root-cause/corr-overload','/n-1/TS-1','/api/scenarios/run','/api/scenarios/scenario-1/stop'])
  assert.deepEqual(JSON.parse(calls[3].data),{scenario_type:'overload',station_id:'TS-1'})
})
test('dashboard topbar derives critical status and limits notifications to five',context => {
  context.mock.method(globalThis,'setInterval',()=>765)
  const store=useSensorStore()
  store.blackout.probability=70
  store.eventStream=Array.from({length:8},(_,i)=>({id:String(i),title:'Alarm',timestamp:'2026-10-01T12:00:00Z',severity:'CRITICAL'}))
  const model=mount(()=>useDashboardTopbar())
  assert.equal(model.topStatus.value[0].class,'text-negative')
  assert.equal(model.notificationItems.value.length,5)
  assert.equal(model.notificationItems.value[0].icon,'priority_high')
  store.blackout.probability=35
  assert.equal(model.topStatus.value[0].class,'text-warning')
  store.blackout.probability=34
  assert.equal(model.topStatus.value[0].class,'text-positive')
})
test('operator metric trends use the difference between real history samples',() => {
  const store=useSensorStore()
  store.metricHistory.totalLoadMW=[{value:2,timestamp:1},{value:4,timestamp:2}]
  const model=useOperatorMetrics(store,key=>key)
  assert.ok(model.operatorMetrics.value.some(metric=>String(metric.trend).includes('+2')))
  assert.ok(model.operatorMetrics.value.every(metric=>Array.isArray(metric.spark)))
})
test('alarm center successful acknowledgement uses confirmed response and audit',async () => {
  const alarm={id:'a',station_id:'TS-1',status:'ACTIVE'}
  responses['/api/alarms']={data:[alarm]}
  responses['/api/alarms/a/acknowledge']=()=>{
    responses['/api/alarms']={data:[{...alarm,status:'ACK'}]}
    return {...alarm,status:'ACK'}
  }
  responses['/api/alarms/a/audit']={data:[{action:'ACK'}]}
  const model=mount(()=>useAlarmCenter(false)); await flush()
  await model.acknowledge(alarm)
  assert.equal(model.selectedAlarm.value.status,'ACK')
  assert.equal(model.audit.value[0].action,'ACK')
  assert.equal(model.actionAlarmId.value,null)
})
test('alarm register failed acknowledgement never marks a persistent alarm as ACK',async () => {
  responses['/api/alarms']={data:[{id:'a',station_id:'TS-1',status:'ACTIVE',last_seen:'2026-10-01T12:00:00Z'}]}
  failures['/api/alarms/a/acknowledge']=new Error('conflict')
  const model=mount(()=>useAlarmRegister({getTopRiskSubstations:()=>[],getMaxVisible:()=>10,onFocusStation:()=>{}}))
  await flush()
  await assert.rejects(model.acknowledge(model.rows.value[0]),/conflict/)
  assert.equal(model.displayStatus(model.rows.value[0]),'ACTIVE')
})
test('stale history errors do not affect loading or error for the current request',async context => {
  let rejectOld, resolveNew
  responses['/api/stations/TS-1/history']=()=>new Promise((resolve,reject)=>{rejectOld=reject})
  responses['/api/stations/TS-2/history']=()=>new Promise(resolve=>{resolveNew=resolve})
  const id=ref('TS-1')
  const model=mount(()=>useStationHistory(()=>id.value)); await flush()
  context.after(()=>resolveNew?.({data:[]}))
  id.value='TS-2'; await nextTick(); await flush()
  rejectOld(new Error('old station offline')); await flush()
  assert.equal(model.error.value,'')
  assert.equal(model.loading.value,true)
  resolveNew({data:[{value:2}]}); await flush()
  assert.deepEqual(model.points.value,[{value:2}])
  assert.equal(model.loading.value,false)
})
test('history selection change immediately clears previous samples',async context => {
  let resolveNew
  responses['/api/stations/TS-1/history']={data:[{value:1}]}
  responses['/api/stations/TS-2/history']=()=>new Promise(resolve=>{resolveNew=resolve})
  const id=ref('TS-1')
  const model=mount(()=>useStationHistory(()=>id.value)); await flush()
  id.value='TS-2'; await nextTick(); await flush()
  context.after(()=>resolveNew?.({data:[]}))
  assert.deepEqual(model.points.value,[])
  assert.equal(model.loading.value,true)
})
test('WebSocket rejects null, arrays and primitive payloads and accepts the next valid message',async context => {
  const sockets=fakeSocket(context)
  const store=useSensorStore(); await store.start()
  for(const payload of ['null','[]','42','"unexpected"']){
    assert.doesNotThrow(()=>sockets[0].onmessage({data:payload}))
    assert.equal(store.connection.quality,'degraded')
    assert.match(store.error,/Invalid realtime/)
  }
  sockets[0].onmessage({data:JSON.stringify(station('TS-0002'))})
  assert.equal(store.stations.length,2)
})
test('telemetry timestamp ordering handles numeric milliseconds and ISO timestamps',async context => {
  const sockets=fakeSocket(context)
  const store=useSensorStore(); await store.start()
  const latest=Date.parse('2026-10-01T12:00:00Z')
  sockets[0].onmessage({data:JSON.stringify(station('TS-0001',{timestamp:latest}))})
  sockets[0].onmessage({data:JSON.stringify(station('TS-0001',{timestamp:'2026-10-01T11:00:00Z'}))})
  assert.equal(store.stations[0].timestamp,latest)
  sockets[0].onmessage({data:JSON.stringify(station('TS-0001',{timestamp:'2026-10-01T13:00:00Z'}))})
  assert.equal(store.stations[0].timestamp,'2026-10-01T13:00:00Z')
})
})
