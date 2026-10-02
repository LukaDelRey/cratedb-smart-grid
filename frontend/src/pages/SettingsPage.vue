<template>
  <q-layout view="lHh Lpr lFf">
    <Sidebar />
    <q-page-container><q-page class="page-shell settings-page">
      <Topbar compact @open-topology="topologyOpen = true" @open-notifications="router.push('/alarms')">
        <template #breadcrumbs>
          <q-breadcrumbs class="settings-breadcrumbs" active-color="blue-grey-3">
            <template #separator><q-icon name="chevron_right" size="18px" /></template>
            <q-breadcrumbs-el :label="t('dashboard.dashboard')" to="/" />
            <q-breadcrumbs-el :label="t('settings.title')" @click="tab = 'values'" class="cursor-pointer" />
            <q-breadcrumbs-el :label="activeTabLabel" />
          </q-breadcrumbs>
        </template>
      </Topbar>
      <header class="settings-header">
        <div class="settings-header-icon"><q-icon name="tune" size="30px" /></div>
        <div><div class="section-kicker">{{ t('settings.kicker') }}</div><h1>{{ t('settings.title') }}</h1><p>{{ t('workspaceCopy.customizeGridThresholdsYourDashboardAndPersonal') }}</p></div>
      </header>
      <div class="settings-workspace">
        <aside class="settings-tabs">
          <q-tabs v-model="tab" vertical>
            <q-tab v-for="item in tabs" :key="item.name" :name="item.name" :icon="item.icon" :label="item.label" :ripple="false" />
          </q-tabs>
        </aside>
        <q-tab-panels v-model="tab" keep-alive class="settings-panels">
          <q-tab-panel name="values"><ThresholdValuesPanel /></q-tab-panel>
          <q-tab-panel name="display"><WorkspacePreferencesPanel section="display" /></q-tab-panel>
          <q-tab-panel name="notifications"><WorkspacePreferencesPanel section="notifications" /></q-tab-panel>
          <q-tab-panel name="general">
            <section class="preferences-panel scada-card">
              <h2>{{ t('settings.general') }}</h2>
              <p>{{ t('settings.generalDescription') }}</p>
              <section class="preference-group">
              <h3>{{ t('settings.language') }}</h3>
              <div class="preference-row">
                <div><strong>{{ t('settings.language') }}</strong><p>{{ t('settings.languageDescription') }}</p></div>
                <q-select dark outlined dense :model-value="language" :options="languageOptions" option-value="code" option-label="label" emit-value map-options :label="t('settings.language')" @update:model-value="setLanguage" class="language-select" />
              </div>
              </section>
              <div class="preference-note"><q-icon name="check_circle" color="cyan" />{{ t('settings.autoSaved') }}</div>
            </section>
          </q-tab-panel>
        </q-tab-panels>
      </div>
      <SystemTopologyDialog v-model="topologyOpen" :topology="store.topology" :connection="store.connection" :last-error="store.error" />
    </q-page></q-page-container>
  </q-layout>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from '../components/dashboard/layout/Sidebar.vue'
import Topbar from '../components/dashboard/layout/Topbar.vue'
import SystemTopologyDialog from '../components/dashboard/system/SystemTopologyDialog.vue'
import ThresholdValuesPanel from '../components/settings/ThresholdValuesPanel.vue'
import WorkspacePreferencesPanel from '../components/settings/WorkspacePreferencesPanel.vue'
import { useSensorStore } from '../stores/sensorStore'
import { useI18n } from '../i18n'
const store = useSensorStore(), router = useRouter(), { t, language, languageOptions, setLanguage } = useI18n()
const tab = ref('values'), topologyOpen = ref(false)
const tabs = computed(() => [
  { name:'values', icon:'tune', label:t('settings.values') },
  { name:'display', icon:'dashboard_customize', label:t('workspaceCopy.dashboardDisplay') },
  { name:'notifications', icon:'notifications', label:t('dashboard.notifications') },
  { name:'general', icon:'language', label:t('settings.general') }
])
const activeTabLabel = computed(() => tabs.value.find(item => item.name === tab.value)?.label || '')
onMounted(() => { void (store.stations.length ? store.refreshAll() : store.start()) })
</script>
<style scoped>
.settings-page{
  display:grid;
  grid-template-rows:auto auto minmax(0,1fr);
  gap:12px;
  overflow:hidden;
}
.settings-header{display:flex;align-items:center;gap:18px;width:100%;max-width:1380px;margin:0 auto;padding:20px 24px;border:1px solid rgba(64,196,255,.16);border-radius:12px;background:linear-gradient(115deg,rgba(20,48,68,.6),rgba(7,18,30,.8));box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}
.settings-header-icon{display:grid;place-items:center;flex:0 0 56px;height:56px;border:1px solid rgba(65,201,255,.22);border-radius:14px;background:rgba(65,201,255,.08);color:#41c9ff}
.section-kicker{color:#67c7e8;font-size:10px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase}
.settings-header h1{font-size:30px;font-weight:700;line-height:1.2;color:#f1f7fc;margin:4px 0 6px}
.settings-header p{font-size:13px;line-height:1.5;color:#9ab3c6;margin:0}
.settings-workspace{display:grid;grid-template-columns:230px minmax(0,1fr);gap:30px;min-height:0;overflow:hidden;width:100%;max-width:1380px;margin:0 auto}
.settings-tabs{padding-top:12px}
.settings-tabs :deep(.q-tabs){height:auto}
.settings-tabs :deep(.q-tabs__content){display:flex !important;flex-direction:column;height:auto;gap:6px}
.settings-tabs :deep(.q-tab){
  min-height:52px;padding:0 14px;border:1px solid transparent;border-radius:9px;
  background:transparent;color:#8fa8bb;opacity:1;justify-content:flex-start;
  transition:background-color .18s ease,border-color .18s ease,color .18s ease;
}
.settings-tabs :deep(.q-tab:hover){background:rgba(126,170,201,.07);color:#e2edf5;border-color:rgba(126,170,201,.1)}
.settings-tabs :deep(.q-tab--active){
  color:#fff;background:rgba(64,196,255,.09);border-color:rgba(64,196,255,.18);
  box-shadow:inset 3px 0 0 #40c4ff;
}
.settings-tabs :deep(.q-tab--active:hover){background:rgba(64,196,255,.12);border-color:rgba(64,196,255,.25)}
.settings-tabs :deep(.q-tab__icon){font-size:20px;color:#7695ab;transition:color .18s ease,transform .18s ease}
.settings-tabs :deep(.q-tab:hover .q-tab__icon){color:#b8d8e9;transform:translateY(-1px)}
.settings-tabs :deep(.q-tab--active .q-tab__icon){color:#40c4ff}
.settings-tabs :deep(.q-tab--active .q-tab__label){font-weight:600}
.settings-tabs :deep(.q-tab__indicator){display:none}
.settings-tabs :deep(.q-tab .q-focus-helper){display:none}
.settings-tabs :deep(.q-tab:focus-visible){outline:2px solid #40c4ff;outline-offset:-2px}
.settings-tabs :deep(.q-tab__content){align-items:center;justify-content:flex-start;width:100%}
.settings-tabs :deep(.q-tab__label){white-space:normal;text-align:left}
.settings-breadcrumbs{font-size:14px;font-weight:400;color:#b8c8d5}
.settings-breadcrumbs :deep(.q-breadcrumbs--last){color:#f5fbff;font-weight:700}
.preferences-panel{padding:28px;border:1px solid #223a4e;border-radius:12px}
.preferences-panel h2{margin:0 0 10px;font-size:23px;color:#edf6ff}
.preferences-panel p{color:#92aabd;font-size:13px;line-height:1.6;margin:6px 0}
.preference-row{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:24px 0;border-bottom:1px solid #203447}
.preference-row strong{font-size:14px;color:#dce7ef}
.language-select{width:180px;flex-shrink:0}
.preference-note{display:flex;align-items:center;gap:8px;margin-top:20px;color:#8faabd;font-size:12px}
.settings-tabs :deep(.q-tab__content){flex-direction:row;gap:10px}
.settings-tabs :deep(.q-tab__label){font-size:13px;text-transform:none}
.settings-tabs p{font-size:11px;color:#7693a9;padding:0 18px}
.default-assurance{display:flex;align-items:center;gap:10px;border-top:1px solid #1c3246;margin-top:32px;padding:20px 10px;color:#8da9bb;font-size:12px;line-height:1.6}
.settings-panels{min-height:0;height:100%;background:transparent;overflow:hidden}
.settings-panels :deep(.q-tab-panel){padding:0;height:100%;overflow:hidden;animation:settings-panel-enter .2s ease-out}
.settings-panels :deep(.scada-card:not(.reset-dialog)){
  height:100%;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:#365f76 transparent;scrollbar-gutter:stable;
  border:1px solid #223a4e;border-radius:12px;background:linear-gradient(130deg,#0c1b2a,#07121e);
}
.settings-panels :deep(.threshold-group),.settings-panels :deep(.preference-group){
  margin:28px 0 0;padding:20px;border:1px solid rgba(91,156,194,.2);border-radius:10px;background:rgba(3,10,18,.25);
}
.settings-panels :deep(.threshold-group){margin:28px}
.settings-panels :deep(.threshold-group h3),.settings-panels :deep(.preference-group h3){
  display:flex;align-items:center;gap:9px;margin:0 0 14px;padding-left:12px;border-left:3px solid #41c9ff;
  font-size:20px;line-height:1.3;font-weight:700;color:#edf7ff;
}
.settings-panels :deep(.threshold-row),.settings-panels :deep(.preference-group .preference-row){padding:16px 4px;border-top:1px solid #203447;border-bottom:0}
.settings-panels :deep(.threshold-label strong),.settings-panels :deep(.preference-row strong){font-size:14px;font-weight:500;color:#c3d4e0}
@keyframes settings-panel-enter{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
@media(prefers-reduced-motion:reduce){
  .settings-tabs :deep(.q-tab),.settings-tabs :deep(.q-tab__icon){transition:none}
  .settings-tabs :deep(.q-tab:hover .q-tab__icon){transform:none}
  .settings-panels :deep(.q-tab-panel){animation:none}
}
@media(max-width:900px){
  .settings-workspace{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr);gap:12px}
  .default-assurance,.settings-tabs p{display:none}
  .settings-tabs{padding-top:0}
  .settings-tabs :deep(.q-tabs__content){flex-direction:row;flex-wrap:wrap}
  .settings-tabs :deep(.q-tab){flex:1 1 160px}
  .preference-row{flex-wrap:wrap}
}
@media(max-width:700px){
  .settings-header{padding:16px;gap:12px}.settings-header h1{font-size:25px}.settings-header-icon{flex-basis:44px;height:44px;border-radius:10px}
  .settings-panels :deep(.threshold-group){margin:18px}
  .settings-panels :deep(.threshold-group),.settings-panels :deep(.preference-group){padding:16px}
  .settings-panels :deep(.threshold-group h3),.settings-panels :deep(.preference-group h3){font-size:18px}
}
</style>
