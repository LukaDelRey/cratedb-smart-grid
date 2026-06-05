// import { defineStore } from 'pinia'
// import { ref, computed } from 'vue'

// export const useSensorStore = defineStore('sensorStore', () => {

//   const stationsMap = ref({})
//   const sensors = ref([])
//   const history = ref({})

//   let ws = null

//   const connectWebSocket = () => {

//     if (ws && ws.readyState === WebSocket.OPEN) return

//     ws = new WebSocket('ws://localhost:8000/ws')

//     ws.onopen = () => {
//       console.log('WS connected')
//     }

//     ws.onmessage = (event) => {

//       const data = JSON.parse(event.data)

//       if (Array.isArray(data)) {
//         sensors.value = data
//         updateStationsMap(data)
//         return
//       }

//       sensors.value.unshift(data)

//       if (sensors.value.length > 1000) {
//         sensors.value.pop()
//       }

//       updateStation(data)
//     }

//     ws.onclose = () => {
//       console.log('WS disconnected')
//       setTimeout(connectWebSocket, 3000)
//     }
//   }

//   function updateStationsMap(dataArray) {
//     dataArray.forEach(updateStation)
//   }

//   function updateStation(station) {

//     if (!station.station_id) return

//     stationsMap.value[station.station_id] = station

//     const id = station.station_id

//     if (!history.value[id]) {
//       history.value[id] = []
//     }

//     history.value[id].push({
//       timestamp: Date.now(),
//       voltage: station.electrical?.voltage_kv,
//       current: station.electrical?.current_a,
//       temp: station.thermal?.oil_temp_c
//     })

//     if (history.value[id].length > 100) {
//       history.value[id].shift()
//     }
//   }

//   const stations = computed(() =>
//     Object.values(stationsMap.value)
//   )

//   const alarms = computed(() =>
//     stations.value.filter(s =>
//       s.alarms?.overheating ||
//       s.alarms?.overload
//     )
//   )

//   const criticalStations = computed(() =>
//     stations.value.filter(
//       s =>
//         s.thermal?.oil_temp_c > 90 ||
//         s.electrical?.current_a > 500
//     )
//   )

//   return {
//     sensors,
//     stations,
//     alarms,
//     criticalStations,
//     history,
//     connectWebSocket
//   }
// })

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSensorStore = defineStore('sensorStore', () => {

  const stationsMap = ref({})
  const history = ref({})
  const regions = ref([
    {
      id:'REGION-NORTH',
      name:'North Grid',
      blackoutRisk:12,
      healthScore:92
    },
    {
      id:'REGION-SOUTH',
      name:'South Grid',
      blackoutRisk:48,
      healthScore:71
    }
  ])

  let ws = null

  const connectWebSocket = async () => {

    if (ws && ws.readyState === WebSocket.OPEN) return

    const response = await fetch('http://localhost:8000/sensors')
    const initial = await response.json()

    initial.data.forEach(updateStation)

    ws = new WebSocket('ws://localhost:8000/ws')

    ws.onopen = () => {
      console.log('WS connected')
    }

    ws.onmessage = (event) => {

      const station = JSON.parse(event.data)

      updateStation(station)
    }

    ws.onclose = () => {

      console.log('WS disconnected')

      setTimeout(connectWebSocket, 3000)
    }
  }

  function updateStation(station) {

    if (!station.station_id) return

    stationsMap.value[station.station_id] = station

    const id = station.station_id

    if (!history.value[id]) {
      history.value[id] = []
    }

    history.value[id].push({
      timestamp: Date.now(),
      voltage: station.electrical?.voltage_kv || 0,
      current: station.electrical?.current_a || 0,
      temp: station.thermal?.oil_temp_c || 0
    })

    if (history.value[id].length > 100) {
      history.value[id].shift()
    }
  }

  const stations = computed(() =>
    Object.values(stationsMap.value)
  )

  const alarms = computed(() =>
    stations.value.filter(s =>
      s.alarms?.overheating ||
      s.alarms?.overload ||
      s.alarms?.voltage_drop ||
      s.alarms?.sensor_failure
    )
  )

  const criticalStations = computed(() =>
    stations.value.filter(
      s =>
        s.thermal?.oil_temp_c > 90 ||
        s.electrical?.current_a > 500
    )
  )

  const avgVoltage = computed(() => {

    if (!stations.value.length) return 0

    return (
      stations.value.reduce(
        (sum, s) => sum + (s.electrical?.voltage_kv || 0),
        0
      ) / stations.value.length
    ).toFixed(2)
  })

  const avgTemperature = computed(() => {

    if (!stations.value.length) return 0

    return (
      stations.value.reduce(
        (sum, s) => sum + (s.thermal?.oil_temp_c || 0),
        0
      ) / stations.value.length
    ).toFixed(1)
  })

  const gridHealth = computed(() => {

    const critical = criticalStations.value.length
    const total = stations.value.length

    if (!total) return 100

    return Math.max(
      0,
      Math.round(100 - (critical / total) * 100)
    )
  })


  const regionAnalytics = computed(() => {

    const northStations = stations.value.filter(s => {

      const loc = s.location

      if (!loc) return false

      const match = loc.match(/\((.*),(.*)\)/)

      if (!match) return false

      const lat = parseFloat(match[2])

      return lat >= 46.38
    })

    const southStations = stations.value.filter(s => {

      const loc = s.location

      if (!loc) return false

      const match = loc.match(/\((.*),(.*)\)/)

      if (!match) return false

      const lat = parseFloat(match[2])

      return lat < 46.38
    })

    function calculateRisk(list){

      if (!list.length) return 0

      const critical = list.filter(
        s =>
          s.thermal?.oil_temp_c > 90 ||
          s.electrical?.current_a > 500
      ).length

      return Math.round(
        (critical / list.length) * 100
      )
    }

    function calculateHealth(list){

      if (!list.length) return 100

      const risk = calculateRisk(list)

      return Math.max(0, 100 - risk)
    }

    return [

      {
        id:'REGION-NORTH',
        name:'North Grid',
        stations:northStations.length,
        blackoutRisk:calculateRisk(northStations),
        healthScore:calculateHealth(northStations)
      },

      {
        id:'REGION-SOUTH',
        name:'South Grid',
        stations:southStations.length,
        blackoutRisk:calculateRisk(southStations),
        healthScore:calculateHealth(southStations)
      }
    ]
  })



  return {
    stations,
    alarms,
    criticalStations,
    avgVoltage,
    avgTemperature,
    gridHealth,
    history,
    connectWebSocket,
    regions, 
    regionAnalytics
  }
})
