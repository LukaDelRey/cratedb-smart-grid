<template>
  <div class="twin-header">
    <div class="row items-center q-gutter-md">
      <q-btn
        flat
        round
        icon="arrow_back"
        color="blue-grey-2"
        to="/"
      />

      <q-avatar color="cyan" text-color="black" :icon="icon" />

      <div>
          <div class="section-kicker">{{ assetId || t('dashboard.loadingAssetData') }}</div>
          <div class="text-h4 text-weight-bold">{{ translateText(title) }}</div>
      </div>
    </div>

    <div class="row q-gutter-sm">
      <q-chip color="positive" text-color="white" icon="health_and_safety">
        {{ t('dashboard.health') }} {{ health ?? 0 }}%
      </q-chip>
      <q-chip color="negative" text-color="white" icon="crisis_alert">
        {{ t('dashboard.risk') }} {{ risk ?? 0 }}%
      </q-chip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../i18n'

const { t, translateText } = useI18n()

defineProps({
  title:{
    type:String,
    required:true
  },
  assetId:{
    type:String,
    default:'Asset'
  },
  health:{
    type:Number,
    default:0
  },
  risk:{
    type:Number,
    default:0
  },
  icon:{
    type:String,
    default:'hub'
  }
})
</script>

<style>
.twin-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:18px;
  margin-bottom:0;
}

@media (max-width: 760px){
.twin-header{
    align-items:stretch;
    flex-direction:column;
  }
}
</style>
