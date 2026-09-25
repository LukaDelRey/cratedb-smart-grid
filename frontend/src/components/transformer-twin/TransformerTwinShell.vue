<template>
  <q-layout view="lHh Lpr lFf" class="tt-layout">
    <Sidebar />

    <q-page-container>
      <q-page class="tt-page">
      <TransformerTwinTopbar
        :transformer="transformer"
        :station="station"
        :active-section="activeSection"
        :last-update="lastUpdate"
      />
      <slot />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import Sidebar from '../dashboard/layout/Sidebar.vue'
import TransformerTwinTopbar from './TransformerTwinTopbar.vue'

defineProps({
  transformer:{
    type:Object,
    default:null
  },
  station:{
    type:Object,
    default:null
  },
  activeAlarms:{
    type:Number,
    default:0
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
</script>

<style scoped>
.tt-layout{
  color:#f5fbff;
  background:
    radial-gradient(circle at 38% 0%, rgba(40,151,245,.2), transparent 28%),
    radial-gradient(circle at 78% 12%, rgba(49,240,166,.08), transparent 24%),
    linear-gradient(135deg,#030912 0%,#071421 48%,#040a12 100%);
}

.tt-page{
  position:relative;
  height:100vh;
  min-height:0;
  display:flex;
  flex-direction:column;
  overflow:hidden;
  color:#f5fbff;
  background:
    linear-gradient(90deg, rgba(49,157,255,.045) 1px, transparent 1px),
    linear-gradient(0deg, rgba(49,157,255,.035) 1px, transparent 1px),
    radial-gradient(circle at 34% -6%, rgba(38,151,255,.2), transparent 34%),
    linear-gradient(135deg,#030912 0%,#081522 50%,#050b13 100%);
  background-size:32px 32px,32px 32px,auto,auto;
}

.tt-page::before{
  content:'';
  position:absolute;
  inset:0;
  pointer-events:none;
  background:
    linear-gradient(180deg,rgba(255,255,255,.035),transparent 78px),
    radial-gradient(circle at 50% 42%, transparent 0 45%, rgba(2,8,15,.34) 100%);
}

.tt-page > *{
  position:relative;
  z-index:1;
}

@media (max-width: 980px){
  .tt-page{
    height:auto;
    min-height:100vh;
    overflow:visible;
  }
}
</style>
