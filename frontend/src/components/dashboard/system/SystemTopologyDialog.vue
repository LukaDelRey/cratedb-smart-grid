<template>
  <q-dialog v-model="dialog">
    <q-card class="topology-dialog text-white">
      <q-card-section class="row items-center justify-between q-pa-md">
        <div>
          <div class="section-kicker-light">{{ t('dashboard.systemTopology') }}</div>
        </div>

        <q-btn flat round dense icon="close" v-close-popup />
      </q-card-section>

      <q-card-section class="q-pa-md q-pt-none">
        <div class="topology-score">
          <q-circular-progress
            show-value
            size="90px"
            :value="topology.platformHealth"
            color="positive"
            track-color="blue-grey-10"
            class="text-white text-weight-bold"
          >
            {{ topology.platformHealth }}%
          </q-circular-progress>
          <div>
            <div class="text-h6">{{ t('dashboard.overallPlatformHealth') }}</div>
            <div class="text-blue-grey-3">
              {{ t('dashboard.locustEmqxFastapiCratedbAndVueDashboardStatus') }}
            </div>
          </div>
        </div>

        <div class="realtime-health-grid q-mt-md">
          <div
            v-for="item in realtimeItems"
            :key="item.label"
            class="realtime-health-tile"
          >
            <q-icon :name="item.icon" :color="item.color" size="22px" />
            <span>{{ item.label }}</span>
            <strong :class="`text-${item.color}`">{{ item.value }}</strong>
          </div>
        </div>

        <q-banner
          v-if="lastError"
          rounded
          dense
          class="topology-warning q-mt-md"
        >
          <template #avatar>
            <q-icon name="warning" color="warning" />
          </template>
          {{ lastError }}
        </q-banner>

        <div class="topology-grid q-mt-lg">
          <div
            v-for="node in topology.nodes"
            :key="node.id"
            class="topology-node"
          >
            <q-icon :name="nodeIcon(node.id)" color="cyan" size="26px" />
            <div>
              <strong>{{ translateText(node.label) }}</strong>
              <span>{{ translateText(node.metric) }}</span>
            </div>
            <q-badge :color="node.status === 'online' ? 'positive' : 'negative'">
              {{ translateStatus(node.status) }}
            </q-badge>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'
import { useI18n } from '../../../i18n'

const { t, translateText, translateStatus } = useI18n()

const props = defineProps({
  modelValue:{
    type:Boolean,
    default:false
  },
  topology:{
    type:Object as PropType<Record<string, any>>,
    required:true
  },
  connection:{
    type:Object as PropType<Record<string, any>>,
    default:() => ({
      websocketConnected:false,
      crateConnected:false,
      mqttConnected:false,
      latencyMs:0,
      messagesPerSecond:0,
      lastEventAt:null,
      quality:'offline'
    })
  },
  lastError:{
    type:String,
    default:null
  }
})

const emit = defineEmits(['update:modelValue'])

const dialog = computed({
  get:() => props.modelValue,
  set:value => emit('update:modelValue', value)
})

const realtimeItems = computed(() => [
  {
    label:t('dashboard.realtimeFeed'),
    value:t(props.connection.quality?.toUpperCase?.() || 'OFFLINE'),
    icon:props.connection.websocketConnected ? 'wifi' : 'wifi_off',
    color:props.connection.websocketConnected ? 'positive' : 'negative'
  },
  {
    label:'EMQX',
    value:props.connection.mqttConnected ? t('dashboard.online') : t('dashboard.offline'),
    icon:'router',
    color:props.connection.mqttConnected ? 'positive' : 'negative'
  },
  {
    label:'CrateDB',
    value:props.connection.crateConnected ? `${props.connection.latencyMs} ms` : t('dashboard.down'),
    icon:'storage',
    color:props.connection.crateConnected ? 'positive' : 'warning'
  },
  {
    label:t('dashboard.eventRate'),
    value:`${props.connection.messagesPerSecond || 0}/s`,
    icon:'stream',
    color:'cyan'
  },
  {
    label:t('dashboard.lastEvent'),
    value:lastEventLabel.value,
    icon:'schedule',
    color:'blue-grey-3'
  }
])

const lastEventLabel = computed(() => {
  if(!props.connection.lastEventAt) return t('dashboard.noEvents')

  return new Date(props.connection.lastEventAt).toLocaleTimeString([], {
    hour:'2-digit',
    minute:'2-digit',
    second:'2-digit'
  })
})

function nodeIcon(id){
  if(id === 'cratedb') return 'storage'
  if(id === 'emqx') return 'router'
  if(id === 'fastapi') return 'api'
  if(id === 'dashboard') return 'dashboard'
  return 'memory'
}
</script>

<style>
.topology-dialog{
  width:min(820px, calc(100vw - 32px));
  background:#07111f;
  border:1px solid rgba(0,229,255,.2);
  border-radius:8px;
}

.topology-score{
  display:grid;
  grid-template-columns:100px 1fr;
  gap:18px;
  align-items:center;
}

.topology-grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:12px;
}

.topology-node{
  display:grid;
  grid-template-columns:32px 1fr auto;
  gap:12px;
  align-items:center;
  padding:14px;
  border:1px solid rgba(255,255,255,.07);
  border-radius:8px;
  background:rgba(255,255,255,.03);
}

.topology-node span{
  display:block;
  color:#8fa9b8;
  font-size:12px;
}

@media (max-width: 680px){
.topology-grid{
    grid-template-columns:1fr;
  }
}

.realtime-health-grid{
  display:grid;
  grid-template-columns:repeat(5,minmax(0,1fr));
  gap:8px;
}

.realtime-health-tile{
  min-width:0;
  display:grid;
  grid-template-columns:24px 1fr;
  gap:3px 8px;
  padding:10px;
  border:1px solid rgba(255,255,255,.08);
  border-radius:8px;
  background:rgba(255,255,255,.03);
}

.realtime-health-tile span,
.realtime-health-tile strong{
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.realtime-health-tile span{
  color:#8fa9b8;
  font-size:11px;
}

.realtime-health-tile strong{
  grid-column:2;
  color:#f5fbff;
  font-size:13px;
}

.topology-warning{
  color:#ffe9b0;
  background:rgba(255,152,0,.12);
  border:1px solid rgba(255,152,0,.24);
}
</style>
