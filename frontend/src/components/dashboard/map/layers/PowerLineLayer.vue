<template>
  <div />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue'
import type { PropType } from 'vue'
import mapboxgl from 'mapbox-gl'
import { useSensorStore } from '../../../../stores/sensorStore'
import { useI18n } from '../../../../i18n'

const props = defineProps({
  map:{ type:Object as PropType<any>, required:true },
  lines:{ type:Array as PropType<any[]>, default:() => [] },
  stations:{ type:Array as PropType<any[]>, default:() => [] }
})

const store = useSensorStore()
const { t } = useI18n()

const sourceId = 'power-lines-source'
const shadowLayerId = 'power-lines-shadow'
const layerId = 'power-lines-layer'
const flowLayerId = 'power-lines-flow'
let animationTimer = null
let animationStep = 0

const lineColor = [
  'case',
  ['>=',['get','loading'],90],
  '#ff3347',
  ['>=',['get','loading'],75],
  '#ffad2f',
  ['>=',['get','loading'],55],
  '#b7ff3c',
  '#22b9ff'
]

function distance(a,b){
  const dx = a.lng - b.lng
  const dy = a.lat - b.lat

  return Math.sqrt(dx * dx + dy * dy)
}

function getLineStatus(loadPct){
  if(loadPct >= 90) return 'critical'
  if(loadPct >= 75) return 'warning'
  if(loadPct >= 55) return 'loaded'
  return 'normal'
}

function parseBackendLine(line){
  const fromCoords = line.from_coords
  const toCoords = line.to_coords

  if(
    !Array.isArray(fromCoords) ||
    !Array.isArray(toCoords) ||
    fromCoords.length < 2 ||
    toCoords.length < 2
  ){
    return null
  }

  const fromLat = Number(fromCoords[0])
  const fromLng = Number(fromCoords[1])
  const toLat = Number(toCoords[0])
  const toLng = Number(toCoords[1])

  if(![fromLat, fromLng, toLat, toLng].every(Number.isFinite)){
    return null
  }

  const loading = Math.round(Number(line.load_pct) || 0)
  const lengthKm = Math.max(
    0.1,
    Math.round(distance({ lng:fromLng, lat:fromLat }, { lng:toLng, lat:toLat }) * 1110) / 10
  )

  return {
    type:'Feature',
    geometry:{
      type:'LineString',
      coordinates:[
        [fromLng, fromLat],
        [toLng, toLat]
      ]
    },
    properties:{
      id:line.line_id || `${line.from_station}-${line.to_station}`,
      from:line.from_station || t('dashboard.unknown'),
      to:line.to_station || t('dashboard.unknown'),
      voltage:Number(line.voltage_kv) || 110,
      loading,
      current:Math.round((loading / 100) * 680),
      lengthKm,
      status:line.status || getLineStatus(loading),
      source:t('dashboard.scada')
    }
  }
}

function stationNodes(){
  return props.stations
    .map(station => {
      const location = store.parseLocation(station)
      const loadPct = Math.min(100, Math.round((station.electrical?.current_a || 0) / 6))

      return {
        id:station.station_id,
        name:station.station_name || station.station_id,
        lng:location.lng,
        lat:location.lat,
        voltage:Number(station.electrical?.voltage_kv) || 110,
        loadPct,
        risk:store.getStationRisk(station)
      }
    })
    .filter(node => Number.isFinite(node.lng) && Number.isFinite(node.lat))
    .sort((a,b) => a.id.localeCompare(b.id))
}

function buildGeneratedLines(){
  const nodes = stationNodes()
  const seen = new Set()
  const lines = []

  nodes.forEach(node => {
    const neighbors = nodes
      .filter(candidate => candidate.id !== node.id)
      .map(candidate => ({
        candidate,
        distance:distance(node,candidate)
      }))
      .sort((a,b) => a.distance - b.distance)
      .slice(0, 3)

    neighbors.forEach(({ candidate, distance:segmentDistance }, neighborIndex) => {
      const key = [node.id, candidate.id].sort().join('|')

      if(seen.has(key) || lines.length >= 240){
        return
      }

      if(segmentDistance > 0.42 && neighborIndex > 0){
        return
      }

      seen.add(key)

      const loading = Math.min(
        98,
        Math.max(
          22,
          Math.round((node.loadPct + candidate.loadPct) / 2 + Math.min(18, (node.risk + candidate.risk) / 10))
        )
      )
      const voltage = Math.round((node.voltage + candidate.voltage) / 2)
      const lengthKm = Math.max(0.1, Math.round(segmentDistance * 1110) / 10)

      lines.push({
        type:'Feature',
        geometry:{
          type:'LineString',
          coordinates:[
            [node.lng, node.lat],
            [candidate.lng, candidate.lat]
          ]
        },
        properties:{
          id:`GRID-${String(lines.length + 1).padStart(4, '0')}`,
          from:node.id,
          to:candidate.id,
          voltage,
          loading,
          current:Math.round((loading / 100) * 680),
          lengthKm,
          status:getLineStatus(loading),
          source:t('dashboard.generatedTopology')
        }
      })
    })
  })

  return lines
}

function buildGeoJson(){
  const backendFeatures = props.lines
    .map(parseBackendLine)
    .filter(Boolean)
    .slice(0, 260)
  const generatedFeatures = buildGeneratedLines()
  const minimumUsableLines = Math.max(8, Math.floor(props.stations.length * 0.85))
  const useGenerated = generatedFeatures.length && backendFeatures.length < minimumUsableLines

  return {
    type:'FeatureCollection',
    features:useGenerated ? generatedFeatures : backendFeatures
  }
}

function popupHtml(p){
  const statusClass = p.loading >= 90 ? 'critical' : p.loading >= 75 ? 'warning' : 'normal'

  return `
    <div class="scada-popup scada-map-popup powerline-popup">
      <div class="popup-head">
        <div>
          <h3>${p.id} <small class="status-pill ${statusClass}">${t(String(p.status).toUpperCase())}</small></h3>
          <p>${p.from} &rarr; ${p.to}</p>
        </div>
        <button class="popup-close" type="button">x</button>
      </div>
      <div class="popup-grid two-col">
        <div><span>${t('dashboard.voltage')}</span><b>${p.voltage} kV</b></div>
        <div><span>${t('dashboard.current')}</span><b>${p.current} A</b></div>
        <div><span>${t('dashboard.load')}</span><b><i class="popup-bar"><em style="width:${p.loading}%"></em></i>${p.loading}%</b></div>
        <div><span>${t('dashboard.length')}</span><b>${p.lengthKm} km</b></div>
        <div><span>${t('dashboard.topology')}</span><b>${p.source}</b></div>
      </div>
      <div class="popup-ai-block compact">
        <span>${t('dashboard.aiPrediction')}</span>
        <strong>${p.loading >= 90 ? t('dashboard.lineOverloadRiskDetected') : p.loading >= 75 ? t('dashboard.thermalMarginNarrowing') : t('dashboard.powerFlowNominal')}</strong>
        <small>${p.loading >= 75 ? t('dashboard.considerSwitchingRouteOrReducingTransfer') : t('dashboard.noImmediateActionRequired')}</small>
      </div>
      <a class="popup-link" href="/substations/${p.to}">${t('dashboard.openTargetTwin')}</a>
    </div>
  `
}

function openPopup(event){
  const feature = event.features?.[0]

  if(!feature){
    return
  }

  const popup = new mapboxgl.Popup({
    closeButton:false,
    maxWidth:'320px',
    offset:12
  })
    .setLngLat(event.lngLat)
    .setHTML(popupHtml(feature.properties))
    .addTo(props.map)

  popup.getElement()
    ?.querySelector('.popup-close')
    ?.addEventListener('click', () => popup.remove())
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
    id:shadowLayerId,
    type:'line',
    source:sourceId,
    layout:{
      'line-cap':'round',
      'line-join':'round'
    },
    paint:{
      'line-width':[
        'interpolate',
        ['linear'],
        ['zoom'],
        6,1.2,
        9,2.6,
        12,5.4,
        15,8
      ],
      'line-color':lineColor,
      'line-opacity':[
        'interpolate',
        ['linear'],
        ['zoom'],
        6,0.18,
        10,0.28,
        14,0.42
      ],
      'line-blur':3.2
    }
  })

  props.map.addLayer({
    id:layerId,
    type:'line',
    source:sourceId,
    layout:{
      'line-cap':'round',
      'line-join':'round'
    },
    paint:{
      'line-width':[
        'interpolate',
        ['linear'],
        ['zoom'],
        6,0.45,
        9,0.85,
        12,1.8,
        15,3
      ],
      'line-color':lineColor,
      'line-opacity':[
        'interpolate',
        ['linear'],
        ['zoom'],
        6,0.46,
        10,0.72,
        14,0.92
      ]
    }
  })

  props.map.addLayer({
    id:flowLayerId,
    type:'line',
    source:sourceId,
    layout:{
      'line-cap':'round',
      'line-join':'round'
    },
    paint:{
      'line-width':[
        'interpolate',
        ['linear'],
        ['zoom'],
        6,0.75,
        10,1.4,
        14,2.6
      ],
      'line-color':'#eaf8ff',
      'line-opacity':[
        'case',
        ['>=',['get','loading'],75],
        0.62,
        0.34
      ],
      'line-dasharray':[0,4,1.4,5]
    }
  })

  props.map.on('click', layerId, openPopup)
  props.map.on('mouseenter', layerId, setPointer)
  props.map.on('mouseleave', layerId, clearPointer)

  startAnimation()
  moveBelowStations()
}

function updateLayer(){
  const source = props.map.getSource(sourceId)

  if(source){
    source.setData(buildGeoJson())
  }

  moveBelowStations()
}

function moveBelowStations(){
  if(
    props.map.getLayer(layerId) &&
    props.map.getLayer('substations-glow')
  ){
    props.map.moveLayer(shadowLayerId, 'substations-glow')
    props.map.moveLayer(layerId, 'substations-glow')
    props.map.moveLayer(flowLayerId, 'substations-glow')
  }
}

function startAnimation(){
  if(animationTimer){
    return
  }

  const patterns = [
    [0,4,1.4,5],
    [1,4,1.4,4],
    [2,4,1.4,3],
    [3,4,1.4,2],
    [4,4,1.4,1]
  ]

  const tick = () => {
    if(props.map.getLayer(flowLayerId)){
      props.map.setPaintProperty(
        flowLayerId,
        'line-dasharray',
        patterns[animationStep % patterns.length]
      )
    }

    animationStep += 1
    animationTimer = window.setTimeout(tick, 160)
  }

  tick()
}

function stopAnimation(){
  if(animationTimer){
    window.clearTimeout(animationTimer)
    animationTimer = null
  }
}

onMounted(() => {
  addLayer()
  setTimeout(moveBelowStations, 500)
})

watch(
  () => props.lines,
  updateLayer,
  { deep:true }
)

watch(
  () => props.stations,
  updateLayer,
  { deep:true }
)

onBeforeUnmount(() => {
  stopAnimation()
  if(props.map.getLayer(layerId)){
    props.map.off('click', layerId, openPopup)
    props.map.off('mouseenter', layerId, setPointer)
    props.map.off('mouseleave', layerId, clearPointer)
  }
  if(props.map.getLayer(flowLayerId)) props.map.removeLayer(flowLayerId)
  if(props.map.getLayer(layerId)) props.map.removeLayer(layerId)
  if(props.map.getLayer(shadowLayerId)) props.map.removeLayer(shadowLayerId)
  if(props.map.getSource(sourceId)) props.map.removeSource(sourceId)
})
</script>
