<template>
  <q-card flat bordered class="scada-card" style="height: 365px">
    <q-card-section class="row items-center justify-between q-pb-sm">
      <div>
        <div class="section-kicker-light">{{ t('dashboard.predictiveGridInsights') }}</div>
      </div>

      <q-icon name="psychology" color="cyan" size="28px" />
    </q-card-section>

    <q-list dense class="q-px-sm q-pb-sm panel-scroll-list">
      <q-item
        v-for="item in insights"
        :key="item.id"
        class="scada-list-item "
      >
        <q-item-section avatar>
          <q-avatar
            size="34px"
            :color="severityColor(item.severity)"
            text-color="white"
            :icon="severityIcon(item.type)"
          />
        </q-item-section>

        <q-item-section>
          <q-item-label class="text-weight-bold">
            {{ translateText(item.title) }}
          </q-item-label>
          <q-item-label caption class="text-blue-grey-3">
            {{ item.assetId }} - {{ translateText(item.impact) }}
          </q-item-label>
          <q-item-label caption class="text-blue-grey-4">
            {{ translateText(item.recommendation) }}
          </q-item-label>
        </q-item-section>

        <q-item-section side>
          <q-circular-progress
            show-value
            size="42px"
            :value="item.confidence"
            color="cyan"
            track-color="blue-grey-10"
            class="text-cyan text-caption"
          >
            {{ item.confidence }}%
          </q-circular-progress>
        </q-item-section>
      </q-item>
    </q-list>
  </q-card>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { useI18n } from '../../../i18n'

const { t, translateText } = useI18n()

defineProps({
  insights:{
    type:Array as PropType<any[]>,
    default:() => []
  }
})

function severityColor(severity){
  if(severity === 'CRITICAL') return 'negative'
  if(severity === 'WARNING') return 'warning'
  return 'info'
}

function severityIcon(type){
  if(type === 'cooling') return 'device_thermostat'
  if(type === 'maintenance') return 'build'
  return 'bolt'
}
</script>

