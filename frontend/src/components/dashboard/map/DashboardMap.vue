<template>
  <q-card
    flat
    bordered
    class="scada-map-card fit overflow-hidden relative-position"
  >
    <div
      ref="mapContainer"
      class="fit"
    />

    <LayerPanel
      v-model="layers"
      v-model:marker-filters="markerFilters"
      :summary="store.summary"
      :blackout="store.blackout"
      :total-load="store.totalLoadMW"
    />

    <RegionLayer
      v-if="mapLoaded && layers.regions"
      :map="map"
      :regions="store.regions"
    />

    <RiskLayer
      v-if="mapLoaded && layers.risk"
      :map="map"
      :stations="store.stations"
    />

    <HeatmapLayer
      v-if="mapLoaded && layers.heatmap"
      :map="map"
      :stations="store.stations"
    />

    <WeatherLayer
      v-if="mapLoaded && layers.weather"
      :map="map"
      :regions="store.regions"
      :weather="store.weather"
    />

    <ContingencyLayer
      v-if="mapLoaded && layers.contingency"
      :map="map"
      :stations="store.stations"
      :top-risk="store.topRiskSubstations"
    />

    <PowerLineLayer
      v-if="mapLoaded && layers.lines"
      :map="map"
      :lines="store.powerLines"
      :stations="store.stations"
    />

    <CustomerLayer
      v-if="mapLoaded && layers.customers"
      :map="map"
      :customers="store.customers"
    />

    <TransformerLayer
      v-if="mapLoaded && layers.transformers"
      :map="map"
      :transformers="store.transformers"
      :visible-statuses="visibleStatuses"
    />

    <SubstationLayer
      v-if="mapLoaded && layers.substations"
      :map="map"
      :stations="store.stations"
      :visible-statuses="visibleStatuses"
      :focus-station="props.focusStation"
    />

    <q-card
      v-if="layers.contingency"
      flat
      bordered
      class="contingency-panel absolute text-white"
    >
      <q-card-section>
        <div class="section-kicker">{{ t('dashboard.n1Contingency') }}</div>
        <div class="section-title">{{ contingencyAsset }}</div>
        <div class="contingency-grid q-mt-sm">
          <div>
            <span>{{ t('dashboard.customers') }}</span>
            <strong>{{ contingencyCustomers }}</strong>
          </div>
          <div>
            <span>{{ t('dashboard.overloads') }}</span>
            <strong>{{ contingencyOverloads }}</strong>
          </div>
          <div>
            <span>{{ t('dashboard.risk') }}</span>
            <strong>{{ contingencyRisk }}</strong>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-card>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import { useSensorStore } from '../../../stores/sensorStore'
import LayerPanel from './controls/LayerPanel.vue'
import RegionLayer from './layers/RegionLayer.vue'
import PowerLineLayer from './layers/PowerLineLayer.vue'
import SubstationLayer from './layers/SubstationLayer.vue'
import TransformerLayer from './layers/TransformerLayer.vue'
import CustomerLayer from './layers/CustomerLayer.vue'
import RiskLayer from './layers/RiskLayer.vue'
import HeatmapLayer from './layers/HeatmapLayer.vue'
import WeatherLayer from './layers/WeatherLayer.vue'
import ContingencyLayer from './layers/ContingencyLayer.vue'
import { useI18n } from '../../../i18n'

const props = defineProps({
  focusStation:{
    type:Object,
    default:null
  }
})

const store = useSensorStore()
const { t } = useI18n()
const mapContainer = ref(null)
const map = ref(null)
const mapLoaded = ref(false)

const layers = ref({
  regions:false,
  substations:true,
  transformers:false,
  lines:true,
  customers:false,
  risk:false,
  heatmap:false,
  weather:false,
  contingency:false
})

const markerFilters = ref({
  normal:true,
  warning:true,
  critical:true,
  offline:true
})

const visibleStatuses = computed(() =>
  Object.entries(markerFilters.value)
    .filter(([,visible]) => visible)
    .map(([status]) => status)
)

const primaryContingencyAsset = computed(() =>
  store.topRiskSubstations[0]?.id || store.stations[0]?.station_id
)

const contingencyAsset = computed(() =>
  store.contingency?.assetId || primaryContingencyAsset.value || t('dashboard.selectAsset')
)

const contingencyCustomers = computed(() =>
  store.contingency?.affectedCustomers || 0
)

const contingencyOverloads = computed(() =>
  store.contingency?.overloadedAssets || 0
)

const contingencyRisk = computed(() =>
  store.contingency?.risk || t('dashboard.pending')
)

onMounted(() => {
  mapboxgl.accessToken =
    import.meta.env.VITE_MAPBOX_TOKEN

  map.value = new mapboxgl.Map({
    container:mapContainer.value,
    style:'mapbox://styles/mapbox/dark-v11',
    center:[16.4339,46.3844],
    zoom:9.8,
    pitch:20,
    bearing:0,
    antialias:true,
    collectResourceTiming:false,
    transformRequest:url => {
      if(url.includes('events.mapbox.com')){
        return {
          url:'data:application/json,{}'
        }
      }

      return {
        url
      }
    }
  })
  map.value.addControl(
    new mapboxgl.NavigationControl(),
    'bottom-right'
  )
  map.value.on('load', () => {
    mapLoaded.value = true
  })
})

watch(
  () => layers.value.contingency,
  enabled => {
    if(enabled && primaryContingencyAsset.value){
      store.runContingency(primaryContingencyAsset.value)
    }
  }
)

watch(
  () => props.focusStation,
  request => {
    if(!request?.id){
      return
    }

    layers.value.substations = true
    markerFilters.value = {
      normal:true,
      warning:true,
      critical:true,
      offline:true
    }
  }
)

onBeforeUnmount(() => {
  if(map.value){
    map.value.remove()
  }
})
</script>

<style>
.scada-map-card{
  background:#050b14;
  border-color:rgba(0,229,255,.22);
  border-radius:8px;
  box-shadow:0 0 35px rgba(0,229,255,.08);
}

.contingency-panel{
  z-index:12;
  right:18px;
  bottom:18px;
  width:310px;
  background:rgba(9,10,18,.92);
  border-color:rgba(255,202,40,.38);
  border-radius:8px;
  backdrop-filter:blur(12px);
}

.contingency-grid{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:8px;
}

.contingency-grid div{
  padding:8px;
  border:1px solid rgba(255,255,255,.08);
  border-radius:8px;
  background:rgba(255,255,255,.035);
}

.contingency-grid span{
  display:block;
  color:#9fb3c8;
  font-size:10px;
}

.contingency-grid strong{
  display:block;
  margin-top:4px;
  color:#ffca28;
}

.scada-map-card{
  box-shadow:0 16px 42px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.025);
}

.scada-map-card{
  min-height:0;
}
</style>
