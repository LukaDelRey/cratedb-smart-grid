<template>
  <q-drawer
    class="sidebar-shell text-white"
    show-if-above
    :width="236"
  >
    <div class="column no-wrap full-height q-pa-sm overflow-auto">
      <div
        class="brand-block row no-wrap items-center q-pt-xs q-pb-md q-px-sm q-gutter-x-sm q-ml-none"
        style="min-height: 54px; border-bottom: 1px solid rgba(255, 255, 255, 0.06)"
      >
        <div
          aria-hidden="true"
          class="brand-mark column no-wrap items-center justify-center"
        >
          <span
            class="no-box-shadow"
            style="width: 13px; height: 13px"
          />
        </div>

        <div>
          <div
            class="brand-title scada-text-primary text-weight-bolder text-h6"
            style="line-height: 1; letter-spacing: 0"
          >
            CrateDB
          </div>

          <div
            class="brand-subtitle q-mt-xs"
            style="color: #b8cad8; font-size: 11px; line-height: 1"
          >
            Smart Grid Platform
          </div>
        </div>
      </div>

      <q-list
        class="q-mt-md"
        dense
        padding
        style="flex-shrink: 0"
      >
        <q-item
          v-for="item in navItems"
          active-class="nav-active"
          class="nav-item rounded-borders q-mb-sm"
          clickable
          exact
          style="min-height: 42px"
          :active="item.active"
          :key="item.label"
          :to="item.to"
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
        style="flex-shrink: 0"
        :connection="store.connection"
        :stations="store.stations"
        :summary="store.summary"
      />
    </div>
  </q-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useSensorStore } from '../../stores/sensorStore';
import GridHealthPanel from '../dashboard/GridHealthPanel.vue';
import { useI18n } from '../../i18n';

const store = useSensorStore();

const route = useRoute();

const { t } = useI18n();

const firstRegion = computed(
  () => [...store.regions].sort((a, b) => (b.stations || 0) - (a.stations || 0))[0]?.id || '',
);

const firstSubstation = computed(() => store.stations[0]?.station_id || 'TS-001');

const firstTransformer = computed(() => store.transformers[0]?.id || 'TR-001');

const transformerTarget = computed(() =>
  route.path.startsWith('/transformers/') ? route.path : `/transformers/${firstTransformer.value}`,
);

const showGridHealth = computed(() => route.path === '/');

const navItems = computed(() => [
  { label: t('dashboard.dashboard'), icon: 'dashboard', to: '/', active: route.path === '/' },
  {
    label: t('dashboard.regionTwin'),
    icon: 'public',
    to: firstRegion.value
      ? `/regions/${encodeURIComponent(firstRegion.value)}`
      : '/settings?tab=regions',
    active: route.path.startsWith('/regions/'),
  },
  {
    label: t('dashboard.substationTwin'),
    icon: 'hub',
    to: `/substations/${firstSubstation.value}`,
    active: route.path.startsWith('/substations/'),
  },
  {
    label: t('dashboard.transformerTwin'),
    icon: 'memory',
    to: transformerTarget.value,
    active: route.path.startsWith('/transformers/'),
  },
  {
    label: t('dashboard.alarmCenter'),
    icon: 'warning',
    to: '/alarms',
    active: route.path === '/alarms',
  },
  {
    label: t('dashboard.aiForecasting'),
    icon: 'psychology',
    to: '/forecasting',
    active: route.path === '/forecasting',
  },
  { label: t('settings.title'), icon: 'tune', to: '/settings', active: route.path === '/settings' },
]);
</script>
