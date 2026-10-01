import assert from 'node:assert/strict'
import { test, beforeEach, describe } from 'node:test'
import { readdir } from 'node:fs/promises'
import { mountUnit, flush } from './componentHarness.mjs'
import { Map } from './visual-boundaries.mjs'
import router from '../src/router/index.ts'
import { useLoadForecast } from '../src/composables/useLoadForecast.ts'
import { useSensorStore } from '../src/stores/sensorStore.ts'
import { useOperatorMetrics } from '../src/composables/useOperatorMetrics.ts'
import { createPinia, setActivePinia } from 'pinia'
import { reactive, nextTick } from 'vue'

const normal={station_id:'TS-0001',station_name:'North station',location:'(16.4,46.4)',
  electrical:{voltage_kv:10.1,current_a:300,active_power_kw:1800,frequency_hz:50,harmonics_thd:2},
  thermal:{oil_temp_c:60,winding_temp_c:70},oil_gas:{},alarms:{}}
function propsFor(populated=false){
  return {map:new Map(),stations:populated?[normal]:[],sensors:populated?[normal]:[],
    data:[],summary:{stations:populated?1:0,gridHealth:90,activeAlarms:0},
    connection:{quality:'offline',websocketConnected:false,crateConnected:false},
    prediction:{probability:0,affectedStations:0,estimatedMinutes:0},blackout:{probability:0},
    weather:{gridImpact:0,windRisk:0,lightningRisk:0,stormRisk:0,alerts:[]},
    topology:{nodes:[],edges:[],platformHealth:0},modelValue:false,markerFilters:{normal:true},
    title:'Test asset',regions:populated?[{id:'REGION-NORTH',name:'North',stations:1}]:[],
    insights:[],transformers:[],customers:[],lines:[],events:[],chain:[],callouts:[],points:[],
    topRisk:populated?[{id:'TS-0001',risk:70}]:[],topRiskSubstations:[],correlations:[]}
}
describe('Vue component unit suite', async () => {
beforeEach(context=>{
  context.mock.method(globalThis,'setInterval',()=>999)
  context.mock.method(globalThis,'clearInterval',()=>{})
  context.mock.method(globalThis,'setTimeout',()=>998)
  context.mock.method(Date,'now',()=>Date.parse('2026-10-01T12:00:00Z'))
  context.mock.method(Math,'random',()=>0.25)
  const oldWindow=globalThis.window,oldDocument=globalThis.document
  globalThis.window={setTimeout:globalThis.setTimeout,clearTimeout:()=>{},localStorage:{getItem:()=>null,setItem:()=>{}},location:{assign:()=>{}}}
  globalThis.document={documentElement:{lang:'en'}}
  context.after(()=>{globalThis.window=oldWindow;globalThis.document=oldDocument})
  const oldSocket=globalThis.WebSocket
  globalThis.WebSocket=class {static OPEN=1;static CONNECTING=0;readyState=0;close(){}}
  context.after(()=>{globalThis.WebSocket=oldSocket})
  globalThis.__testHttpAdapter=async config=>({status:200,statusText:'OK',headers:{},config,data:
    config.url==='/grid/summary'?{stations:0,gridHealth:0,activeAlarms:0}:
    config.url==='/api/health/cratedb'?{connected:false,mqttConnected:false}:
    config.url==='/blackout'?{probability:0}:
    {data:[],regions:[],points:[],insights:[],correlations:[],nodes:[],edges:[],alerts:[]}})
})
async function filesAt(url){
  const result=[]
  for(const entry of await readdir(url,{withFileTypes:true})){
    const child=new URL(entry.name+(entry.isDirectory()?'/':''),url)
    if(entry.isDirectory())result.push(...await filesAt(child))
    else if(entry.name.endsWith('.vue'))result.push(child)
  }
  return result
}
const components=await filesAt(new URL('../src/',import.meta.url))
test('open substation popup and marker refresh together after warning clears',async context=>{
  const Component=(await import('../src/components/dashboard/map/layers/SubstationLayer.vue')).default
  const stations=reactive([{...normal,electrical:{...normal.electrical,voltage_kv:8.9},alarms:{voltage_drop:true}}])
  const map=new Map()
  const unit=mountUnit(Component,{map,stations},context)
  assert.equal(map.getSource('substations-source').data.features[0].properties.status,'warning')
  unit.state.focusStation('TS-0001')
  const popup=unit.state.activePopup
  assert.match(popup.html,/status-pill warning/)
  assert.match(popup.html,/Voltage drop/)
  assert.doesNotMatch(popup.html,/Normal operating envelope/)
  stations[0]={...normal,alarms:{}}
  await nextTick()
  assert.equal(map.getSource('substations-source').data.features[0].properties.status,'normal')
  assert.match(popup.html,/status-pill normal/)
  assert.doesNotMatch(popup.html,/status-pill warning/)
  assert.equal(unit.errors.length,0)
})
test('selecting alarm correlation opens the root cause panel',async context=>{
  const Component=(await import('../src/pages/DashboardPage.vue')).default
  globalThis.__testHttpAdapter=async config=>({status:200,headers:{},config,data:config.url==='/root-cause/corr-test'
    ?{id:'corr-test',summary:'Voltage incident',affectedAssets:['TS-0001'],chain:[]}
    :{data:[],regions:[],points:[],insights:[],correlations:[],nodes:[],edges:[],alerts:[]}})
  const unit=mountUnit(Component,{},context)
  await unit.state.openCorrelation('corr-test')
  assert.equal(unit.state.activeOpsPanel,'rootCause')
  assert.equal(unit.state.store.activeRootCause.id,'corr-test')
  assert.equal(unit.errors.length,0)
})
test('a disappeared correlation reports a useful error instead of an unhandled rejection',async context=>{
  const Component=(await import('../src/pages/DashboardPage.vue')).default
  const unit=mountUnit(Component,{},context)
  await flush()
  const previous=globalThis.__testHttpAdapter
  globalThis.__testHttpAdapter=async config=>{
    if(config.url==='/root-cause/gone') throw new Error('404')
    return previous(config)
  }
  await unit.state.openCorrelation('gone')
  assert.match(unit.state.rootCauseError,/no longer available/)
  assert.equal(unit.errors.length,0)
})
test('transformer popup uses current warning data and refreshes on recovery',async context=>{
  const Component=(await import('../src/components/dashboard/map/layers/TransformerLayer.vue')).default
  const transformers=reactive([{id:'TR-1',substation:'TS-0001',lng:16.4,lat:46.4,status:'warning',alarmSummary:'Voltage drop',loadPct:20,oilTemp:60,windingTemp:70,healthScore:90,failureProbability:15,rulYears:18}])
  const map=new Map()
  const unit=mountUnit(Component,{map,transformers},context)
  // A click can carry old rendered properties: fetch the latest matching asset.
  unit.state.openPopup({features:[{properties:{id:'TR-1',status:'normal'}}]})
  const popup=unit.state.activePopup
  assert.match(popup.html,/status-pill warning/)
  assert.match(popup.html,/Voltage drop/)
  transformers[0]={...transformers[0],status:'normal',alarmSummary:''}
  await nextTick()
  assert.equal(map.getSource('transformers-source').data.features[0].properties.status,'normal')
  assert.match(popup.html,/status-pill normal/)
  assert.doesNotMatch(popup.html,/Voltage drop/)
  assert.equal(unit.errors.length,0)
})
for(const file of components){
  if(file.pathname.endsWith('/components/map/GridMap.vue')){
    test('inactive components/map/GridMap.vue', {skip:'Entire legacy SFC starts with an unclosed HTML comment and is not imported by the application'},()=>{})
    continue
  }
  for(const populated of [false,true]){
    test(`component boundary ${file.pathname.split('/src/')[1]}: ${populated?'telemetry fixture':'empty data'}`,async context=>{
      const Component=(await import(file.href)).default
      const unit=mountUnit(Component,propsFor(populated),context)
      // Evaluate the real setup-computed values, not only module import/compilation.
      for(const key of Object.keys(unit.state)){
        if(key==='props' || key.startsWith('__'))continue
        const value=unit.state[key]
        if(typeof value==='number')assert.ok(Number.isFinite(value),`${key} must be finite`)
      }
      await flush()
      assert.deepEqual(unit.errors.map(e=>e.message),[])
    })
  }
  test(`component template ${file.pathname.split('/src/')[1]} renders empty-state boundaries`,async context=>{
    const Component=(await import(file.href)).default
    const unit=mountUnit(Component,propsFor(false),context,true)
    await flush()
    assert.deepEqual(unit.errors.map(e=>e.message),[])
  })
}

for(const name of ['Contingency','Customer','Heatmap','PowerLine','Region','Risk','Substation','Transformer','Weather']){
  test(`map ${name} adds GeoJSON sources and removes layers/listeners on unmount`,async context=>{
    const Component=(await import(`../src/components/dashboard/map/layers/${name}Layer.vue`)).default
    const props=propsFor(true)
    props.customers=[{id:'C-1',lng:16.4,lat:46.4,name:'Customer',type:'industrial'}]
    props.transformers=[{id:'TR-1',lng:16.4,lat:46.4,status:'normal',healthScore:90,failureProbability:7}]
    const unit=mountUnit(Component,props,context)
    assert.equal(unit.errors.length,0)
    assert.ok(props.map.sources.size>0)
    for(const source of props.map.sources.values()){
      assert.equal(source.data.type,'FeatureCollection')
      assert.ok(Array.isArray(source.data.features))
    }
    unit.unmount()
    assert.equal(props.map.sources.size,0)
    assert.equal(props.map.layers.size,0)
    assert.equal(props.map.handlers.length,0)
  })
}
test('realtime event component filters text/severity and ignores invalid timestamps',async context=>{
  const Component=(await import('../src/components/dashboard/operations/RealtimeEventStream.vue')).default
  const events=[{title:'Oil hot',severity:'CRITICAL',timestamp:'2026-10-01T11:59:30Z'},
    {title:'Voltage warning',severity:'WARNING',timestamp:'invalid'}]
  const {state}=mountUnit(Component,{events},context)
  assert.equal(state.criticalCount,1);assert.equal(state.eventsPerMinute,1)
  state.activeFilter='CRITICAL';state.query=' oil '
  assert.equal(state.filteredEvents.length,1)
  state.query='missing';assert.equal(state.filteredEvents.length,0)
})
for(const [probability,color] of [[0,'green'],[34,'green'],[35,'orange'],[69,'orange'],[70,'red']]){
  test(`blackout card probability ${probability} has correct risk color`,async context=>{
    const Component=(await import('../src/components/dashboard/right-sidebar/BlackoutPredictionCard.vue')).default
    assert.equal(mountUnit(Component,{prediction:{probability}},context).state.riskColor,color)
  })
}
test('mini chart finite history retains endpoints and filters NaN',async context=>{
  const Component=(await import('../src/components/transformer-twin/TransformerTwinMiniChart.vue')).default
  const {state}=mountUnit(Component,{actualValues:[0,NaN,100]},context)
  assert.equal(state.actualPointList.length,2)
  assert.equal(state.actualPointList[0].y,110)
  assert.equal(state.actualPointList[1].y,14)
  assert.doesNotMatch(state.actualAreaPath,/NaN|Infinity/)
})
test('mini chart does not invent actual measurements when history is empty',async context=>{
  const Component=(await import('../src/components/transformer-twin/TransformerTwinMiniChart.vue')).default
  assert.equal(mountUnit(Component,{actualValues:[]},context).state.actualPointList.length,0)
})
test('grid health component preserves an authoritative health score of zero',async context=>{
  const Component=(await import('../src/components/dashboard/layout/GridHealthPanel.vue')).default
  const props=propsFor();props.summary.gridHealth=0
  assert.equal(mountUnit(Component,props,context).state.healthScore,0)
})
test('grid health component does not invent offline or maintenance stations',async context=>{
  const Component=(await import('../src/components/dashboard/layout/GridHealthPanel.vue')).default
  const props=propsFor(true);props.summary.stations=1000
  const {state}=mountUnit(Component,props,context)
  assert.equal(state.offlineCount,0);assert.equal(state.maintenanceCount,0)
})
test('substation twin preserves zero measured current instead of demo fallback',async context=>{
  await router.push('/substations/TS-0001')
  const Component=(await import('../src/pages/SubstationTwin.vue')).default
  const {state}=mountUnit(Component,{},context)
  globalThis.__testHttpAdapter=async config=>({status:200,headers:{},config,data:config.url==='/latest-stations'
    ?{data:[{...normal,electrical:{...normal.electrical,current_a:0,active_power_kw:0}}]}
    :{data:[],regions:[],points:[],insights:[],correlations:[],nodes:[],edges:[],alerts:[]}})
  await state.store.refreshAll()
  assert.equal(state.current,0);assert.equal(state.activePowerKw,0)
})
test('router resolves every documented page with its requested asset ID',async()=>{
  for(const [path,id] of [['/',undefined],['/alarms',undefined],['/forecasting',undefined],
    ['/regions/REGION-NORTH','REGION-NORTH'],['/substations/TS-0001','TS-0001'],['/transformers/TR-0001','TR-0001']]){
    const route=router.resolve(path)
    assert.equal(route.matched.length,1)
    if(id)assert.equal(route.params.id,id)
    const component=route.matched[0].components.default
    assert.ok(typeof component==='function'?(await component()).default:component)
  }
})
test('layer controls emit an updated copy without changing parent preferences',async context=>{
  const Component=(await import('../src/components/dashboard/map/controls/LayerPanel.vue')).default
  const props=propsFor();props.modelValue={risk:false,weather:true}
  let updatedLayers,updatedMarkers
  props['onUpdate:modelValue']=value=>{updatedLayers=value}
  props['onUpdate:markerFilters']=value=>{updatedMarkers=value}
  const unit=mountUnit(Component,props,context)
  unit.state.setLayer('risk',true);unit.state.toggleMarker('normal')
  assert.deepEqual(updatedLayers,{risk:true,weather:true})
  assert.deepEqual(updatedMarkers,{normal:false})
  assert.equal(props.modelValue.risk,false);assert.equal(props.markerFilters.normal,true)
})
test('risk card expands all stations and emits exact selection ID',async context=>{
  const Component=(await import('../src/components/dashboard/right-sidebar/TopRiskSubstationsCard.vue')).default
  const stations=Array.from({length:8},(_,i)=>({id:`TS-${i}`,risk:40+i,health:90,status:'warning'}))
  let selected
  const unit=mountUnit(Component,{stations,'onSelect-station':value=>{selected=value}},context)
  assert.equal(unit.state.displayStations.length,6)
  unit.state.expanded=true;assert.equal(unit.state.displayStations.length,8)
  unit.state.selectStation('TS-7');assert.equal(selected,'TS-7')
})
test('alarm correlation summary counts unique affected assets',async context=>{
  const Component=(await import('../src/components/dashboard/operations/alarms/AlarmCorrelationPanel.vue')).default
  const correlations=[{severity:'CRITICAL',relatedAlarmCount:2,affectedAssets:['TS-1','TS-2'],confidence:90},
    {severity:'WARNING',relatedAlarmCount:1,affectedAssets:['TS-2'],confidence:80}]
  const {state}=mountUnit(Component,{correlations},context)
  assert.equal(state.totalAffectedAssets,2);assert.equal(state.totalRelatedAlarms,3)
  assert.equal(state.averageConfidence,85);assert.equal(state.criticalCount,1)
})
test('voltage chart preserves zero and chronological ordering without mutating source',async context=>{
  const Component=(await import('../src/components/VoltageChart.vue')).default
  const sensors=[{electrical:{voltage_kv:0}},{electrical:{voltage_kv:10}}]
  assert.deepEqual(mountUnit(Component,{sensors},context,true).state.chartData,[10,0])
  assert.equal(sensors[0].electrical.voltage_kv,0)
})
test('sensor chart maps readings directly into the plotting boundary',async context=>{
  const Component=(await import('../src/components/SensorChart.vue')).default
  const {state,errors}=mountUnit(Component,{data:[{temp:0},{temp:90}]},context,true)
  assert.deepEqual(state.chartOption.series[0].data,[0,90]);assert.equal(errors.length,0)
})
test('forecast chart preserves zero load and zero risk from server',()=>{
  setActivePinia(createPinia())
  const model=useLoadForecast(()=>[{label:'+1h',loadMW:0,risk:0,confidence:0}],key=>key)
  assert.equal(model.peakLoad.value,0);assert.equal(model.avgRisk.value,0)
})
test('forecast chart does not invent a history/forecast series without any input',()=>{
  setActivePinia(createPinia())
  const model=useLoadForecast(()=>[],key=>key)
  assert.equal(model.linePath.value,'');assert.equal(model.avgConfidence.value,0)
})
test('operator frequency metric preserves a measured zero instead of nominal fallback',()=>{
  setActivePinia(createPinia())
  const store=useSensorStore();store.metricHistory.frequency=[{value:0,timestamp:1}]
  const metric=useOperatorMetrics(store,key=>key).operatorMetrics.value.find(m=>m.unit===' Hz')
  assert.equal(metric.value,'0.00')
})
test('transformer twin preserves a real zero oil temperature',async context=>{
  await router.push('/transformers/TR-0001')
  const Component=(await import('../src/pages/TransformerTwin.vue')).default
  const unit=mountUnit(Component,{},context)
  globalThis.__testHttpAdapter=async config=>({status:200,headers:{},config,data:config.url==='/latest-stations'
    ?{data:[{...normal,thermal:{oil_temp_c:0,winding_temp_c:0},electrical:{...normal.electrical,current_a:0}}]}
    :{data:[],regions:[],points:[],insights:[],correlations:[],nodes:[],edges:[],alerts:[]}})
  await unit.state.store.refreshAll()
  assert.equal(unit.state.oilTemp,0);assert.equal(unit.state.loadPct,0)
})
test('substation twin does not display fabricated measurement values for an unknown ID',async context=>{
  await router.push('/substations/missing')
  const Component=(await import('../src/pages/SubstationTwin.vue')).default
  const unit=mountUnit(Component,{},context)
  assert.equal(unit.state.station,undefined)
  assert.ok(unit.state.current==null || unit.state.current===0,'Unknown station displays 354 A fallback')
})
test('map popup text cannot inject HTML from a customer name',async context=>{
  const Component=(await import('../src/components/dashboard/map/layers/CustomerLayer.vue')).default
  const unit=mountUnit(Component,propsFor(true),context)
  const html=unit.state.popupHtml({id:'C-1',name:'<img src=x onerror=alert(1)>',type:'industrial',typeLabel:'INDUSTRIAL',consumption:1,outageRisk:0,substation:'TS-1'})
  assert.ok(!html.includes('<img src=x'),'Popup interpolates untrusted customer names into raw HTML')
})
})
