from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from crate import client

from app.services.mqtt_client import start_mqtt

app = FastAPI()

start_mqtt()

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