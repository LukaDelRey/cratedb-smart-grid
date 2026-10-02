<template>
  <section class="threshold-panel scada-card">
    <header class="threshold-heading"><div><div class="section-kicker">{{ t('settings.shared') }}</div><h2>{{ t('settings.heading') }}</h2><p>{{ t('settings.description') }}</p></div><q-icon name="verified_user" size="30px" color="cyan" /></header>
    <div v-if="loading" class="settings-feedback"><q-spinner color="cyan" /> {{ t('settings.loading') }}</div>
    <template v-else>
      <q-banner v-if="error" rounded class="settings-error" role="alert">{{ error }}<template #action><q-btn v-if="!snapshot" flat :label="t('settings.retry')" @click="load" /></template></q-banner>
      <q-banner v-if="success" rounded class="settings-success" role="status">{{ success }}</q-banner>
      <template v-if="snapshot">
        <div class="threshold-note"><q-icon name="info_outline" size="18px" /><span>{{ t('settings.notice') }}</span></div>
        <section v-for="group in visibleGroups" :key="group.key" class="threshold-group">
          <h3><q-icon :name="group.icon" color="cyan" size="19px" />{{ t(`settings.${group.key}`) }}</h3>
          <div v-for="field in snapshot.fields.filter(f => group.keys.includes(f.key))" :key="field.key" class="threshold-row">
            <div class="threshold-label"><strong>{{ fieldLabel(field.key, field.label) }}</strong><span>{{ t('settings.default') }}: {{ field.comparison }} {{ field.default }} {{ field.unit }}</span></div>
            <q-input v-model.number="draft[field.key]" outlined dense dark type="number" :min="field.min" :max="field.max" step="any" :suffix="field.unit" :prefix="field.comparison" :aria-label="fieldLabel(field.key, field.label)" :disable="busy" class="threshold-input" />
          </div>
        </section>
        <p v-if="!valid" class="validation-error" role="alert">{{ t('settings.invalid') }}</p>
        <footer class="threshold-actions"><div class="save-state"><span :class="dirty ? 'unsaved-dot' : 'saved-dot'" />{{ t(dirty ? 'settings.changed' : 'settings.unchanged') }}</div><q-btn flat icon="restart_alt" :label="t('settings.reset')" :disable="busy" @click="confirmReset = true" /><q-btn flat :label="t('settings.discard')" :disable="!dirty || busy" @click="discard" /><q-btn unelevated color="cyan" text-color="black" icon="save" :label="t('settings.save')" :loading="busy" :disable="!dirty || !valid || busy" @click="save(false)" /></footer>
      </template>
    </template>
    <q-dialog v-model="confirmReset"><q-card class="scada-card reset-dialog"><q-card-section><h3>{{ t('settings.resetTitle') }}</h3><p>{{ t('settings.resetBody') }}</p></q-card-section><q-card-actions align="right"><q-btn v-close-popup flat :label="t('settings.cancel')" /><q-btn color="cyan" text-color="black" :label="t('settings.reset')" @click="confirmReset = false; save(true)" /></q-card-actions></q-card></q-dialog>
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from '../../i18n'
import { fetchThresholdSettings, saveThresholdSettings, resetThresholdSettings, type ThresholdSettings } from '../../services/gridApi'
import { thresholdSettings } from '../../stores/thresholdSettings'
import { useSensorStore } from '../../stores/sensorStore'
const { t } = useI18n(), store = useSensorStore()
const props = defineProps<{ group?: string }>()
const snapshot = ref<ThresholdSettings | null>(null), draft = ref<Record<string, number>>({})
const loading = ref(true), busy = ref(false), error = ref(''), success = ref(''), confirmReset = ref(false)
const groups = [
  {key:'health',icon:'monitor_heart',keys:['health_warning','health_critical']},
  {key:'electrical',icon:'bolt',keys:['overload','voltage_drop','overvoltage','frequency_instability','harmonics_spike','short_circuit','short_circuit_voltage']},
  {key:'thermal',icon:'device_thermostat',keys:['overheating','cooling_winding','cooling_failure']},
  {key:'oil',icon:'water_drop',keys:['insulation_degradation','insulation_methane','oil_leak','arc_discharge']}
]
const visibleGroups = computed(() => props.group ? groups.filter(group => group.key === props.group) : groups)
function fieldLabel(key:string, label:string){ return t(`thresholdLabels.${key}`) === `thresholdLabels.${key}` ? label : t(`thresholdLabels.${key}`) }
const dirty = computed(() => !!snapshot.value && snapshot.value.fields.some(f => draft.value[f.key] !== snapshot.value!.values[f.key]))
const valid = computed(() => {
  const v = draft.value
  return !!snapshot.value && snapshot.value.fields.every(f => typeof v[f.key] === 'number' && Number.isFinite(v[f.key]) && v[f.key]! >= f.min && v[f.key]! <= f.max) && v.health_critical! < v.health_warning! && v.voltage_drop! < v.overvoltage! && v.short_circuit! >= v.overload!
})
function accept(data:ThresholdSettings){ snapshot.value = data; thresholdSettings.value = data; draft.value = {...data.values} }
watch(thresholdSettings, data => {
  if(data && snapshot.value && !busy.value && !dirty.value){
    snapshot.value = data
    draft.value = {...data.values}
  }
})
function discard(){ if(snapshot.value) draft.value = {...snapshot.value.values}; success.value = ''; error.value = '' }
async function load(){ loading.value = true; error.value = ''; try{ accept(await fetchThresholdSettings()) }catch{ error.value = t('settings.error') }finally{ loading.value = false } }
async function save(reset:boolean){
  busy.value = true; error.value = ''; success.value = ''
  try{
    accept(reset ? await resetThresholdSettings() : await saveThresholdSettings(draft.value))
    success.value = t(reset ? 'settings.resetDone' : 'settings.saved')
    if(!store.connection.websocketConnected) void store.refreshAll()
  }
  catch(err:any){ error.value = typeof err.response?.data?.detail === 'string' ? err.response.data.detail : t('settings.error') }
  finally{ busy.value = false }
}
onMounted(load)
</script>
<style scoped>
.threshold-panel{border:1px solid #223a4e;border-radius:12px;overflow:hidden;background:linear-gradient(130deg,#0c1b2a,#07121e)}.threshold-heading{display:flex;justify-content:space-between;gap:20px;padding:28px;border-bottom:1px solid #203447}.threshold-heading h2{font-size:23px;line-height:1.35;margin:9px 0;color:#edf6ff}.threshold-heading p{color:#92aabd;margin:0;font-size:13px}.section-kicker{font-size:10px;letter-spacing:1.7px;color:#43c8ef}.threshold-note{display:flex;gap:10px;color:#8fa9be;background:#102538;padding:15px 20px;margin:22px 28px;border-radius:7px;font-size:12px;line-height:1.7}.threshold-group{padding:0 28px 15px}.threshold-group h3{display:flex;align-items:center;gap:9px;font-size:14px;line-height:1.5;color:#dcebf5;margin:12px 0}.threshold-row{display:flex;align-items:center;justify-content:space-between;gap:22px;padding:14px 0;border-bottom:1px solid rgba(96,137,166,.13)}.threshold-label{display:flex;flex-direction:column;gap:6px}.threshold-label strong{font-size:13px;font-weight:500;color:#dce7ef}.threshold-label span{font-size:11px;color:#7793a8}.threshold-input{width:170px;flex-shrink:0}.threshold-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:20px 28px;border-top:1px solid #203447;background:#081522}.threshold-actions .q-btn{font-size:11px}.save-state{display:flex;align-items:center;gap:7px;font-size:11px;color:#8da8bb;margin-right:auto}.saved-dot,.unsaved-dot{width:6px;height:6px;border-radius:50%;background:#3bd6ac}.unsaved-dot{background:#ffb238}.settings-feedback{padding:32px;display:flex;gap:12px;align-items:center;color:#9cb4c7}.settings-error{margin:20px;background:#40222c;color:#ffbdc5}.settings-success{margin:20px;background:#12352f;color:#82e5c7}.validation-error{padding:0 28px;color:#ffb238}.reset-dialog{max-width:460px;padding:12px;color:#dcebf5;background:#0c1b2a}@media(max-width:700px){.threshold-heading,.threshold-group{padding-left:18px;padding-right:18px}.threshold-note{margin:18px}.threshold-row{gap:10px}.threshold-input{width:125px}.threshold-actions{padding:18px}.save-state{width:100%;margin-bottom:8px}}
</style>
