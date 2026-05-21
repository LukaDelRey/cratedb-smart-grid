import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from crate import client
from app.services.mqtt_client import start_mqtt
from app.db.init_db import init_db
from app.services.event_bus import event_queue
from app.services.websocket_manager import manager


@asynccontextmanager
async def lifespan(app: FastAPI):

    asyncio.create_task(event_loop())
    print("Event loop started")


    print(f"Lifespan function called with app: {app}")

    yield

    print("Shutting down...")
    
    
app = FastAPI(lifespan=lifespan)
init_db()
loop = asyncio.get_event_loop()
start_mqtt(loop)

stations = [
    {
        "id": "TS-001",
        "name": "TS Centar",
        "lat": 46.3851,
        "lon": 16.4358
    },
    {
        "id": "TS-002",
        "name": "TS Jug",
        "lat": 46.3812,
        "lon": 16.4321
    },
    {
        "id": "TS-003",
        "name": "TS Sjever",
        "lat": 46.3925,
        "lon": 16.4290
    },
    {
        "id": "TS-004",
        "name": "TS Istok",
        "lat": 46.3878,
        "lon": 16.4450
    },
    {
        "id": "TS-005",
        "name": "TS Zapad",
        "lat": 46.3840,
        "lon": 16.4200
    }
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


connection = client.connect(
    "http://cratedb:4200",
)

@app.get("/")
def root():
    return {
        "status": "Smart Grid backend running"
    }

@app.get("/stations")
def get_stations():
    return stations

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }

@app.get("/sensors")
def get_sensors():

    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM trafostanice_sensors
        ORDER BY timestamp DESC
        LIMIT 50
    """)

    rows = cursor.fetchall()

    return {
        "data": rows
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):

    await manager.connect(websocket)

    try:
        while True:
            await asyncio.sleep(60)

    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def event_loop():

    while True:
        payload = await event_queue.get()

        await manager.broadcast(payload)
