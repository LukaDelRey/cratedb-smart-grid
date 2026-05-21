import json
import time
import asyncio
import paho.mqtt.client as mqtt
from crate import client
from app.services.websocket_manager import manager
from app.services.event_bus import event_queue

connection = client.connect("http://cratedb:4200")

main_loop = None


def on_connect(client_mqtt, userdata, flags, rc):

    print("Connected to EMQX")

    client_mqtt.subscribe("trafostanice/+/sensors")

def safe_broadcast(payload):
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        asyncio.create_task(manager.broadcast(payload))

def on_message(client_mqtt, userdata, msg):

    payload = json.loads(msg.payload.decode())

    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO trafostanice_sensors (
            timestamp,
            station_id,
            station_name,
            location,
            electrical,
            thermal,
            oil_gas
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        payload["timestamp"],
        payload["station_id"],
        payload["station_name"],
        payload["location"],
        payload["electrical"],
        payload["thermal"],
        payload["oil_gas"]
    ))

    print("Saved sensor data:", payload["station_id"])

    # 🔥 PUSH u queue (NE WebSocket direktno)
    try:
        event_queue.put_nowait(payload)
    except Exception as e:
        print("Queue error:", e)


def start_mqtt(loop):

    global main_loop

    main_loop = loop

    mqtt_client = mqtt.Client()

    mqtt_client.on_connect = on_connect
    mqtt_client.on_message = on_message

    while True:

        try:

            mqtt_client.connect("emqx", 1883, 60)

            print("MQTT connected!")

            break

        except Exception as e:

            print("Waiting for EMQX...")
            print(e)

            time.sleep(5)

    mqtt_client.loop_start()


