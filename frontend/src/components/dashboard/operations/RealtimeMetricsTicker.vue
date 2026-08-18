<template>
  <div class="ticker">
    <div
      v-for="metric in metrics"
      :key="metric.label"
      class="ticker-item"
    >
      <q-icon :name="metric.icon" :color="metric.color" />
      <span>{{ metric.label }}</span>
      <strong>{{ metric.value }}</strong>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../../../i18n'

const { t } = useI18n()

const props = defineProps({
  summary:{
    type:Object,
    required:true
  },
  connection:{
    type:Object,
    required:true
  },
  totalLoad:{
    type:Number,
    default:0
  },
  blackout:{
    type:Object,
    required:true
  }
})

const metrics = computed(() => [
  {
    label:t('dashboard.gridHealth'),
    value:`${props.summary.gridHealth}%`,
    icon:'health_and_safety',
    color:'positive'
  },
  {
    label:t('dashboard.systemLoad'),
    value:`${props.totalLoad} MW`,
    icon:'bolt',
    color:'cyan'
  },
  {
    label:t('dashboard.blackout'),
    value:`${props.blackout.probability}%`,
    icon:'crisis_alert',
    color:'negative'
  },
  {
    label:t('dashboard.events'),
    value:`${props.connection.messagesPerSecond}/s`,
    icon:'stream',
    color:'warning'
  }
])
</script>

<style>
.ticker{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:10px;
}

.ticker-item{
  display:flex;
  align-items:center;
  gap:9px;
  min-height:48px;
  padding:10px 12px;
  border:1px solid rgba(0,229,255,.16);
  border-radius:8px;
  background:rgba(5,12,24,.86);
}

.ticker-item span{
  color:#8fa9b8;
  font-size:12px;
}

.ticker-item strong{
  margin-left:auto;
  font-size:16px;
}

@media (max-width: 900px){
.ticker{
    grid-template-columns:repeat(2,minmax(0,1fr));
  }
}

.ticker-item{
  box-shadow:0 16px 42px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.025);
}
</style>
