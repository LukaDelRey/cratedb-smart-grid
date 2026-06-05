<template>

<div class="sidebar">

  <div class="logo">

    <div class="brand">
      ⚡ SMART GRID
    </div>

    <div class="sub">
      Command Center
    </div>

  </div>

  <div class="menu">

    <div class="item active">
      Dashboard
    </div>

    <div class="item">
      Grid Map
    </div>

    <div class="item">
      Analytics
    </div>

    <div class="item">
      AI Forecasting
    </div>

    <div class="item">
      Alarm Center
    </div>

    <div class="item">
      Digital Twin
    </div>

  </div>

  <div class="status panel">

    <div class="panel-title">
      GRID HEALTH
    </div>

    <div class="health">
      87
    </div>

    <div class="green">
      Stable
    </div>

  </div>

</div>

</template>

<style scoped>

.sidebar{
  width:260px;
  height:100vh;
  background:#07111f;
  border-right:1px solid rgba(255,255,255,.05);
  display:flex;
  flex-direction:column;
  padding:20px;
  gap:24px;
}

.logo{
  padding:10px 0 30px;
}

.brand{
  font-size:28px;
  font-weight:800;
  color:#42a5f5;
}

.sub{
  color:#9fb3c8;
  margin-top:4px;
}

.menu{
  display:flex;
  flex-direction:column;
  gap:8px;
}

.item{
  padding:14px;
  border-radius:12px;
  cursor:pointer;
  color:#cfd8dc;
}

.item:hover{
  background:rgba(255,255,255,.05);
}

.active{
  background:
    linear-gradient(
      90deg,
      rgba(66,165,245,.22),
      transparent
    );
  color:#42a5f5;
}

.status{
  margin-top:auto;
  padding:20px;
}

.health{
  font-size:64px;
  font-weight:700;
}

</style>
