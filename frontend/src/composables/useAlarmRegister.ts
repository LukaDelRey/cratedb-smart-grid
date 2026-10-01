import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSensorStore } from '../stores/sensorStore'
import { stationAlarms } from '../services/stationAlarms'

import {
  acknowledgePersistentAlarm,
  createPersistentAlarmWorkOrder,
  fetchPersistentAlarms
} from '../services/gridApi'
import type { PersistentAlarm, TopRiskSubstation } from '../types/dashboard'
import { routeForAsset, stationIdForAsset } from '../utils/assets'
import { formatClockTime } from '../utils/dateTime'

const SEVERITY_ORDER:Record<string, number> = {
  CRITICAL:0,
  ERROR:0,
  WARNING:1,
  INFO:2
}

export type AlarmRegisterRow = {
  id: string
  time: string
  severity: string
  asset: string
  title: string
  value: string
  status: string
  occurredAt: number
  persistent?: PersistentAlarm
}

type AlarmRegisterOptions = {
  getTopRiskSubstations: () => TopRiskSubstation[]
  getMaxVisible: () => number
  onFocusStation: (stationId:string) => void
}

export function useAlarmRegister(options:AlarmRegisterOptions){
  const viewAllOpen = ref(false)
  const acknowledgedIds = ref(new Set<string>())
  const workOrderIds = ref(new Set<string>())
  const store = useSensorStore()
  const { persistentAlarms } = storeToRefs(store)
  const severitySortEnabled = ref(false)
  let refreshTimer:ReturnType<typeof setInterval> | null = null

  const rows = computed<AlarmRegisterRow[]>(() => {
    // Persistent rows only supply workflow metadata. They never create current conditions.
    const mergedRows:AlarmRegisterRow[] = store.stations.flatMap(station =>
      stationAlarms(station).map(condition => {
        const persistent = persistentAlarms.value.find(alarm =>
          alarm.station_id === station.station_id && alarm.alarm_type === condition.type &&
          ['ACTIVE','ACK','WORK_ORDER'].includes(alarm.status))
        return {
          id:persistent?.id ?? `live-${station.station_id}-${condition.type}`,
          time:formatClockTime(station.timestamp), severity:condition.severity,
          asset:station.station_id, title:condition.title,
          value:condition.value == null ? '-' : `${condition.value}${condition.unit ? ` ${condition.unit}` : ''}`,
          status:persistent?.status ?? 'ACTIVE',
          occurredAt:new Date(station.timestamp ?? 0).getTime() || 0,
          persistent
        }
      }))

    return mergedRows.sort((left, right) => right.occurredAt - left.occurredAt)
  })

  const displayRows = computed(() => {
    if(!severitySortEnabled.value){
      return rows.value
    }

    return [...rows.value].sort((left, right) => {
      const severityDifference =
        (SEVERITY_ORDER[left.severity] ?? 3) -
        (SEVERITY_ORDER[right.severity] ?? 3)

      return severityDifference || right.occurredAt - left.occurredAt
    })
  })

  const visibleRows = computed(() =>
    displayRows.value
  )

  const activeCount = computed(() =>
    rows.value.filter(row => ['ACTIVE','ACK','WORK_ORDER','WORK ORDER'].includes(displayStatus(row))).length
  )

  function openRegister(){
    viewAllOpen.value = true
  }

  function toggleSeveritySort(){
    severitySortEnabled.value = !severitySortEnabled.value
  }

  function displayStatus(row:AlarmRegisterRow):string{
    if(workOrderIds.value.has(row.id)){
      return 'WORK ORDER'
    }

    if(acknowledgedIds.value.has(row.id)){
      return 'ACK'
    }

    return row.status
  }

  function statusBadgeClass(row:AlarmRegisterRow):string{
    return displayStatus(row)
      .toLowerCase()
      .replace(/[_\s]+/g, '-')
  }

  async function refreshPersistentAlarms(){
    try{
      persistentAlarms.value = await fetchPersistentAlarms({
        status:'ACTIVE,ACK,WORK_ORDER',
        limit:1000
      })

      acknowledgedIds.value = new Set(
        persistentAlarms.value
          .filter(alarm => alarm.status === 'ACK' || alarm.status === 'WORK_ORDER')
          .map(alarm => alarm.id)
      )
      workOrderIds.value = new Set(
        persistentAlarms.value
          .filter(alarm => alarm.status === 'WORK_ORDER')
          .map(alarm => alarm.id)
      )
    }catch{
      persistentAlarms.value = []
    }
  }

  async function acknowledge(row:AlarmRegisterRow){
    if(row.persistent){
      await acknowledgePersistentAlarm(row.id)
      await refreshPersistentAlarms()
      return
    }

    const nextAcknowledged = new Set(acknowledgedIds.value)
    const nextWorkOrders = new Set(workOrderIds.value)

    nextWorkOrders.delete(row.id)

    if(nextAcknowledged.has(row.id)){
      nextAcknowledged.delete(row.id)
    }else{
      nextAcknowledged.add(row.id)
    }

    acknowledgedIds.value = nextAcknowledged
    workOrderIds.value = nextWorkOrders
  }

  async function createWorkOrder(row:AlarmRegisterRow){
    if(row.persistent){
      await createPersistentAlarmWorkOrder(row.id)
      await refreshPersistentAlarms()
      return
    }

    const nextAcknowledged = new Set(acknowledgedIds.value)
    const nextWorkOrders = new Set(workOrderIds.value)

    if(nextWorkOrders.has(row.id)){
      nextWorkOrders.delete(row.id)
      nextAcknowledged.delete(row.id)
    }else{
      nextWorkOrders.add(row.id)
      nextAcknowledged.add(row.id)
    }

    acknowledgedIds.value = nextAcknowledged
    workOrderIds.value = nextWorkOrders
  }

  function assetRoute(row:AlarmRegisterRow):string | null{
    return routeForAsset(row.asset)
  }

  function openAsset(row:AlarmRegisterRow){
    const route = assetRoute(row)

    if(route){
      window.location.assign(route)
      return
    }

    options.onFocusStation(row.asset)
    viewAllOpen.value = false
  }

  function mapStationId(row:AlarmRegisterRow):string | null{
    return stationIdForAsset(row.asset)
  }

  function pinStation(row:AlarmRegisterRow){
    const stationId = mapStationId(row)

    if(!stationId){
      return
    }

    options.onFocusStation(stationId)
    viewAllOpen.value = false
  }

  onMounted(() => {
    void refreshPersistentAlarms()
    refreshTimer = setInterval(refreshPersistentAlarms, 15000)
  })

  onUnmounted(() => {
    if(refreshTimer){
      clearInterval(refreshTimer)
    }
  })

  return {
    acknowledge,
    acknowledgedIds,
    activeCount,
    assetRoute,
    createWorkOrder,
    displayRows,
    displayStatus,
    mapStationId,
    openAsset,
    openRegister,
    pinStation,
    rows,
    severitySortEnabled,
    statusBadgeClass,
    toggleSeveritySort,
    viewAllOpen,
    visibleRows,
    workOrderIds
  }
}
