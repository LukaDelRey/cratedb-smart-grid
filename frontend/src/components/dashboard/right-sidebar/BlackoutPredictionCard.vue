<template>
  <q-card flat bordered class="scada-card" style="height: 165px">
    <q-card-section class="row items-center justify-between q-pb-none">
      <div>
        <div class="section-kicker-light">{{ t('dashboard.blackoutPrediction') }}</div>
      </div>

      <div class="text-subtitle1 text-weight-bold" :class="riskColor">
        {{ riskLabel }}
      </div>
    </q-card-section>

    <q-card-section class="no-padding q-pb-md q-px-lg row items-center">
      <div class="col-5 q-pl-lg q-pb-md">
        <div class="row items-center">
          <q-circular-progress
            show-value
            size="90px"
            :thickness="0.15"
            :value="prediction.probability"
            :color="riskColor"
            track-color="blue-grey-10"
            class="text-white text-weight-bold"
          >
            {{ prediction.probability }}%
          </q-circular-progress>
        </div>
      </div>

      <div class="col-7 q-pr-lg q-pb-md">
        <div class="row items-center q-py-xs">
          <div class="col-8">
            <div class="text-caption text-blue-grey-3">{{ t('dashboard.cascadeProbability') }}</div>
          </div>
          <div class="col-4">
            <div class="row justify-end items-center text-caption text-weight-medium">
              {{ prediction.probability }}%
            </div>
          </div>
        </div>
        <div class="row items-center q-py-xs">
          <div class="col-8">
            <div class="text-caption text-blue-grey-3">{{ t('dashboard.affectedAssets') }}</div>
          </div>
          <div class="col-4">
            <div class="row justify-end items-center text-caption text-weight-medium">
              {{ prediction.affectedStations }}
            </div>
          </div>
        </div>
        <div class="row items-center q-py-xs">
          <div class="col-8">
            <div class="text-caption text-blue-grey-3">{{ t('dashboard.expectedWindow') }}</div>
          </div>
          <div class="col-4">
            <div class="row justify-end items-center text-caption text-weight-medium">
              {{ prediction.estimatedMinutes }} min
            </div>
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>


<script setup>
import { computed } from 'vue'
import { useI18n } from '../../../i18n'

const { t } = useI18n()

const props = defineProps({
  prediction:{
    type:Object,
    required:true
  },
  topRisk:{
    type:Array,
    default:() => []
  }
})

const riskLabel = computed(() => {
  if(props.prediction.probability >= 70) return t('dashboard.criticalUpper')
  if(props.prediction.probability >= 35) return t('dashboard.warning')
  return t('dashboard.lowRisk')
})

const riskColor = computed(() => {
  if(props.prediction.probability >= 70) return 'red'
  if(props.prediction.probability >= 35) return 'orange'
  return 'green'
})
</script>

<style>
.green{
  color:#21BA45;
}

.orange{
  color:#ffad2f;
}

.red{
  color:#C10015;
}
</style>
