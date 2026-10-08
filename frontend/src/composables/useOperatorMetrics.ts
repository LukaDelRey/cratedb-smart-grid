import { thresholdValue } from '../stores/thresholdSettings';
import { computed } from 'vue';
import type {
  MetricHistory,
  MetricHistoryKey,
  MetricHistoryValue,
  Station,
} from '../types/dashboard';
import { createSparkSeries, metricLinePoints, metricPointValue } from '../utils/metricSeries';

type Translate = (key: string, params?: Record<string, string | number>) => string;

type SensorStoreLike = {
  metricHistory: MetricHistory;
  summary: {
    gridHealth: number;
    activeAlarms: number;
  };
  stations: Station[];
  totalLoadMW: number;
  currentAlarmCount?: number;
  alarms: Station[];
};

export function useOperatorMetrics(store: SensorStoreLike, t: Translate) {
  function historyValues(key: MetricHistoryKey, offset = 0): MetricHistoryValue[] {
    const values = store.metricHistory?.[key] || [];

    return values.length > 1 ? values : createSparkSeries(offset);
  }

  function metricDelta(key: MetricHistoryKey): number {
    const values = store.metricHistory?.[key] || [];

    if (values.length < 2) {
      return 0;
    }

    return metricPointValue(values.at(-1)) - metricPointValue(values.at(-2));
  }

  function trendText(key: MetricHistoryKey, unit = '', fallback = t('dashboard.live')): string {
    const delta = metricDelta(key);

    if (!delta) {
      return fallback;
    }

    const sign = delta > 0 ? '+' : '';

    const rounded = Math.abs(delta) >= 10 ? Math.round(delta) : Math.round(delta * 10) / 10;

    return `${sign}${rounded}${unit} ${t('dashboard.vsLastUpdate')}`;
  }

  const voltageStability = computed(() => {
    const latest = metricPointValue(store.metricHistory?.voltageStability?.at(-1));

    const fallback = Math.max(91, Math.min(99, store.summary.gridHealth + 4));

    return Math.round((latest || fallback) * 10) / 10;
  });

  const energyEfficiency = computed(() => {
    const latest = metricPointValue(store.metricHistory?.energyEfficiency?.at(-1));

    const fallback = Math.max(70, Math.min(96, store.summary.gridHealth - 3));

    return Math.round((latest || fallback) * 10) / 10;
  });

  const avgThd = computed(() => {
    const values = store.stations
      .map((station) => station.electrical?.harmonics_thd)
      .filter(Number.isFinite);

    if (!values.length) return 3.2;

    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
  });

  const operatorMetrics = computed(() => [
    {
      label: t('dashboard.totalLoad'),
      value: (store.totalLoadMW / 1000).toFixed(2),
      unit: ' GW',
      trend: trendText('totalLoadMW', ' MW', t('dashboard.live')),
      trendClass: 'text-positive',
      chartClass: 'normal',
      spark: historyValues('totalLoadMW', 0),
    },
    {
      label: t('dashboard.frequency'),
      value: metricPointValue(store.metricHistory?.frequency?.at(-1)).toFixed(2),
      unit: ' Hz',
      trend: trendText('frequency', ' Hz', t('dashboard.live')),
      trendClass: 'text-positive',
      chartClass: 'normal',
      spark: historyValues('frequency', 2),
    },
    {
      label: t('dashboard.voltageStability'),
      value: voltageStability.value,
      unit: '%',
      trend: t('dashboard.good'),
      trendClass: 'text-positive',
      chartClass: 'normal',
      spark: historyValues('voltageStability', 4),
    },
    {
      label: t('dashboard.powerQuality'),
      value: avgThd.value,
      unit: '% THD',
      trend:
        avgThd.value > thresholdValue('harmonics_spike', 5)
          ? t('dashboard.watch')
          : t('dashboard.good'),
      trendClass:
        avgThd.value > thresholdValue('harmonics_spike', 5) ? 'text-warning' : 'text-positive',
      chartClass: avgThd.value > thresholdValue('harmonics_spike', 5) ? 'warning' : 'normal',
      spark: historyValues('powerQuality', 1),
    },
    {
      label: t('dashboard.activeAlarms'),
      value: store.currentAlarmCount ?? store.summary.activeAlarms,
      unit: '',
      trend: trendText('activeAlarms', '', t('dashboard.live')),
      trendClass: 'text-negative',
      chartClass: 'critical',
      spark: historyValues('activeAlarms', 3),
    },
    {
      label: t('dashboard.energyEfficiency'),
      value: energyEfficiency.value,
      unit: '%',
      trend: t('dashboard.excellent'),
      trendClass: 'text-positive',
      chartClass: 'normal',
      spark: historyValues('energyEfficiency', 5),
    },
  ]);

  return {
    linePoints: metricLinePoints,
    operatorMetrics,
  };
}
