from fastapi import WebSocket

class ConnectionManager:

    def __init__(self):
        self.active_connections = []

    async def connect(self, websocket: WebSocket):

        await websocket.accept()

        self.active_connections.append(websocket)

        print("WebSocket client connected")

    def disconnect(self, websocket: WebSocket):

        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

        print("WebSocket client disconnected")

    async def broadcast(self, data):

        disconnected = []

        for connection in self.active_connections:

            try:
                await connection.send_json(data)

            except Exception as e:

                print("Broadcast error:", e)

                disconnected.append(connection)

        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()