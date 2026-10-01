import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { isAxiosError } from 'axios'
import {
  fetchScenarioDefinitions,
  fetchScenarioRuns,
  runScenario,
  stopScenario
} from '../services/gridApi'
import type { ScenarioDefinition, ScenarioRun, ScenarioType } from '../types/dashboard'

type UseScenarioControlOptions = {
  getStationId?: () => string | undefined
  defaultType?: ScenarioType
}

const fallbackDefinitions:ScenarioDefinition[] = [
  { type:'overload', label:'Transformer overload', description:'Raises current and active power.', icon:'speed', defaultDuration:30, multiAsset:false },
  { type:'overheating', label:'Thermal failure', description:'Raises oil and winding temperature.', icon:'device_thermostat', defaultDuration:30, multiAsset:false },
  { type:'voltage_drop', label:'Voltage drop', description:'Forces voltage below its threshold.', icon:'bolt', defaultDuration:30, multiAsset:false },
  { type:'sensor_failure', label:'Sensor failure', description:'Emits a telemetry quality failure.', icon:'sensors_off', defaultDuration:30, multiAsset:false },
  { type:'offline', label:'Station offline', description:'Simulates loss of station availability.', icon:'power_off', defaultDuration:30, multiAsset:false },
  { type:'blackout', label:'Regional blackout', description:'Takes a controlled group of stations offline.', icon:'crisis_alert', defaultDuration:45, multiAsset:true },
  { type:'cascade', label:'Cascading failure', description:'Propagates faults across several stations.', icon:'account_tree', defaultDuration:45, multiAsset:true }
]

function errorMessage(error:unknown):string{
  if(isAxiosError(error)){
    return String(error.response?.data?.detail || error.message)
  }

  return error instanceof Error ? error.message : 'Scenario request failed'
}

export function useScenarioControl(options:UseScenarioControlOptions = {}){
  const definitions = ref<ScenarioDefinition[]>(fallbackDefinitions)
  const runs = ref<ScenarioRun[]>([])
  const selectedType = ref<ScenarioType>(options.defaultType || 'overload')
  const durationSeconds = ref(
    fallbackDefinitions.find(item => item.type === selectedType.value)?.defaultDuration || 30
  )
  const targetCount = ref(3)
  const loading = ref(false)
  const running = ref(false)
  const stoppingId = ref<string | null>(null)
  const error = ref('')
  let refreshTimer:ReturnType<typeof setInterval> | undefined

  const activeDefinition = computed(() =>
    definitions.value.find(item => item.type === selectedType.value) || definitions.value[0]
  )
  const activeRuns = computed(() => runs.value.filter(run => run.status === 'RUNNING'))

  function selectType(type:ScenarioType){
    selectedType.value = type
    const definition = definitions.value.find(item => item.type === type)

    if(definition){
      durationSeconds.value = definition.defaultDuration
      targetCount.value = definition.multiAsset ? Math.max(3, targetCount.value) : 1
    }
  }

  async function refresh(){
    try{
      runs.value = await fetchScenarioRuns(30)
    }catch(refreshError){
      if(!runs.value.length){
        error.value = errorMessage(refreshError)
      }
    }
  }

  async function load(){
    loading.value = true
    error.value = ''

    try{
      const remoteDefinitions = await fetchScenarioDefinitions()
      if(remoteDefinitions.length){
        definitions.value = remoteDefinitions
      }
      selectType(selectedType.value)
      await refresh()
    }catch(loadError){
      error.value = errorMessage(loadError)
    }finally{
      loading.value = false
    }
  }

  async function execute(){
    running.value = true
    error.value = ''

    try{
      await runScenario({
        scenario_type:selectedType.value,
        station_id:options.getStationId?.(),
        duration_seconds:durationSeconds.value,
        target_count:activeDefinition.value?.multiAsset ? targetCount.value : 1,
        requested_by:'dispatcher'
      })
      await refresh()
    }catch(runError){
      error.value = errorMessage(runError)
    }finally{
      running.value = false
    }
  }

  async function stop(run:ScenarioRun){
    stoppingId.value = run.id
    error.value = ''

    try{
      await stopScenario(run.id)
      await refresh()
    }catch(stopError){
      error.value = errorMessage(stopError)
    }finally{
      stoppingId.value = null
    }
  }

  onMounted(() => {
    void load()
    refreshTimer = setInterval(() => void refresh(), 2500)
  })

  onBeforeUnmount(() => {
    if(refreshTimer){
      clearInterval(refreshTimer)
    }
  })

  return {
    definitions,
    runs,
    activeRuns,
    activeDefinition,
    selectedType,
    durationSeconds,
    targetCount,
    loading,
    running,
    stoppingId,
    error,
    selectType,
    refresh,
    execute,
    stop
  }
}
