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
  customers:{ type:Array as PropType<any[]>, default:() => [] }
})

const { t } = useI18n()

const sourceId = 'customers-source'
const glowLayerId = 'customers-glow'
const ringLayerId = 'customers-ring'
const coreLayerId = 'customers-core'

const typeColor = [
  'match', ['get','type'],
  'critical','#ff3347',
  'industrial','#ffad2f',
  'commercial','#38bfff',
  '#71f23f'
]

function buildGeoJson(){
  return {
    type:'FeatureCollection',
    features:props.customers.map(c => ({
      type:'Feature',
      geometry:{ type:'Point', coordinates:[c.lng, c.lat] },
      properties:{
        id:c.id,
        name:c.name,
        type:c.type,
        typeLabel:String(c.type || 'customer').toUpperCase(),
        consumption:c.consumption,
        outageRisk:c.outageRisk,
        substation:c.substation
      }
    }))
  }
}

function popupHtml(p){
  const riskClass = p.outageRisk >= 70 ? 'critical' : p.outageRisk >= 38 ? 'warning' : 'normal'

  return `
    <div class="scada-popup scada-map-popup">
      <div class="popup-head">
        <div>
          <h3>${p.name} <small class="status-pill ${riskClass}">${t(p.typeLabel)}</small></h3>
          <p>${p.id}</p>
        </div>
        <button class="popup-close" type="button">x</button>
      </div>
      <div class="popup-grid two-col">
        <div><span>${t('dashboard.consumption')}</span><b>${p.consumption} MW</b></div>
        <div><span>${t('dashboard.outageRisk')}</span><b class="${riskClass}">${p.outageRisk}%</b></div>
        <div><span>${t('dashboard.substation')}</span><b>${p.substation}</b></div>
      </div>
      <div class="popup-ai-block compact">
        <span>${t('dashboard.customerImpact')}</span>
        <strong>${p.outageRisk >= 70 ? t('dashboard.highOutageExposure') : p.outageRisk >= 38 ? t('dashboard.watchFeederDependency') : t('dashboard.normalSupplyState')}</strong>
        <small>${t('dashboard.linkedToLiveSubstationTelemetry')}</small>
      </div>
    </div>
  `
}

function openPopup(event){
  const feature = event.features?.[0]
  if(!feature) return

  const popup = new mapboxgl.Popup({ closeButton:false, maxWidth:'310px', offset:12 })
    .setLngLat(feature.geometry.coordinates)
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
    id:glowLayerId,
    type:'circle',
    source:sourceId,
    paint:{
      'circle-radius':['interpolate', ['linear'], ['zoom'], 6,3, 11,7, 14,11],
      'circle-color':typeColor,
      'circle-opacity':0.13,
      'circle-blur':0.72
    }
  })

  props.map.addLayer({
    id:ringLayerId,
    type:'circle',
    source:sourceId,
    paint:{
      'circle-radius':['interpolate', ['linear'], ['zoom'], 6,2, 11,4.5, 14,7],
      'circle-color':'#040811',
      'circle-opacity':0.72,
      'circle-stroke-width':1.2,
      'circle-stroke-color':typeColor,
      'circle-stroke-opacity':0.82
    }
  })

  props.map.addLayer({
    id:coreLayerId,
    type:'circle',
    source:sourceId,
    paint:{
      'circle-radius':['interpolate', ['linear'], ['zoom'], 6,1, 11,2.5, 14,4],
      'circle-color':typeColor,
      'circle-opacity':0.86
    }
  })

  props.map.on('click', ringLayerId, openPopup)
  props.map.on('mouseenter', ringLayerId, setPointer)
  props.map.on('mouseleave', ringLayerId, clearPointer)
}

function updateLayer(){
  const source = props.map.getSource(sourceId)
  if(source) source.setData(buildGeoJson())
}

onMounted(addLayer)
watch(() => props.customers, updateLayer, { deep:true })

onBeforeUnmount(() => {
  if(props.map.getLayer(ringLayerId)){
    props.map.off('click', ringLayerId, openPopup)
    props.map.off('mouseenter', ringLayerId, setPointer)
    props.map.off('mouseleave', ringLayerId, clearPointer)
  }
  if(props.map.getLayer(coreLayerId)) props.map.removeLayer(coreLayerId)
  if(props.map.getLayer(ringLayerId)) props.map.removeLayer(ringLayerId)
  if(props.map.getLayer(glowLayerId)) props.map.removeLayer(glowLayerId)
  if(props.map.getSource(sourceId)) props.map.removeSource(sourceId)
})
</script>
