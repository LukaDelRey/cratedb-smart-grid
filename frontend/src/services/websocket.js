const socket = new WebSocket(
 'ws://localhost:8000/ws/dashboard'
)

socket.onmessage = (event)=>{

 const data = JSON.parse(event.data)

 dashboardStore.update(data)

}