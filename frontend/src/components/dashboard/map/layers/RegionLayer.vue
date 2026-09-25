<template>
  <div />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue'
import type { PropType } from 'vue'
import mapboxgl from 'mapbox-gl'
import { useI18n } from '../../../../i18n'

const props = defineProps({
  map:{ type:Object as PropType<any>, required:true },
  regions:{ type:Array as PropType<any[]>, default:() => [] }
})

const { t } = useI18n()

const sourceId = 'regions-source'
const fillLayerId = 'regions-fill'
const borderLayerId = 'regions-border'
const glowLayerId = 'regions-glow'

const coordinates = {
  'REGION-NORTH':[
    [16.3339,46.3844],[16.5350,46.3844],[16.5350,46.4450],[16.3339,46.4450],[16.3339,46.3844]
  ],
  'REGION-SOUTH':[
    [16.3339,46.3200],[16.5350,46.3200],[16.5350,46.3844],[16.3339,46.3844],[16.3339,46.3200]
  ]
}

function regionId(region){
  if(region.id) return region.id
  return region.name?.includes('North') ? 'REGION-NORTH' : 'REGION-SOUTH'
}

function buildGeoJson(){
  return {
    type:'FeatureCollection',
    features:props.regions.map(region => {
      const id = regionId(region)
      return {
        type:'Feature',
        geometry:{ type:'Polygon', coordinates:[coordinates[id]] },
        properties:{
          id,
          name:region.name,
          stations:region.stations,
          health:region.healthScore,
          risk:region.blackoutRisk,
          alarms:region.activeAlarms || 0
        }
      }
    })
  }
}

function popupHtml(p){
  const riskClass = p.risk >= 70 ? 'critical' : p.risk >= 40 ? 'warning' : 'normal'

  return `
    <div class="scada-popup scada-map-popup">
      <div class="popup-head">
        <div>
          <h3>${p.name} <small class="status-pill ${riskClass}">${t('dashboard.region')}</small></h3>
          <p>${t('dashboard.regionalDigitalTwin')}</p>
        </div>
        <button class="popup-close" type="button">x</button>
      </div>
      <div class="popup-grid two-col">
        <div><span>${t('dashboard.stations')}</span><b>${p.stations}</b></div>
        <div><span>${t('dashboard.health')}</span><b>${p.health}%</b></div>
        <div><span>${t('dashboard.blackoutRisk')}</span><b class="${riskClass}">${p.risk}%</b></div>
        <div><span>${t('dashboard.activeAlarms')}</span><b>${p.alarms}</b></div>
      </div>
      <a class="popup-link" href="/regions/${p.id}">${t('dashboard.openRegionTwin')}</a>
    </div>
  `
}

function openPopup(event){
  const feature = event.features?.[0]
  if(!feature) return

  const popup = new mapboxgl.Popup({ closeButton:false, maxWidth:'320px', offset:12 })
    .setLngLat(event.lngLat)
    .setHTML(popupHtml(feature.properties))
    .addTo(props.map)

  popup.getElement()?.querySelector('.popup-close')?.addEventListener('click', () => popup.remove())
}

function setPointer(){ props.map.getCanvas().style.cursor = 'pointer' }
function clearPointer(){ props.map.getCanvas().style.cursor = '' }

function addLayer(){
  if(props.map.getSource(sourceId)) return

  props.map.addSource(sourceId,{ type:'geojson', data:buildGeoJson() })

  props.map.addLayer({
    id:fillLayerId,
    type:'fill',
    source:sourceId,
    paint:{
      'fill-color':['case', ['>=',['get','risk'],70], '#ff3347', ['>=',['get','risk'],40], '#ffad2f', ['>=',['get','risk'],20], '#ffeb3b', '#00e676'],
      'fill-opacity':['interpolate', ['linear'], ['get','risk'], 0,0.035, 100,0.13]
    }
  })

  props.map.addLayer({
    id:glowLayerId,
    type:'line',
    source:sourceId,
    paint:{
      'line-color':'#40c4ff',
      'line-width':['interpolate', ['linear'], ['zoom'], 7,4, 12,8],
      'line-opacity':0.12,
      'line-blur':3
    }
  })

  props.map.addLayer({
    id:borderLayerId,
    type:'line',
    source:sourceId,
    paint:{
      'line-color':'#40c4ff',
      'line-width':['interpolate', ['linear'], ['zoom'], 7,1, 12,2.2],
      'line-opacity':0.48
    }
  })

  props.map.on('click', fillLayerId, openPopup)
  props.map.on('mouseenter', fillLayerId, setPointer)
  props.map.on('mouseleave', fillLayerId, clearPointer)
}

function updateLayer(){
  const source = props.map.getSource(sourceId)
  if(source) source.setData(buildGeoJson())
}

onMounted(addLayer)
watch(() => props.regions, updateLayer, { deep:true })

onBeforeUnmount(() => {
  if(props.map.getLayer(fillLayerId)){
    props.map.off('click', fillLayerId, openPopup)
    props.map.off('mouseenter', fillLayerId, setPointer)
    props.map.off('mouseleave', fillLayerId, clearPointer)
  }
  if(props.map.getLayer(borderLayerId)) props.map.removeLayer(borderLayerId)
  if(props.map.getLayer(glowLayerId)) props.map.removeLayer(glowLayerId)
  if(props.map.getLayer(fillLayerId)) props.map.removeLayer(fillLayerId)
  if(props.map.getSource(sourceId)) props.map.removeSource(sourceId)
})
</script>
