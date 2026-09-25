<template>
  <header class="tt-topbar">
    <div class="breadcrumbs">
      <span>{{ stationName }}</span>
      <q-icon name="chevron_right" size="18px" />
      <span>{{ transformer?.id || 'TR-01' }}</span>
      <q-icon name="chevron_right" size="18px" />
      <strong>{{ activeSection }}</strong>
    </div>

    <div class="topbar-actions">
      <span class="online-pill"><i /> Online</span>
      <span class="clock">{{ lastUpdate }}</span>
      <q-btn flat round dense icon="notifications" color="blue-grey-3">
        <q-badge color="negative" floating>12</q-badge>
      </q-btn>
      <q-btn flat round dense icon="help_outline" color="blue-grey-3" />
      <q-btn flat round dense icon="light_mode" color="blue-grey-3" />
      <span class="admin">admin</span>
      <q-icon name="keyboard_arrow_down" size="18px" />
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  transformer:{
    type:Object,
    default:null
  },
  station:{
    type:Object,
    default:null
  },
  activeSection:{
    type:String,
    default:'Overview'
  },
  lastUpdate:{
    type:String,
    default:'14:32:18'
  }
})

const stationName = computed(() =>
  props.station?.station_name || props.transformer?.substation || 'Substation 110/20kV'
)
</script>

<style scoped>
.tt-topbar{
  min-height:58px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:18px;
  padding:0 24px;
  border-bottom:1px solid rgba(91,136,174,.18);
  background:
    linear-gradient(180deg,rgba(5,13,24,.92),rgba(5,13,24,.78));
  box-shadow:0 10px 28px rgba(0,0,0,.22);
  backdrop-filter:blur(16px);
}

.breadcrumbs,
.topbar-actions{
  display:flex;
  align-items:center;
  gap:14px;
  min-width:0;
}

.breadcrumbs{
  color:#b8c8d5;
  font-size:14px;
  letter-spacing:0;
}

.breadcrumbs strong{
  color:#f5fbff;
  font-size:16px;
  font-weight:800;
}

.online-pill{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:4px 14px;
  border:1px solid rgba(113,242,63,.26);
  border-radius:999px;
  color:#71f23f;
  font-weight:700;
  background:rgba(113,242,63,.06);
}

.online-pill i{
  width:7px;
  height:7px;
  border-radius:50%;
  background:#71f23f;
  box-shadow:0 0 12px rgba(113,242,63,.86);
}

.clock,
.admin{
  color:#d7e4ee;
}

.clock{
  padding:0 18px;
  border-left:1px solid rgba(255,255,255,.08);
  border-right:1px solid rgba(255,255,255,.08);
  font-variant-numeric:tabular-nums;
}

.topbar-actions :deep(.q-btn){
  color:#c8d8e4 !important;
}

.topbar-actions :deep(.q-btn:hover){
  color:#40c4ff !important;
  background:rgba(64,196,255,.08) !important;
}

@media (max-width: 760px){
  .tt-topbar{
    align-items:flex-start;
    flex-direction:column;
    padding:14px;
  }

  .topbar-actions{
    flex-wrap:wrap;
  }
}
</style>
