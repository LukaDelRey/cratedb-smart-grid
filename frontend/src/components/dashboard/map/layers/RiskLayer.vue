<template>
  <div />
</template>

<script setup>

import { onMounted, onBeforeUnmount, watch } from 'vue'

import { useSensorStore }
from '../../../../stores/sensorStore'

const props = defineProps({
  map:{
    type:Object,
    required:true
  },
  stations:{
    type:Array,
    default:() => []
  }
})

const store = useSensorStore()

const sourceId = 'risk-source'
const layerId = 'risk-layer'

function buildGeoJson(){

  return {
    type:'FeatureCollection',
    features:props.stations.map(station => {

      const location = store.parseLocation(station)

      return {
        type:'Feature',
        geometry:{
          type:'Point',
          coordinates:[
            location.lng,
            location.lat
          ]
        },
        properties:{
          risk:store.getStationRisk(station)
        }
      }
    })
  }
}

function addLayer(){

  if(props.map.getSource(sourceId)){
    return
  }

  props.map.addSource(sourceId,{
    type:'geojson',
    data:buildGeoJson()
  })

  props.map.addLayer({
    id:layerId,
    type:'circle',
    source:sourceId,
    paint:{
      'circle-radius':[
        'interpolate',
        ['linear'],
        ['get','risk'],
        0,0,
        100,38
      ],
      'circle-color':[
        'case',
        ['>=',['get','risk'],70],'#ff3347',
        ['>=',['get','risk'],40],'#ffad2f',
        '#38bfff'
      ],
      'circle-opacity':[
        'interpolate',
        ['linear'],
        ['get','risk'],
        0,0.02,
        100,0.16
      ],
      'circle-blur':0.78
    }
  })
}

function updateLayer(){

  const source = props.map.getSource(sourceId)

  if(source){
    source.setData(buildGeoJson())
  }
}

onMounted(addLayer)

watch(
  () => props.stations,
  updateLayer,
  { deep:true }
)

onBeforeUnmount(() => {

  if(props.map.getLayer(layerId)){
    props.map.removeLayer(layerId)
  }

  if(props.map.getSource(sourceId)){
    props.map.removeSource(sourceId)
  }
})

</script>
