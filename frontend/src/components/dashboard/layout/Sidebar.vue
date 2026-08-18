<template>
  <q-drawer
    show-if-above
    :width="236"
    class="sidebar-shell text-white"
  >
    <div class="column full-height q-pa-sm">
      <div class="brand-block">
        <div class="brand-mark">SG</div>
        <div>
          <div class="text-h6 text-weight-bold">SMART GRID</div>
          <div class="text-caption text-blue-grey-3">{{ t('dashboard.commandCenter') }}</div>
        </div>
      </div>

      <q-list dense padding class="q-mt-md">
        <q-item
          v-for="item in navItems"
          :key="item.label"
          clickable
          :to="item.to"
          class="nav-item rounded-borders q-mb-sm"
          active-class="nav-active"
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" />
          </q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
        </q-item>
      </q-list>

      <q-space />

      <GridHealthPanel
        :summary="store.summary"
        :stations="store.stations"
        :connection="store.connection"
      />
    </div>
  </q-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { useSensorStore } from '../../../stores/sensorStore'
import GridHealthPanel from './GridHealthPanel.vue'
import { useI18n } from '../../../i18n'

const store = useSensorStore()
const { t } = useI18n()

const firstRegion = computed(() =>
  store.regions[0]?.id || 'REGION-NORTH'
)

const firstSubstation = computed(() =>
  store.stations[0]?.station_id || 'TS-001'
)

const firstTransformer = computed(() =>
  store.transformers[0]?.id || 'TR-001'
)

const navItems = computed(() => [
  { label:t('dashboard.dashboard'), icon:'dashboard', to:'/' },
  { label:t('dashboard.regionTwin'), icon:'public', to:`/regions/${firstRegion.value}` },
  { label:t('dashboard.substationTwin'), icon:'hub', to:`/substations/${firstSubstation.value}` },
  { label:t('dashboard.transformerTwin'), icon:'memory', to:`/transformers/${firstTransformer.value}` },
  { label:t('dashboard.alarmCenter'), icon:'warning', to:'/' },
  { label:t('dashboard.aiForecasting'), icon:'psychology', to:'/' }
])
</script>

<style>
.q-drawer.sidebar-shell,
.sidebar-shell .q-drawer__content{
  background:
    linear-gradient(180deg,#07111f 0%,#050b14 100%) !important;
  color:#f5fbff !important;
}

.brand-block{
  display:flex;
  align-items:center;
  gap:12px;
  padding:8px 0 20px;
}

.brand-mark{
  width:42px;
  height:42px;
  display:grid;
  place-items:center;
  border-radius:8px;
  color:#001219;
  font-weight:900;
  background:linear-gradient(135deg,#3ff5d4,#40c4ff);
}

.nav-item{
  color:#cfe8f3;
}

.nav-active{
  background:rgba(64,196,255,.15);
  color:#40c4ff;
}
</style>
