<template>

<div>

  <q-card
    flat
    bordered
    class="map-layer-panel absolute text-white q-pa-sm"
  >
    <q-card-section class="q-pa-sm">
      <div class="text-subtitle2 text-weight-bold text-uppercase">
        {{ t('dashboard.mapLayers') }}
      </div>
    </q-card-section>

    <q-separator />

    <q-list
      dense
      class="q-px-xs q-py-sm"
    >
      <q-item
        v-for="layer in layerItems"
        :key="layer.key"
        tag="label"
        clickable
        class="map-layer-item rounded-borders q-px-xs"
      >

        <q-item-section avatar class="map-check-section">
          <q-checkbox
            dense
            size="sm"
            color="cyan"
            :model-value="modelValue[layer.key]"
            @update:model-value="setLayer(layer.key,$event)"
          />
        </q-item-section>

        <q-item-section>

          <q-item-label class="text-caption text-blue-grey-1">
            {{ layer.label }}
          </q-item-label>

        </q-item-section>

        <q-item-section side>
          <q-icon
            :name="layer.icon"
            color="blue-grey-4"
            size="16px"
          />
        </q-item-section>

      </q-item>

    </q-list>

    <q-separator dark class="q-my-xs" />

    <q-card-section class="q-pa-sm">
      <div class="text-caption text-blue-grey-3 text-uppercase q-mb-xs">
        {{ t('dashboard.legend') }}
      </div>

      <div class="legend-filter-list">
        <button
          v-for="item in legendItems"
          :key="item.key"
          type="button"
          :class="['legend-filter-row', { inactive: !markerFilters[item.key] }]"
          @click="toggleMarker(item.key)"
        >
          <span :class="['legend-dot', item.key]" />
          <span>{{ item.label }}</span>
          <q-icon
            :name="markerFilters[item.key] ? 'visibility' : 'visibility_off'"
            size="14px"
          />
        </button>

        <div class="legend-flow-row">
          <span class="legend-flow-line" />
          <span>{{ t('dashboard.powerFlow') }}</span>
        </div>
      </div>
    </q-card-section>

  </q-card>
</div>

</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../../../../i18n'

const { t } = useI18n()

const props = defineProps({
  modelValue:{
    type:Object,
    required:true
  },
  markerFilters:{
    type:Object,
    required:true
  },
  summary:{
    type:Object,
    required:true
  },
  blackout:{
    type:Object,
    required:true
  },
  totalLoad:{
    type:Number,
    default:0
  }
})

const emit = defineEmits([
  'update:modelValue',
  'update:markerFilters'
])

const layerItems = computed(() => [
  {
    key:'substations',
    label:t('dashboard.substations'),
    icon:'hub'
  },
  {
    key:'transformers',
    label:t('dashboard.transformers'),
    icon:'memory'
  },
  {
    key:'lines',
    label:t('dashboard.powerLines'),
    icon:'timeline'
  },
  {
    key:'regions',
    label:t('dashboard.regions'),
    icon:'public'
  },
  {
    key:'customers',
    label:t('dashboard.customers'),
    icon:'groups'
  },
  {
    key:'risk',
    label:t('dashboard.aiRiskLayer'),
    icon:'psychology'
  },
  {
    key:'heatmap',
    label:t('dashboard.loadHeatmap'),
    icon:'blur_on'
  },
  {
    key:'weather',
    label:t('dashboard.weatherImpact'),
    icon:'thunderstorm'
  },
  {
    key:'contingency',
    label:t('dashboard.n1Mode'),
    icon:'account_tree'
  }
])

const legendItems = computed(() => [
  { key:'normal', label:t('dashboard.normal') },
  { key:'warning', label:t('dashboard.warningLabel') },
  { key:'critical', label:t('dashboard.critical') },
  { key:'offline', label:t('dashboard.offlineLabel') }
])

function setLayer(key,value){

  emit(
    'update:modelValue',
    {
      ...props.modelValue,
      [key]:value
    }
  )
}

function toggleMarker(key){
  emit(
    'update:markerFilters',
    {
      ...props.markerFilters,
      [key]:!props.markerFilters[key]
    }
  )
}

</script>

<style>
.map-layer-panel{
  z-index:10;
  top:18px;
  left:18px;
  width:285px;
  background:rgba(5,12,24,.92);
  border-color:rgba(0,229,255,.25);
  border-radius:18px;
  backdrop-filter:blur(12px);
}

.map-layer-panel{
  width:236px;
  border-radius:8px;
}

.map-layer-panel{
  top:14px;
  left:14px;
  width:218px;
  max-height:calc(100% - 28px);
  overflow:auto;
  border-radius:8px;
  background:rgba(4,12,22,.9);
}

.map-layer-panel .q-item{
  min-height:28px;
}

.map-check-section{
  min-width:30px;
  padding-right:6px;
}

.map-layer-item:hover,
.legend-filter-row:hover{
  background:rgba(64,196,255,.1);
}

.legend-filter-list{
  display:grid;
  gap:4px;
}

.legend-filter-row,
.legend-flow-row{
  width:100%;
  min-height:24px;
  display:grid;
  grid-template-columns:18px 1fr 16px;
  align-items:center;
  gap:6px;
  padding:3px 4px;
  border:0;
  border-radius:6px;
  color:#dcecf4;
  background:transparent;
  cursor:pointer;
  font:inherit;
  font-size:11px;
  text-align:left;
}

.legend-filter-row.inactive{
  color:#708999;
  opacity:.52;
}

.legend-dot{
  width:11px;
  height:11px;
  border:2px solid currentColor;
  border-radius:50%;
  box-shadow:0 0 9px currentColor;
}

.legend-dot.normal{ color:#00e676; }

.legend-dot.warning{ color:#ff9800; }

.legend-dot.critical{ color:#ff1744; }

.legend-dot.offline{ color:#9e9e9e; }

.legend-flow-row{
  cursor:default;
  grid-template-columns:18px 1fr;
  color:#8fb3c7;
}

.legend-flow-line{
  width:14px;
  height:2px;
  border-radius:99px;
  background:#42c8ff;
  box-shadow:0 0 7px rgba(66,200,255,.8);
}
</style>
