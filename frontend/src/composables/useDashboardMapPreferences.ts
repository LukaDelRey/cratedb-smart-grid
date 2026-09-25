import { ref, watch } from 'vue'
import type { DashboardMapLayers, MarkerFilters } from '../types/dashboard'

const memoryPreferences = new Map<string, object>()

function loadStoredObject<T extends object>(key:string, defaults:T):T{
  const memoryValue = memoryPreferences.get(key)

  if(memoryValue){
    return {
      ...defaults,
      ...memoryValue
    }
  }

  if(typeof window === 'undefined'){
    return { ...defaults }
  }

  try{
    const parsed = JSON.parse(window.localStorage?.getItem(key) || '{}')

    return {
      ...defaults,
      ...parsed
    }
  }catch{
    return { ...defaults }
  }
}

function storeObject<T extends object>(key:string,value:T){
  memoryPreferences.set(key, { ...value })

  if(typeof window === 'undefined'){
    return
  }

  try{
    window.localStorage?.setItem(key, JSON.stringify(value))
  }catch{
    // Some embedded browsers disable localStorage; in-memory preferences still cover SPA navigation.
  }
}

export function useDashboardMapPreferences(
  defaultLayers:DashboardMapLayers,
  defaultMarkerFilters:MarkerFilters
){
  const layers = ref(loadStoredObject('cratedb-dashboard-map-layers', defaultLayers))
  const markerFilters = ref(loadStoredObject('cratedb-dashboard-map-marker-filters', defaultMarkerFilters))

  watch(
    layers,
    value => {
      storeObject('cratedb-dashboard-map-layers', value)
    },
    { deep:true }
  )

  watch(
    markerFilters,
    value => {
      storeObject('cratedb-dashboard-map-marker-filters', value)
    },
    { deep:true }
  )

  return {
    layers,
    markerFilters
  }
}
