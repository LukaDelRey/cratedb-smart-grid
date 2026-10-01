<template>
  <div />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue'
import type { PropType } from 'vue'
import mapboxgl from 'mapbox-gl'
import { useSensorStore } from '../../../../stores/sensorStore'
import { useI18n } from '../../../../i18n'
import { stationAlarms } from '../../../../services/stationAlarms'

const props = defineProps({
  map:{ type:Object as PropType<any>, required:true },
  stations:{ type:Array as PropType<any[]>, default:() => [] },
  visibleStatuses:{
    type:Array as PropType<any[]>,
    default:() => ['normal','warning','critical','offline']
  },
  focusStation:{
    type:Object as PropType<Record<string, any>>,
    default:null
  }
})

const store = useSensorStore()
const { t } = useI18n()

const sourceId = 'substations-source'
const glowLayerId = 'substations-glow'
const ringLayerId = 'substations-ring'
const layerId = 'substations-layer'
const coreLayerId = 'substations-core'
const iconLayerId = 'substations-icon'
const labelLayerId = 'substations-labels'
let activePopup = null
let activePopupStationId = null
let handledFocusKey = null
let pendingFocusRequest = null

const statusColor = [
  'match',
  ['get','status'],
  'critical','#ff3347',
  'warning','#ffad2f',
  'offline','#a8b6c4',
  '#71f23f'
]

function formatKw(value){
  return Math.round(value || 0).toLocaleString()
}

function stationFeature(station){
  const location = store.parseLocation(station)
  const status = store.getStationStatus(station)
  const risk = store.getStationRisk(station)
  const health = store.getStationHealth(station)
  const activePower = station.electrical?.active_power_kw || 0
  const current = station.electrical?.current_a || 0

  return {
    type:'Feature',
    geometry:{
      type:'Point',
      coordinates:[location.lng, location.lat]
    },
    properties:{
      id:station.station_id,
      name:station.station_name || station.station_id,
      voltage:station.electrical?.voltage_kv || 0,
      current,
      loadPct:Math.min(100, Math.round(current / 6)),
      power:activePower,
      powerLabel:formatKw(activePower),
      oilTemp:station.thermal?.oil_temp_c || 0,
      windingTemp:station.thermal?.winding_temp_c || 0,
      thd:station.electrical?.harmonics_thd || 0,
      health,
      risk,
      status,
      alarmSummary:stationAlarms(station).map(alarm => alarm.title).join(', '),
      statusLabel:status.toUpperCase(),
      sort:
        status === 'critical' ? 4 :
        status === 'warning' ? 3 :
        status === 'offline' ? 1 :
        2
    }
  }
}

function buildGeoJson(){
  return {
    type:'FeatureCollection',
    features:props.stations.map(stationFeature)
  }
}

function statusFilter(){
  return [
    'in',
    ['get','status'],
    ['literal', props.visibleStatuses]
  ]
}

function applyStatusFilter(){
  [glowLayerId, ringLayerId, layerId, coreLayerId, iconLayerId, labelLayerId].forEach(id => {
    if(props.map.getLayer(id)){
      props.map.setFilter(id, statusFilter())
    }
  })
}

function markerRadius(baseSmall, baseLarge){
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    6,baseSmall,
    9,baseSmall + 1.5,
    12,baseLarge,
    15,baseLarge + 2
  ]
}

function popupHtml(p){
  const riskClass = p.risk >= 70 ? 'critical' : p.risk >= 38 ? 'warning' : 'normal'

  return `
    <div class="scada-popup scada-map-popup">
      <div class="popup-head">
        <div>
          <h3>${p.id} <small class="status-pill ${p.status}">${t(p.statusLabel)}</small></h3>
        </div>
        <button class="popup-close" type="button">x</button>
      </div>
      <div class="popup-grid two-col">
        <div><span>${t('dashboard.voltage')}</span><b>${p.voltage} kV</b></div>
        <div><span>${t('dashboard.current')}</span><b>${p.current} A</b></div>
        <div><span>${t('dashboard.load')}</span><b><i class="popup-bar"><em style="width:${p.loadPct}%"></em></i>${p.loadPct}%</b></div>
        <div><span>${t('dashboard.oilTemp')}</span><b>${p.oilTemp} C</b></div>
        <div><span>${t('dashboard.power')}</span><b>${p.powerLabel} kW</b></div>
        <div><span>THD</span><b>${Number(p.thd).toFixed(1)}%</b></div>
      </div>
      <div class="popup-risk-strip">
        <div><span>${t('dashboard.healthScore')}</span><b class="${riskClass} q-pr-sm">${p.health}%</b></div>
        <div><span>${t('dashboard.blackoutRisk')}</span><b class="${riskClass} q-pr-sm">${p.risk}%</b></div>
      </div>
      <div class="popup-ai-block compact">
        <span>${t('dashboard.aiPrediction')}</span>
        <strong>${p.status === 'normal' ? t('dashboard.normalOperatingEnvelope') : p.alarmSummary ? t('dashboard.activeAlarmConditions') : t('dashboard.monitorVoltageAndThermalDrift')}</strong>
        <small>${p.alarmSummary || t('dashboard.noImmediateInterventionRequired')}</small>
      </div>
      <a class="popup-link" href="/substations/${p.id}">${t('dashboard.viewDetails')}</a>
    </div>
  `
}

function showPopup(feature, zoomToStation = false){
  if(!feature){
    return
  }

  activePopup?.remove()

  if(zoomToStation){
    props.map.flyTo({
      center:feature.geometry.coordinates,
      zoom:12.4,
      speed:1.15,
      curve:1.35,
      essential:true
    })
  }

  const popup = new mapboxgl.Popup({
    closeButton:false,
    maxWidth:'320px',
    offset:18
  })
    .setLngLat(feature.geometry.coordinates)
    .setHTML(popupHtml(feature.properties))
    .addTo(props.map)

  activePopup = popup
  activePopupStationId = feature.properties.id

  popup.on('close', () => {
    if(activePopup === popup){
      activePopup = null
      activePopupStationId = null
    }
  })

  popup.getElement()
    ?.querySelector('.popup-close')
    ?.addEventListener('click', () => popup.remove())
}

function openPopup(event){
  const id = event.features?.[0]?.properties?.id
  const station = props.stations.find(item => item.station_id === id)
  showPopup(station ? stationFeature(station) : null)
}

function focusStation(stationId){
  const station = props.stations.find(item => item.station_id === stationId)

  if(!station){
    return false
  }

  showPopup(stationFeature(station), true)

  return true
}

function focusRequestKey(request){
  return request?.id
    ? `${request.id}:${request.requestedAt || 'manual'}`
    : null
}

function handleFocusRequest(request){
  const key = focusRequestKey(request)

  if(!key || key === handledFocusKey){
    return
  }

  if(focusStation(request.id)){
    handledFocusKey = key
    pendingFocusRequest = null
    return
  }

  pendingFocusRequest = request
}

function setPointer(){
  props.map.getCanvas().style.cursor = 'pointer'
}

function clearPointer(){
  props.map.getCanvas().style.cursor = ''
}

function addLayer(){

  if(props.map.getSource(sourceId)) return

  props.map.addSource(sourceId,{
    type:'geojson',
    data:buildGeoJson()
  })

  props.map.addLayer({
    id:glowLayerId,
    type:'circle',
    source:sourceId,
    paint:{
      'circle-radius':markerRadius(6,14),
      'circle-color':statusColor,
      'circle-opacity':[
        'interpolate',
        ['linear'],
        ['zoom'],
        6,0.16,
        10,0.26,
        14,0.36
      ],
      'circle-blur':0.72
    }
  })

  props.map.addLayer({
    id:ringLayerId,
    type:'circle',
    source:sourceId,
    paint:{
      'circle-radius':markerRadius(3.6,8.8),
      'circle-color':'#050910',
      'circle-opacity':0.76,
      'circle-stroke-width':[
        'interpolate',
        ['linear'],
        ['zoom'],
        6,1.2,
        10,1.8,
        14,2.5
      ],
      'circle-stroke-color':statusColor,
      'circle-stroke-opacity':0.96,
      'circle-blur':0.08
    }
  })

  props.map.addLayer({
    id:layerId,
    type:'circle',
    source:sourceId,
    paint:{
      'circle-radius':markerRadius(2.2,5.8),
      'circle-color':statusColor,
      'circle-opacity':0.98,
      'circle-blur':0.18
    }
  })

  props.map.addLayer({
    id:coreLayerId,
    type:'circle',
    source:sourceId,
    paint:{
      'circle-radius':markerRadius(1.15,2.8),
      'circle-color':'#02060b',
      'circle-opacity':0.96
    }
  })

  props.map.addLayer({
    id:iconLayerId,
    type:'symbol',
    source:sourceId,
    layout:{
      'text-field':'⚡',
      'text-size':[
        'interpolate',
        ['linear'],
        ['zoom'],
        6,6,
        10,8,
        14,11
      ],
      'text-allow-overlap':true,
      'text-ignore-placement':true
    },
    paint:{
      'text-color':statusColor,
      'text-halo-color':'#02060b',
      'text-halo-width':1.1,
      'text-opacity':[
        'interpolate',
        ['linear'],
        ['zoom'],
        6,0,
        7.5,0.75,
        10,1
      ]
    }
  })

  props.map.addLayer({
    id:labelLayerId,
    type:'symbol',
    source:sourceId,
    minzoom:11.5,
    layout:{
      'text-field':['get','id'],
      'text-size':10,
      'text-offset':[0,1.45],
      'text-anchor':'top'
    },
    paint:{
      'text-color':'#e8fbff',
      'text-halo-color':'#050b14',
      'text-halo-width':1.4
    }
  })

  applyStatusFilter()

  props.map.on('click', ringLayerId, openPopup)
  props.map.on('mouseenter', ringLayerId, setPointer)
  props.map.on('mouseleave', ringLayerId, clearPointer)

  handleFocusRequest(props.focusStation)
}

function updateLayer(){
  const source = props.map.getSource(sourceId)

  if(source){
    source.setData(buildGeoJson())
  }
  if(activePopup && activePopupStationId){
    const station = props.stations.find(item => item.station_id === activePopupStationId)
    if(!station){
      activePopup.remove()
      activePopup = null
      activePopupStationId = null
      return
    }
    const feature = stationFeature(station)
    activePopup.setLngLat(feature.geometry.coordinates).setHTML(popupHtml(feature.properties))
    activePopup.getElement()?.querySelector('.popup-close')?.addEventListener('click', () => activePopup?.remove())
  }
}

onMounted(addLayer)

watch(
  () => props.stations,
  () => {
    updateLayer()

    if(pendingFocusRequest){
      handleFocusRequest(pendingFocusRequest)
    }
  },
  { deep:true }
)

watch(
  () => props.visibleStatuses,
  applyStatusFilter,
  { deep:true }
)

watch(
  () => props.focusStation,
  handleFocusRequest
)

onBeforeUnmount(() => {
  activePopup?.remove()

  if(props.map.getLayer(ringLayerId)){
    props.map.off('click', ringLayerId, openPopup)
    props.map.off('mouseenter', ringLayerId, setPointer)
    props.map.off('mouseleave', ringLayerId, clearPointer)
  }

  if(props.map.getLayer(labelLayerId)) props.map.removeLayer(labelLayerId)
  if(props.map.getLayer(iconLayerId)) props.map.removeLayer(iconLayerId)
  if(props.map.getLayer(coreLayerId)) props.map.removeLayer(coreLayerId)
  if(props.map.getLayer(layerId)) props.map.removeLayer(layerId)
  if(props.map.getLayer(ringLayerId)) props.map.removeLayer(ringLayerId)
  if(props.map.getLayer(glowLayerId)) props.map.removeLayer(glowLayerId)
  if(props.map.getSource(sourceId)) props.map.removeSource(sourceId)
})
</script>

<style>
.scada-map-popup .popup-risk-strip{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:6px;
  margin-top:6px;
  padding-top:6px;
  border-top:1px solid rgba(64,196,255,.14);
}

.scada-map-popup .popup-risk-strip div{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:8px;
  min-width:0;
}
</style>
