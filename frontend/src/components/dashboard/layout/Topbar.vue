<template>
  <div class="command-topbar q-px-sm q-py-xs" :class="{ 'compact-topbar': compact }">
    <div v-if="compact" class="compact-title"><slot name="breadcrumbs">{{ title }}</slot></div>
    <div v-else class="command-status-grid">
      <div
        v-for="item in topStatus"
        :key="item.label"
        class="command-status-card"
      >
        <span>{{ item.label }}</span>
        <strong :class="item.class">{{ item.value }}</strong>
        <small v-if="item.detail">{{ item.detail }}</small>

        <svg
          v-if="item.spark"
          class="status-line-chart"
          viewBox="0 0 120 24"
          preserveAspectRatio="none"
        >
          <polyline
            :points="linePoints(item.spark, 120, 24)"
            :class="['glow-line', item.chartClass]"
          />
        </svg>
      </div>
    </div>

    <div class="operator-cluster q-px-sm">
      <div class="q-mr-sm">
        <div class="operator-clock">{{ clock }}</div>
        <div class="operator-date">{{ dateLabel }}</div>
      </div>

      <q-btn
        flat
        round
        dense
        icon="notifications"
        color="blue-grey-2"
        :aria-label="t('dashboard.notifications')"
      >
        <q-badge
          v-if="store.currentAlarmCount"
          floating
          color="negative"
        >
          {{ store.currentAlarmCount }}
        </q-badge>

        <q-menu
          anchor="bottom right"
          self="top right"
          class="notification-menu"
        >
          <div class="notification-menu-head">
            <span>{{ t('dashboard.notifications') }}</span>
            <strong>{{ store.currentAlarmCount }}</strong>
          </div>

          <q-list separator>
            <q-item
              v-for="item in notificationItems"
              :key="item.id"
              clickable
              v-close-popup
              class="notification-item"
              @click="emit('openNotifications')"
            >
              <q-item-section avatar>
                <q-icon
                  :name="item.icon"
                  :color="item.color"
                  size="20px"
                />
              </q-item-section>

              <q-item-section>
                <q-item-label>{{ translateText(item.title) }}</q-item-label>
                <q-item-label caption>{{ item.detail }}</q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-badge :color="item.color">
                  {{ translateStatus(item.severity) }}
                </q-badge>
              </q-item-section>
            </q-item>

            <q-item v-if="!notificationItems.length" class="notification-empty">
              <q-item-section>
                <q-item-label>{{ t('dashboard.noActiveAlarmsOrEvents') }}</q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-close-popup
              class="notification-view-all"
              @click="emit('openNotifications')"
            >
              <q-item-section>
                <q-item-label>{{ t('dashboard.viewAll') }}</q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-icon name="arrow_forward" color="cyan" size="18px" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>

      <q-btn
        flat
        round
        dense
        icon="account_tree"
        color="cyan"
        :aria-label="t('dashboard.openSystemTopology')"
        @click="emit('openTopology')"
      />

      <q-btn-dropdown
        flat
        dense
        no-caps
        icon="translate"
        color="blue-grey-2"
        class="language-switcher"
        :label="currentLanguageOption.shortLabel"
        :aria-label="t('dashboard.changeLanguage')"
      >
        <q-list dense class="language-menu">
          <q-item
            v-for="option in languageOptions"
            :key="option.code"
            clickable
            v-close-popup
            :active="language === option.code"
            active-class="language-active"
            @click="setLanguage(option.code)"
          >
            <q-item-section>
              <q-item-label>{{ option.label }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDashboardTopbar } from '../../../composables/useDashboardTopbar'

defineProps<{ compact?: boolean; title?: string }>()

const emit = defineEmits(['openTopology', 'openNotifications'])
const {
  clock,
  currentLanguageOption,
  dateLabel,
  language,
  languageOptions,
  linePoints,
  notificationItems,
  setLanguage,
  store,
  t,
  topStatus,
  translateStatus,
  translateText
} = useDashboardTopbar()
</script>

<style scoped>
.command-topbar{
  min-height:58px;
  display:grid;
  grid-template-columns:minmax(0,1fr) 350px;
  gap:10px;
  align-items:center;
}

.command-status-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:8px;
  min-width:0;
}

.command-topbar.compact-topbar{
  padding:0 24px;
  border-bottom:1px solid rgba(91,136,174,.18);
  background:linear-gradient(180deg,rgba(5,13,24,.92),rgba(5,13,24,.78));
  box-shadow:0 10px 28px rgba(0,0,0,.22);
}

.compact-title{
  color:#f5fbff;
  font-size:16px;
  font-weight:800;
}

.command-status-card{
  min-height:42px;
  position:relative;
  overflow:hidden;
  padding:7px 9px;
  border:1px solid rgba(120,180,220,.16);
  border-radius:6px;
  background:linear-gradient(180deg,rgba(11,22,34,.92),rgba(4,10,18,.92));
}

.command-status-card span,
.command-status-card small{
  display:block;
  color:#8ba7b6;
  font-size:10px;
  line-height:1.2;
  text-transform:uppercase;
}

.command-status-card strong{
  display:inline-block;
  margin-top:3px;
  font-size:16px;
  line-height:1.05;
  font-weight:900;
}

.command-status-card small{
  display:inline-block;
  margin-left:8px;
  color:#c5d7e0;
  text-transform:none;
}

.status-line-chart{
  position:absolute;
  right:8px;
  bottom:6px;
  width:86px;
  height:18px;
  opacity:.95;
}

.glow-line{
  fill:none;
  stroke-width:2.4;
  stroke-linecap:round;
  stroke-linejoin:round;
  vector-effect:non-scaling-stroke;
}

.glow-line.normal{
  stroke:#42c8ff;
  filter:drop-shadow(0 0 5px rgba(66,200,255,.75));
}

.glow-line.warning{
  stroke:#ffb238;
  filter:drop-shadow(0 0 5px rgba(255,178,56,.75));
}

.glow-line.critical{
  stroke:#ff4d5e;
  filter:drop-shadow(0 0 5px rgba(255,77,94,.85));
}

.operator-cluster{
  width:100%;
  min-width:0;
  display:flex;
  justify-content:flex-end;
  align-items:center;
  gap:10px;
}

.language-switcher{
  min-height:30px;
  padding:0 6px;
  border:1px solid rgba(120,180,220,.16);
  border-radius:7px;
  background:rgba(6,16,30,.58);
  font-size:11px;
}

.language-menu{
  min-width:132px;
  color:#f5fbff;
  background:#07111f;
}

:global(.notification-menu){
  width:min(390px, calc(100vw - 24px));
  color:#f5fbff;
  background:#07111f !important;
  border:1px solid rgba(64,196,255,.22);
  border-radius:8px;
  box-shadow:0 18px 44px rgba(0,0,0,.42),0 0 24px rgba(64,196,255,.14);
}

:global(.notification-menu .q-list){
  color:#f5fbff;
  background:transparent;
}

:global(.notification-menu .q-item){
  color:#f5fbff;
  background:#07111f;
}

:global(.notification-menu .q-item:hover){
  background:rgba(64,196,255,.1);
}

:global(.notification-menu-head){
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  padding:10px 12px;
  border-bottom:1px solid rgba(255,255,255,.07);
}

:global(.notification-menu-head span){
  color:#e9eff1;
  font-size:12px;
  font-weight:800;
  text-transform:uppercase;
}

:global(.notification-menu-head strong){
  color:#ff4d5e;
  font-size:18px;
  font-weight:900;
}

:global(.notification-item){
  min-height:58px;
}

:global(.notification-item .q-item__label){
  color:#f5fbff;
  font-size:12px;
  font-weight:700;
}

:global(.notification-item .q-item__label--caption),
:global(.notification-empty .q-item__label){
  color:#8fa9b8;
  font-size:11px;
}

:global(.notification-view-all){
  color:#40c4ff;
  font-size:12px;
  font-weight:800;
  text-transform:uppercase;
}

.language-active{
  color:#40c4ff;
  background:rgba(64,196,255,.14);
}

.operator-clock{
  font-size:20px;
  font-weight:800;
  color:#f5fbff;
  font-variant-numeric:tabular-nums;
}

.operator-date{
  color:#8fa9b8;
  font-size:11px;
}

@media (max-width: 1320px){
  .command-topbar{
    grid-template-columns:1fr;
  }

  .operator-cluster{
    justify-content:start;
  }
}

@media (max-width: 820px){
  .command-status-grid{
    grid-template-columns:1fr;
  }

  .operator-cluster{
    justify-content:space-between;
  }
}
</style>
