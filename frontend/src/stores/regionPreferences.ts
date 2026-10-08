import { computed, ref, shallowRef } from 'vue';
import { containsPoint, emptyRegions, validateCustomRegions } from '../services/regionGeometry';
import type { RegionCollection } from '../services/regionGeometry';

export const EU_COUNTRIES =
  'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split(' ');
const countryKey = 'crate-region-country';
const profilesKey = 'crate-region-profiles';
export type CustomRegionProfile = { id: string; name: string; data: RegionCollection };
export const regionStorageError = ref(false);
export const customRegionProfiles = shallowRef<CustomRegionProfile[]>([]);
export const selectedCountry = ref('HR'); // Stable selection key: EU country or a custom profile ID.
try {
  const saved = JSON.parse(localStorage.getItem(profilesKey) || '[]');
  if (Array.isArray(saved))
    customRegionProfiles.value = saved
      .filter(
        (item) =>
          typeof item.id === 'string' &&
          item.id.startsWith('custom:') &&
          typeof item.name === 'string' &&
          item.name.trim(),
      )
      .map((item) => ({
        id: item.id,
        name: item.name.trim().slice(0, 100),
        data: validateCustomRegions(item.data, item.id),
      }));
  // Preserve older, per-country imports as independently selectable profiles.
  if (!localStorage.getItem(profilesKey)) {
    const migrated: CustomRegionProfile[] = [];
    for (const country of EU_COUNTRIES) {
      const legacy = localStorage.getItem(`crate-custom-regions-${country}`);
      if (legacy) {
        const id = `custom:legacy-${country}`;
        migrated.push({
          id,
          name: `${country} · Custom regions`,
          data: validateCustomRegions(JSON.parse(legacy), id),
        });
      }
    }
    if (migrated.length) {
      localStorage.setItem(profilesKey, JSON.stringify(migrated));
      customRegionProfiles.value = migrated;
    }
  }
  const savedSelection = localStorage.getItem(countryKey);
  if (
    savedSelection &&
    (EU_COUNTRIES.includes(savedSelection) ||
      customRegionProfiles.value.some((item) => item.id === savedSelection))
  )
    selectedCountry.value = savedSelection;
} catch {
  regionStorageError.value = true;
}

export const boundaryData = shallowRef<RegionCollection>(emptyRegions());
export const selectedCustomProfile = computed(() =>
  customRegionProfiles.value.find((item) => item.id === selectedCountry.value),
);
export const customRegions = computed<RegionCollection>(
  () => selectedCustomProfile.value?.data || emptyRegions(),
);
export const regionsLoading = ref(false);
export const regionsError = ref('');
let loadingPromise: Promise<void> | null = null;

export function selectedScopeName(language: string) {
  return (
    selectedCustomProfile.value?.name ||
    new Intl.DisplayNames([language], { type: 'region' }).of(selectedCountry.value) ||
    selectedCountry.value
  );
}
export function selectCountry(selection: string) {
  if (
    !EU_COUNTRIES.includes(selection) &&
    !customRegionProfiles.value.some((item) => item.id === selection)
  )
    return;
  selectedCountry.value = selection;
  regionStorageError.value = false;
  try {
    localStorage.setItem(countryKey, selection);
  } catch {
    regionStorageError.value = true;
  }
}
function persistProfiles(profiles: CustomRegionProfile[]) {
  localStorage.setItem(profilesKey, JSON.stringify(profiles));
  customRegionProfiles.value = profiles;
  regionStorageError.value = false;
  membershipCache.clear();
}
export function saveCustomRegions(data: RegionCollection, name: string) {
  const label = name.trim().slice(0, 100);
  if (!label) throw new Error('name');
  const id = `custom:${crypto.randomUUID()}`;
  const geometry = validateCustomRegions(data, id);
  if (geometry.features.length === 1) geometry.features[0].properties.name = label;
  const profile = { id, name: label, data: geometry };
  persistProfiles([...customRegionProfiles.value, profile]);
  selectCountry(id);
  return id;
}
export function renameCustomRegion(id: string, name: string) {
  const label = name.trim().slice(0, 100);
  if (!label) throw new Error('name');
  persistProfiles(
    customRegionProfiles.value.map((item) => {
      if (item.id !== id) return item;
      const data =
        item.data.features.length === 1
          ? {
              ...item.data,
              features: item.data.features.map((feature) => ({
                ...feature,
                properties: { ...feature.properties, name: label },
              })),
            }
          : item.data;
      return { ...item, name: label, data };
    }),
  );
}
export function removeCustomRegion(id: string) {
  persistProfiles(customRegionProfiles.value.filter((item) => item.id !== id));
  if (selectedCountry.value === id) selectCountry('HR');
}
export const countryRegions = computed(
  () =>
    selectedCustomProfile.value?.data.features ||
    boundaryData.value.features.filter((f) => f.properties.country === selectedCountry.value),
);
export const activeRegions = computed(() => countryRegions.value);
export const displayRegions = computed<RegionCollection>(() => ({
  type: 'FeatureCollection',
  features: activeRegions.value,
}));
const membershipCache = new Map<string, boolean>();
export function pointInSelectedCountry(point: [number, number]) {
  if (!countryRegions.value.length) return false;
  const key = `${selectedCountry.value}:${point.join(',')}`;
  if (membershipCache.has(key)) return membershipCache.get(key)!;
  const inside = countryRegions.value.some((feature) => containsPoint(feature, point));
  if (membershipCache.size > 10000) membershipCache.clear();
  membershipCache.set(key, inside);
  return inside;
}
export function loadRegionBoundaries() {
  if (boundaryData.value.features.length) return Promise.resolve();
  if (loadingPromise) return loadingPromise;
  regionsLoading.value = true;
  regionsError.value = '';
  loadingPromise = (async () => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}regions/eu-adm1.geojson`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.type !== 'FeatureCollection' || !data.features?.length)
        throw new Error('Invalid boundary file');
      boundaryData.value = data;
      membershipCache.clear();
    } catch (error) {
      regionsError.value = error instanceof Error ? error.message : 'Boundary load failed';
    } finally {
      regionsLoading.value = false;
      loadingPromise = null;
    }
  })();
  return loadingPromise;
}
