<template>
  <div
    class="command-topbar q-px-sm q-py-xs items-center"
    style="min-height: 58px"
    :class="{ 'compact-topbar': compact }"
  >
    <div
      v-if="compact"
      class="compact-title scada-text-primary text-weight-bold text-subtitle1"
    >
      <slot name="breadcrumbs">{{ title }}</slot>
    </div>

    <div
      v-else
      class="command-status-grid scada-gap-8 scada-min-width-0"
      style="display: grid"
    >
      <div
        v-for="item in topStatus"
        class="command-status-card relative-position overflow-hidden q-pa-sm"
        style="
          min-height: 42px;
          border: 1px solid rgba(120, 180, 220, 0.16);
          border-radius: 6px;
          background: linear-gradient(180deg, rgba(11, 22, 34, 0.92), rgba(4, 10, 18, 0.92));
        "
        :key="item.label"
      >
        <span
          class="block text-uppercase"
          style="font-size: 10px; line-height: 1.2"
        >
          {{ item.label }}
        </span>

        <strong
          class="inline-block q-mt-xs text-weight-bolder text-subtitle1"
          style="line-height: 1.05"
          :class="item.class"
        >
          {{ item.value }}
        </strong>

        <small
          v-if="item.detail"
          class="block text-uppercase inline-block q-ml-sm"
          style="font-size: 10px; line-height: 1.2"
        >
          {{ item.detail }}
        </small>

        <svg
          v-if="item.spark"
          class="status-line-chart absolute"
          preserveAspectRatio="none"
          style="right: 8px; bottom: 6px; width: 86px; height: 18px; opacity: 0.95"
          viewBox="0 0 120 24"
        >
          <polyline
            :class="['glow-line', item.chartClass]"
            :points="linePoints(item.spark, 120, 24)"
          />
        </svg>
      </div>
    </div>

    <div
      class="operator-cluster q-px-sm scada-min-width-0 row no-wrap items-center q-gutter-x-sm q-ml-none full-width"
    >
      <div class="q-mr-sm">
        <div
          class="operator-clock scada-text-primary text-weight-bold text-no-wrap text-h6"
          style="font-variant-numeric: tabular-nums"
        >
          {{ clock }}
        </div>

        <div
          class="operator-date scada-text-muted"
          style="font-size: 11px"
        >
          {{ dateLabel }}
        </div>
      </div>

      <q-btn
        color="blue-grey-2"
        dense
        flat
        icon="notifications"
        round
        :aria-label="t('dashboard.notifications')"
      >
        <q-badge
          v-if="store.currentAlarmCount"
          color="negative"
          floating
        >
          {{ store.currentAlarmCount }}
        </q-badge>

        <q-menu
          anchor="bottom right"
          class="notification-menu"
          self="top right"
          style="width: min(390px, calc(100vw - 24px))"
        >
          <div
            class="notification-menu-head items-center justify-between q-py-sm q-px-md row no-wrap"
          >
            <span class="text-weight-bold text-uppercase text-caption">
              {{ t('dashboard.notifications') }}
            </span>

            <strong class="text-weight-bolder text-h6">{{ store.currentAlarmCount }}</strong>
          </div>

          <q-list separator>
            <q-item
              v-close-popup
              v-for="item in notificationItems"
              class="notification-item"
              clickable
              style="min-height: 58px"
              :key="item.id"
              @click="emit('openNotifications')"
            >
              <q-item-section avatar>
                <q-icon
                  size="20px"
                  :color="item.color"
                  :name="item.icon"
                />
              </q-item-section>

              <q-item-section>
                <q-item-label class="text-weight-bold text-caption">
                  {{ translateText(item.title) }}
                </q-item-label>

                <q-item-label
                  caption
                  class="text-weight-bold text-caption"
                >
                  {{ item.detail }}
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-badge :color="item.color">
                  {{ translateStatus(item.severity) }}
                </q-badge>
              </q-item-section>
            </q-item>

            <q-item
              v-if="!notificationItems.length"
              class="notification-empty"
            >
              <q-item-section>
                <q-item-label>{{ t('dashboard.noActiveAlarmsOrEvents') }}</q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              v-close-popup
              class="notification-view-all text-weight-bold text-uppercase text-caption"
              clickable
              @click="emit('openNotifications')"
            >
              <q-item-section>
                <q-item-label>{{ t('dashboard.viewAll') }}</q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-icon
                  color="cyan"
                  name="arrow_forward"
                  size="18px"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>

      <q-btn
        color="cyan"
        dense
        flat
        icon="account_tree"
        round
        :aria-label="t('dashboard.openSystemTopology')"
        @click="emit('openTopology')"
      />

      <q-btn-dropdown
        class="language-switcher q-py-none q-px-sm"
        color="blue-grey-2"
        dense
        flat
        icon="translate"
        no-caps
        style="min-height: 30px; font-size: 11px"
        :aria-label="t('dashboard.changeLanguage')"
        :label="currentLanguageOption.shortLabel"
      >
        <q-list
          class="language-menu"
          dense
          style="min-width: 132px"
        >
          <q-item
            v-close-popup
            v-for="option in languageOptions"
            active-class="language-active"
            clickable
            :active="language === option.code"
            :key="option.code"
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
// Keep component selector isolation for the shared stylesheet.
defineOptions({ __scopeId: 'data-v-ui-74b7cd33' });

import { useDashboardTopbar } from '../../composables/useDashboardTopbar';

defineProps<{ compact?: boolean; title?: string }>();

const emit = defineEmits(['openTopology', 'openNotifications']);

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
  translateText,
} = useDashboardTopbar();
</script>
