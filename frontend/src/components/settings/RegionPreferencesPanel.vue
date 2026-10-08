<template>
  <section class="scada-card q-pa-lg region-settings">
    <h2 class="q-mt-none text-h5">{{ t('regions.title') }}</h2>
    <p class="text-blue-grey-3">{{ t('regions.description') }}</p>
    <q-banner
      v-if="regionsError"
      class="bg-red-10 text-red-2 q-mb-md"
      rounded
    >
      {{ t('regions.loadError') }}
      <template #action>
        <q-btn
          flat
          :label="t('regions.retry')"
          @click="loadRegionBoundaries"
        />
      </template>
    </q-banner>
    <q-banner
      v-if="regionStorageError"
      class="bg-orange-10 text-orange-2 q-mb-md"
      rounded
    >
      {{ t('regions.storageError') }}
    </q-banner>
    <div class="region-settings-toolbar">
      <q-select
        :model-value="selectedCountry"
        :options="countryOptions"
        emit-value
        map-options
        outlined
        dark
        :label="t('regions.country')"
        :loading="regionsLoading"
        @update:model-value="changeCountry"
      />
      <div class="text-caption text-blue-grey-3">{{ t('regions.countryScope') }}</div>
    </div>
    <div class="row q-gutter-sm q-my-md">
      <q-chip
        dark
        icon="public"
      >
        {{ countryName }} · {{ activeRegions.length }} {{ t('regions.regionsCount') }}
      </q-chip>
      <span class="region-source-label">
        {{ customRegions.features.length ? t('regions.custom') : t('regions.administrative') }}
      </span>
    </div>
    <p class="text-caption text-blue-grey-4">{{ t('regions.boundaryNote') }}</p>
    <q-separator
      dark
      class="q-my-lg"
    />
    <h3 class="text-h6 q-mb-sm">{{ t('regions.customTitle') }}</h3>
    <p class="text-blue-grey-3">{{ t('regions.customHelp') }}</p>
    <p class="text-caption text-blue-grey-4">{{ t('regions.customLimits') }}</p>
    <div class="row q-gutter-sm items-center">
      <q-file
        v-model="file"
        dark
        outlined
        dense
        accept=".geojson,.json,application/geo+json,application/json"
        :max-file-size="2097152"
        :label="t('regions.chooseFile')"
        style="min-width: 220px; flex: 1"
        @update:model-value="readFile"
        @rejected="importError = t('regions.fileTooLarge')"
      >
        <template #prepend><q-icon name="upload_file" /></template>
      </q-file>
    </div>
    <q-markup-table
      v-if="customRegionProfiles.length"
      flat
      dark
      bordered
      class="q-mt-lg custom-profile-table"
    >
      <thead>
        <tr>
          <th class="text-left">{{ t('regions.profileName') }}</th>
          <th>{{ t('regions.regionsCount') }}</th>
          <th class="text-right">{{ t('regions.manage') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="profile in customRegionProfiles"
          :key="profile.id"
        >
          <td>
            <q-input
              :model-value="profile.name"
              @update:model-value="(value) => renameProfile(profile.id, String(value || ''))"
              dense
              outlined
              dark
              debounce="500"
              maxlength="100"
              :aria-label="t('regions.profileName')"
            />
          </td>
          <td class="text-center">{{ profile.data.features.length }}</td>
          <td class="text-right">
            <q-btn
              flat
              round
              dense
              icon="public"
              color="cyan"
              :aria-label="t('regions.activate')"
              @click="changeCountry(profile.id)"
            >
              <q-tooltip>{{ t('regions.activate') }}</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              icon="download"
              color="blue-grey-2"
              :aria-label="t('regions.export')"
              @click="download(profile.data, profile.name + '.geojson')"
            >
              <q-tooltip>{{ t('regions.export') }}</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              icon="delete_outline"
              color="orange"
              :aria-label="t('regions.remove')"
              @click="removeProfile(profile.id)"
            >
              <q-tooltip>{{ t('regions.remove') }}</q-tooltip>
            </q-btn>
          </td>
        </tr>
      </tbody>
    </q-markup-table>
    <q-banner
      v-if="importError"
      class="bg-red-10 text-red-2 q-mt-md"
      rounded
    >
      {{ importError }}
    </q-banner>
    <q-banner
      v-if="importSuccess"
      class="bg-teal-10 text-teal-2 q-mt-md"
      rounded
    >
      {{ t('regions.importSuccess') }}
    </q-banner>
    <div class="text-caption text-blue-grey-4 q-mt-lg">
      {{ t('regions.localOnly') }}
      <br />
      <a
        href="https://www.geoboundaries.org/"
        target="_blank"
        rel="noopener"
      >
        geoBoundaries gbOpen
      </a>
      ·
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener"
      >
        © OpenStreetMap contributors
      </a>
      ·
      <a
        :href="`${baseUrl}regions/sources.json`"
        target="_blank"
        rel="noopener"
      >
        {{ t('regions.sources') }}
      </a>
    </div>
    <q-dialog v-model="previewOpen">
      <q-card
        dark
        class="q-pa-lg"
        style="width: 700px; max-width: 95vw"
      >
        <h3 class="text-h6 q-mt-none">{{ t('regions.previewTitle') }}</h3>
        <q-input
          v-model="draftName"
          outlined
          dark
          maxlength="100"
          class="q-mb-md"
          :label="t('regions.profileName')"
          autofocus
        />
        <p>{{ draft?.features.length }} {{ t('regions.regionsCount') }}</p>
        <RegionBoundaryPreview
          v-if="draft && previewOpen"
          :data="draft"
        />
        <p class="text-caption text-blue-grey-3">{{ t('regions.overlapNote') }}</p>
        <div class="row justify-end q-gutter-sm q-mt-md">
          <q-btn
            v-close-popup
            flat
            :label="t('regions.cancel')"
          />
          <q-btn
            color="cyan-8"
            :label="t('regions.apply')"
            :disable="!draftName.trim()"
            @click="applyImport"
          />
        </div>
      </q-card>
    </q-dialog>
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue';
import { useI18n } from '../../i18n';
import {
  EU_COUNTRIES,
  selectedCountry,
  customRegions,
  customRegionProfiles,
  activeRegions,
  regionsLoading,
  regionsError,
  regionStorageError,
  selectCountry,
  loadRegionBoundaries,
  saveCustomRegions,
  renameCustomRegion,
  removeCustomRegion,
  selectedScopeName,
} from '../../stores/regionPreferences';
import { validateCustomRegions } from '../../services/regionGeometry';
import type { RegionCollection } from '../../services/regionGeometry';
import RegionBoundaryPreview from './RegionBoundaryPreview.vue';
const { t, language } = useI18n();
const baseUrl = import.meta.env.BASE_URL;
const file = ref<File | null>(null);
const importError = ref('');
const importSuccess = ref(false);
const previewOpen = ref(false);
const draft = shallowRef<RegionCollection | null>(null);
const draftName = ref('');
let importSequence = 0;
const countryName = computed(() => selectedScopeName(language.value));
const countryOptions = computed(() => {
  const names = new Intl.DisplayNames([language.value], { type: 'region' });
  const countries = EU_COUNTRIES.map((value) => ({ value, label: names.of(value) || value })).sort(
    (a, b) => a.label.localeCompare(b.label, language.value),
  );
  return [
    ...countries,
    ...customRegionProfiles.value.map((profile) => ({
      value: profile.id,
      label: profile.name + ' · ' + t('regions.custom'),
    })),
  ];
});
function changeCountry(country: string) {
  importSequence++;
  file.value = null;
  draft.value = null;
  previewOpen.value = false;
  importError.value = '';
  importSuccess.value = false;
  selectCountry(country);
}
async function readFile(value: File | null) {
  const sequence = ++importSequence;
  importError.value = '';
  importSuccess.value = false;
  draft.value = null;
  if (!value) return;
  try {
    if (value.size > 2097152) {
      importError.value = t('regions.fileTooLarge');
      return;
    }
    const raw = JSON.parse(await value.text());
    const data = validateCustomRegions(raw, 'draft');
    if (sequence !== importSequence) return;
    draft.value = data;
    draftName.value = String(
      raw.name ||
        (data.features.length === 1
          ? data.features[0].properties.name
          : value.name.replace(/\.(geojson|json)$/i, '')),
    )
      .trim()
      .slice(0, 100);
    previewOpen.value = true;
  } catch {
    if (sequence === importSequence) importError.value = t('regions.invalidFile');
  }
}
function applyImport() {
  if (!draft.value || !draftName.value.trim()) return;
  try {
    saveCustomRegions(draft.value, draftName.value);
    previewOpen.value = false;
    importSuccess.value = true;
    file.value = null;
  } catch {
    importError.value = t('regions.storageError');
    previewOpen.value = false;
  }
}
function renameProfile(id: string, name: string) {
  if (!name.trim()) {
    importError.value = t('regions.nameRequired');
    return;
  }
  try {
    renameCustomRegion(id, name);
    importError.value = '';
  } catch {
    importError.value = t('regions.storageError');
  }
}
function removeProfile(id: string) {
  try {
    removeCustomRegion(id);
    importError.value = '';
  } catch {
    importError.value = t('regions.storageError');
  }
}
function download(data: RegionCollection, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify({ ...data, name: name.replace(/\.geojson$/i, '') }, null, 2)], {
      type: 'application/geo+json',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name.replace(/[<>:"/\\|?*]/g, '-');
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
onMounted(() => {
  void loadRegionBoundaries();
});
</script>
<style scoped>
.region-source-label {
  align-self: center;
  color: #8fa9be;
  font-size: 12px;
  padding: 0 8px;
}
.custom-profile-table {
  color: #edf5fa;
}
.custom-profile-table th {
  color: #a9becd;
}
.region-settings {
  max-width: 1100px;
}
.region-settings-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 320px) 1fr;
  gap: 20px;
  align-items: center;
}
.region-settings a {
  color: #40c4ff;
}
@media (max-width: 700px) {
  .region-settings-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
