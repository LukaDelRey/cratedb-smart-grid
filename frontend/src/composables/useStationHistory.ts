import { computed, ref, watch } from 'vue'

import { fetchStationHistory } from '../services/gridApi'
import type { StationHistoryPoint } from '../types/dashboard'

type NumericSelector = (point:StationHistoryPoint) => number | null | undefined

export function useStationHistory(getStationId:() => string | undefined){
  const points = ref<StationHistoryPoint[]>([])
  const loading = ref(false)
  const error = ref('')
  let requestVersion = 0
  let selectedStationId:string | undefined

  async function refresh(){
    const stationId = getStationId()
    const version = ++requestVersion
    if(stationId !== selectedStationId){
      points.value = []
      selectedStationId = stationId
    }
    if(!stationId){
      points.value = []
      loading.value = false
      error.value = ''
      return
    }

    loading.value = true
    error.value = ''

    try{
      const result = await fetchStationHistory(stationId,24,500)
      if(version === requestVersion && stationId === getStationId()){
        points.value = result
      }
    }catch(reason){
      if(version === requestVersion && stationId === getStationId()){
        error.value = reason instanceof Error ? reason.message : 'Station history unavailable'
      }
    }finally{
      if(version === requestVersion){
        loading.value = false
      }
    }
  }

  function series(selector:NumericSelector){
    return computed(() => points.value
      .map(selector)
      .filter((value):value is number => Number.isFinite(value))
      .slice(-48)
    )
  }

  watch(getStationId,() => void refresh(),{ immediate:true })

  return {
    error,
    loading,
    points,
    refresh,
    series
  }
}
