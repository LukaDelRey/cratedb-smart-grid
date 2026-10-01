import asyncio

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

    @property
    def connection_count(self):
        return len(self.active_connections)

    async def broadcast(self, data):
        connections = list(self.active_connections)
        if not connections:
            return

        async def send(connection):
            try:
                await asyncio.wait_for(connection.send_json(data), timeout=2)
                return None
            except Exception as exc:
                print("Broadcast error:", exc)
                return connection

        results = await asyncio.gather(*(send(connection) for connection in connections))
        for connection in results:
            if connection is not None:
                self.disconnect(connection)


manager = ConnectionManager()
