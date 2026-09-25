<template>
  <q-drawer
    show-if-above
    :width="236"
    class="sidebar-shell text-white"
  >
    <div class="column full-height q-pa-sm">
      <div class="brand-block">
        <div class="brand-mark" aria-hidden="true"><span /></div>
        <div>
          <div class="brand-title">CrateDB</div>
          <div class="brand-subtitle">Smart Grid Platform</div>
        </div>
      </div>

      <q-list dense padding class="q-mt-md">
        <q-item
          v-for="item in navItems"
          :key="item.label"
          clickable
          :to="item.to"
          :active="item.active"
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
        v-if="showGridHealth"
        :summary="store.summary"
        :stations="store.stations"
        :connection="store.connection"
      />
    </div>
  </q-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSensorStore } from '../../../stores/sensorStore'
import GridHealthPanel from './GridHealthPanel.vue'
import { useI18n } from '../../../i18n'

const store = useSensorStore()
const route = useRoute()
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

const transformerTarget = computed(() =>
  route.path.startsWith('/transformers/')
    ? route.path
    : `/transformers/${firstTransformer.value}`
)

const showGridHealth = computed(() =>
  route.path === '/'
)

const navItems = computed(() => [
  { label:t('dashboard.dashboard'), icon:'dashboard', to:'/', active:route.path === '/' },
  { label:t('dashboard.regionTwin'), icon:'public', to:`/regions/${firstRegion.value}`, active:route.path.startsWith('/regions/') },
  { label:t('dashboard.substationTwin'), icon:'hub', to:`/substations/${firstSubstation.value}`, active:route.path.startsWith('/substations/') },
  { label:t('dashboard.transformerTwin'), icon:'memory', to:transformerTarget.value, active:route.path.startsWith('/transformers/') },
  { label:t('dashboard.alarmCenter'), icon:'warning', to:'/', active:false },
  { label:t('dashboard.aiForecasting'), icon:'psychology', to:'/', active:false }
])
</script>

<style>
.q-drawer.sidebar-shell,
.sidebar-shell .q-drawer__content{
  background:
    linear-gradient(90deg,rgba(64,196,255,.055) 1px,transparent 1px),
    linear-gradient(180deg,#071421 0%,#06101b 48%,#040912 100%) !important;
  background-size:28px 28px,auto !important;
  color:#f5fbff !important;
  border-right:1px solid rgba(91,136,174,.2);
  box-shadow:inset -1px 0 0 rgba(255,255,255,.025), 12px 0 34px rgba(0,0,0,.22);
}

.brand-block{
  display:flex;
  align-items:center;
  gap:10px;
  min-height:54px;
  padding:3px 8px 16px;
  border-bottom:1px solid rgba(255,255,255,.06);
}

.brand-mark{
  position:relative;
  width:34px;
  height:34px;
  display:grid;
  place-items:center;
}

.brand-mark::before,
.brand-mark::after,
.brand-mark span{
  content:'';
  position:absolute;
  width:22px;
  height:22px;
  border-radius:4px;
  transform:rotate(30deg) skew(-8deg);
  background:linear-gradient(135deg,#42c8ff,#1574c7);
  box-shadow:0 0 18px rgba(64,196,255,.42);
}

.brand-mark::after{
  inset:auto 0 4px auto;
  width:17px;
  height:17px;
  opacity:.62;
  background:#0b2235;
  border:1px solid rgba(91,206,255,.42);
}

.brand-mark span{
  inset:6px auto auto 5px;
  width:13px;
  height:13px;
  opacity:.72;
  background:#071421;
  box-shadow:none;
}

.brand-title{
  color:#f5fbff;
  font-size:20px;
  font-weight:900;
  line-height:1;
  letter-spacing:0;
}

.brand-subtitle{
  margin-top:3px;
  color:#b8cad8;
  font-size:11px;
  line-height:1;
}

.nav-item{
  min-height:42px;
  color:#cfe0eb;
  border:1px solid transparent;
  border-radius:5px;
  font-size:13px;
  transition:background .18s ease,color .18s ease,border-color .18s ease;
}

.nav-item .q-icon{
  color:#d5e6f0;
  font-size:20px;
}

.nav-active{
  color:#f5fbff;
  background:linear-gradient(90deg,rgba(28,128,225,.68),rgba(23,92,153,.5));
  border-color:rgba(64,196,255,.28);
  box-shadow:inset 3px 0 0 #40c4ff, 0 8px 22px rgba(0,0,0,.2);
}

.nav-active .q-icon{
  color:#40c4ff;
}

.nav-item:hover{
  color:#f5fbff;
  background:rgba(64,196,255,.09);
  border-color:rgba(64,196,255,.16);
}
</style>
