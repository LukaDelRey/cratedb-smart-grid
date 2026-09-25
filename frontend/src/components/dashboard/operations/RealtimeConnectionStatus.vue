<template>
  <q-card flat bordered class="connection-card row items-center justify-end q-gutter-md text-white">
    <div class="row items-center q-gutter-sm">
      <q-icon
        :name="connection.websocketConnected ? 'wifi' : 'wifi_off'"
        :color="statusColor"
        size="22px"
      />
      <div>
        <div class="text-caption text-blue-grey-3">{{ t('dashboard.realtimeFeed') }}</div>
        <div class="text-weight-bold">{{ t(connection.quality.toUpperCase()) }}</div>
      </div>
    </div>

    <q-separator vertical dark />

    <div class="status-pill">
      <span>EMQX</span>
      <strong :class="connection.mqttConnected ? 'text-positive' : 'text-negative'">
        {{ connection.mqttConnected ? t('dashboard.online') : t('dashboard.offline') }}
      </strong>
    </div>

    <div class="status-pill">
      <span>CrateDB</span>
      <strong :class="connection.crateConnected ? 'text-positive' : 'text-negative'">
        {{ connection.crateConnected ? `${connection.latencyMs} ms` : t('dashboard.down') }}
      </strong>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'
import { useI18n } from '../../../i18n'

const { t } = useI18n()

const props = defineProps({
  connection:{
    type:Object as PropType<Record<string, any>>,
    required:true
  }
})

const statusColor = computed(() => {
  if(props.connection.quality === 'excellent') return 'positive'
  if(props.connection.quality === 'degraded') return 'warning'
  return 'negative'
})
</script>

<style>
.connection-card{
  min-height:68px;
  padding:12px 18px;
  background:rgba(5,12,24,.88);
  border-color:rgba(0,229,255,.18);
  border-radius:8px;
}

@media (max-width: 760px){
.connection-card{
    justify-content:flex-start;
    flex-wrap:wrap;
  }
}
</style>
