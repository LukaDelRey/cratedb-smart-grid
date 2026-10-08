<template>
  <q-layout view="lHh Lpr lFf">
    <Sidebar />

    <q-page-container>
      <q-page
        class="page-shell settings-page overflow-hidden q-pa-md"
        style="grid-template-rows: auto auto minmax(0, 1fr)"
      >
        <Topbar
          compact
          @open-notifications="router.push('/alarms')"
          @open-topology="topologyOpen = true"
        >
          <template #breadcrumbs>
            <q-breadcrumbs
              active-color="blue-grey-3"
              class="settings-breadcrumbs text-body2"
            >
              <template #separator>
                <q-icon
                  name="chevron_right"
                  size="18px"
                />
              </template>

              <q-breadcrumbs-el
                to="/"
                :label="t('dashboard.dashboard')"
              />

              <q-breadcrumbs-el
                class="cursor-pointer"
                :label="t('settings.title')"
                @click="tab = 'values'"
              />

              <q-breadcrumbs-el :label="activeTabLabel" />
            </q-breadcrumbs>
          </template>
        </Topbar>

        <header
          class="settings-header row no-wrap items-center q-my-none q-mx-auto"
          style="
            width: 100%;
            max-width: 1380px;
            border: 1px solid rgba(64, 196, 255, 0.16);
            border-radius: 12px;
            background: linear-gradient(115deg, rgba(20, 48, 68, 0.6), rgba(7, 18, 30, 0.8));
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
          "
        >
          <div
            class="settings-header-icon column no-wrap items-center justify-center"
            style="background: rgba(65, 201, 255, 0.08); color: #41c9ff"
          >
            <q-icon
              name="tune"
              size="30px"
            />
          </div>

          <div>
            <div
              class="section-kicker text-weight-bold text-uppercase"
              style="font-size: 10px; letter-spacing: 1.6px"
            >
              {{ t('settings.kicker') }}
            </div>

            <h1
              class="text-weight-bold q-mt-xs q-mb-sm q-mx-none text-h4"
              style="line-height: 1.2"
            >
              {{ t('settings.title') }}
            </h1>

            <p
              class="q-ma-none text-body2"
              style="line-height: 1.5"
            >
              {{ t('workspaceCopy.customizeGridThresholdsYourDashboardAndPersonal') }}
            </p>
          </div>
        </header>

        <div
          class="settings-workspace scada-min-height-0 overflow-hidden q-my-none q-mx-auto"
          style="display: grid; width: 100%; max-width: 1380px"
        >
          <aside class="settings-tabs">
            <q-tabs
              v-model="tab"
              vertical
            >
              <q-tab
                v-for="item in tabs"
                :icon="item.icon"
                :key="item.name"
                :label="item.label"
                :name="item.name"
                :ripple="false"
              />
            </q-tabs>
          </aside>

          <q-tab-panels
            v-model="tab"
            class="settings-panels"
            keep-alive
          >
            <q-tab-panel name="values"><ThresholdValuesPanel /></q-tab-panel>

            <q-tab-panel name="display">
              <WorkspacePreferencesPanel
                section="display"
                :preferences="workspacePreferences"
                @reset="resetWorkspacePreferences('display')"
              />
            </q-tab-panel>

            <q-tab-panel name="regions"><RegionPreferencesPanel /></q-tab-panel>

            <q-tab-panel name="notifications">
              <NotificationsPreferencesPanel
                :preferences="workspacePreferences"
                @reset="resetWorkspacePreferences('notifications')"
              />
            </q-tab-panel>

            <q-tab-panel name="general">
              <GeneralPreferencesPanel
                :language="language"
                :language-options="languageOptions"
                @update:language="setLanguage"
              />
            </q-tab-panel>
          </q-tab-panels>
        </div>

        <SystemTopologyDialog
          v-model="topologyOpen"
          :connection="store.connection"
          :last-error="store.error"
          :topology="store.topology"
        />
      </q-page>
    </q-page-container>
  </q-layout>
</template>
<script setup lang="ts">
defineOptions({ __scopeId: 'data-v-ui-e649836e' });

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Sidebar from '../components/layout/Sidebar.vue';
import Topbar from '../components/layout/Topbar.vue';
import SystemTopologyDialog from '../components/system/SystemTopologyDialog.vue';
import ThresholdValuesPanel from '../components/settings/ThresholdValuesPanel.vue';
import WorkspacePreferencesPanel from '../components/settings/WorkspacePreferencesPanel.vue';
import GeneralPreferencesPanel from '../components/settings/GeneralPreferencesPanel.vue';
import NotificationsPreferencesPanel from '../components/settings/NotificationsPreferencesPanel.vue';
import RegionPreferencesPanel from '../components/settings/RegionPreferencesPanel.vue';
import { workspacePreferences, resetWorkspacePreferences } from '../stores/workspacePreferences';
import { useSensorStore } from '../stores/sensorStore';
import { useI18n } from '../i18n';

const store = useSensorStore();

const router = useRouter();

const { t, language, languageOptions, setLanguage } = useI18n();

const tab = ref(router.currentRoute.value.query.tab === 'regions' ? 'regions' : 'general');

const topologyOpen = ref(false);

const tabs = computed(() => [
  { name: 'general', icon: 'language', label: t('settings.general') },
  { name: 'values', icon: 'tune', label: t('settings.values') },
  { name: 'regions', icon: 'public', label: t('regions.title') },
  { name: 'display', icon: 'dashboard_customize', label: t('workspaceCopy.dashboardDisplay') },
  { name: 'notifications', icon: 'notifications', label: t('dashboard.notifications') },
]);

const activeTabLabel = computed(
  () => tabs.value.find((item) => item.name === tab.value)?.label || '',
);

onMounted(() => {
  void (store.stations.length ? store.refreshAll() : store.start());
});
</script>
