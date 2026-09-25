import { computed, ref } from 'vue'

import type { AlarmEvent, TopRiskSubstation } from '../types/dashboard'
import { routeForAsset, stationIdForAsset } from '../utils/assets'
import { formatClockTime } from '../utils/dateTime'

export type AlarmRegisterRow = {
  id: string
  time: string
  severity: string
  asset: string
  title: string
  value: string
  status: string
}

type AlarmRegisterOptions = {
  getEvents: () => AlarmEvent[]
  getTopRiskSubstations: () => TopRiskSubstation[]
  getMaxVisible: () => number
  onFocusStation: (stationId:string) => void
}

export function useAlarmRegister(options:AlarmRegisterOptions){
  const viewAllOpen = ref(false)
  const acknowledgedIds = ref(new Set<string>())
  const workOrderIds = ref(new Set<string>())

  const rows = computed<AlarmRegisterRow[]>(() => {
    const liveRows = options.getEvents().map(event => ({
      id:event.id,
      time:formatClockTime(event.timestamp),
      severity:event.severity || 'INFO',
      asset:event.assetId || event.source || 'SYSTEM',
      title:event.title || 'Realtime event',
      value:event.severity === 'CRITICAL'
        ? '104 C'
        : event.severity === 'WARNING'
          ? '6.2%'
          : '-',
      status:event.severity === 'INFO' ? 'INFO' : 'ACTIVE'
    }))

    if(liveRows.length){
      return liveRows
    }

    return options.getTopRiskSubstations().slice(0, 24).map((station, index) => ({
      id:station.id,
      time:`14:${String(31 - index).padStart(2, '0')}:${String(Math.max(0, 52 - index)).padStart(2, '0')}`,
      severity:station.risk > 70 ? 'CRITICAL' : station.risk > 40 ? 'WARNING' : 'INFO',
      asset:station.id,
      title:station.risk > 70 ? 'Oil Temperature High' : 'Load High',
      value:`${station.risk}%`,
      status:'ACTIVE'
    }))
  })

  const visibleRows = computed(() =>
    rows.value.slice(0, options.getMaxVisible())
  )

  const activeCount = computed(() =>
    rows.value.filter(row => displayStatus(row) === 'ACTIVE').length
  )

  function openRegister(){
    viewAllOpen.value = true
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

  function statusColor(row:AlarmRegisterRow):string{
    const status = displayStatus(row)

    if(status === 'ACTIVE') return 'negative'
    if(status === 'WORK ORDER') return 'warning'
    if(status === 'ACK') return 'positive'
    return 'info'
  }

  function acknowledge(row:AlarmRegisterRow){
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

  function createWorkOrder(row:AlarmRegisterRow){
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

  return {
    acknowledge,
    acknowledgedIds,
    activeCount,
    assetRoute,
    createWorkOrder,
    displayStatus,
    mapStationId,
    openAsset,
    openRegister,
    pinStation,
    rows,
    statusColor,
    viewAllOpen,
    visibleRows,
    workOrderIds
  }
}
