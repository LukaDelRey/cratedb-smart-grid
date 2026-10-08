import { computed } from 'vue';
import { activeRegions } from '../stores/regionPreferences';
import { containsPoint, stationCoordinates } from '../services/regionGeometry';
import type { RegionFeature } from '../services/regionGeometry';
import type { Station } from '../types/dashboard';
import { stationAlarms } from '../services/stationAlarms';

export type RegionStatistics = {
  id: string;
  name: string;
  stations: Station[];
  normal: number;
  warning: number;
  critical: number;
  offline: number;
  alarms: number;
  warnings: number;
  loadKW: number;
};

export function useRegionStatistics(stations: () => Station[]) {
  const geometryMatches = new WeakMap<RegionFeature, Map<string, boolean>>();
  return computed(() => {
    const locations = stations()
      .map((station) => ({ station, point: stationCoordinates(station) }))
      .filter((item) => item.point);
    return activeRegions.value.map((feature): RegionStatistics => {
      let cache = geometryMatches.get(feature);
      if (!cache) {
        cache = new Map();
        geometryMatches.set(feature, cache);
      }
      const members = locations
        .filter(({ point }) => {
          const key = point!.join(',');
          if (!cache!.has(key)) cache!.set(key, containsPoint(feature, point!));
          return cache!.get(key);
        })
        .map(({ station }) => station);
      const stats: RegionStatistics = {
        id: feature.properties.id,
        name: feature.properties.name,
        stations: members,
        normal: 0,
        warning: 0,
        critical: 0,
        offline: 0,
        alarms: 0,
        warnings: 0,
        loadKW: 0,
      };
      for (const station of members) {
        stats[station.status || 'normal'] += 1;
        for (const alarm of stationAlarms(station)) {
          if (alarm.severity === 'CRITICAL') stats.alarms += 1;
          if (alarm.severity === 'WARNING') stats.warnings += 1;
        }
        stats.loadKW += station.electrical?.active_power_kw || 0;
      }
      return stats;
    });
  });
}
