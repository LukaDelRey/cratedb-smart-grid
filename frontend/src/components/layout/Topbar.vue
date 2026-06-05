<template>

<div class="topbar panel">

  <div class="left">

    <div class="top-card">
      <div class="label">
        GRID STATUS
      </div>

      <div class="green big">
        STABLE
      </div>
    </div>

    <div class="top-card">
      <div class="label">
        SYSTEM LOAD
      </div>

      <div class="big">
        82%
      </div>
    </div>

    <div class="top-card">
      <div class="label">
        BLACKOUT RISK
      </div>

      <div class="orange big">
        LOW
      </div>
    </div>

  </div>

  <div class="clock">
    {{ time }}
  </div>

</div>

</template>

<script setup>

import { ref, onMounted } from 'vue'

const time = ref('')

function updateClock(){

  const now = new Date()

  time.value =
    now.toLocaleTimeString()
}

onMounted(() => {

  updateClock()

  setInterval(updateClock,1000)
})

</script>

<style scoped>

.topbar{
  height:90px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 20px;
}

.left{
  display:flex;
  gap:20px;
}

.top-card{
  min-width:180px;
}

.label{
  font-size:12px;
  color:#90a4ae;
}

.big{
  font-size:28px;
  font-weight:700;
}

.clock{
  font-size:34px;
  font-weight:700;
}

</style>
