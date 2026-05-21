import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSensorStore = defineStore('sensorStore', () => {

    const sensors = ref([])
    let ws = null

    const connectWebSocket = () => {

        if (ws && ws.readyState === WebSocket.OPEN) return

        ws = new WebSocket('ws://localhost:8000/ws')

        ws.onopen = () => {
            console.log('WebSocket connected')
            ws.send('connected')
        }

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data)
            sensors.value.unshift(data)

            if (sensors.value.length > 50) {
                sensors.value.pop()
            }
        }

        ws.onmessage = (event) => {
            console.log("WS RAW:", event.data)

            const data = JSON.parse(event.data)

            console.log("WS PARSED:", data)

            sensors.value.unshift(data)
        }

        ws.onclose = () => {
            console.log('WebSocket disconnected')
            setTimeout(connectWebSocket, 3000)
        }
    }

    return {
        sensors,
        connectWebSocket
    }
})