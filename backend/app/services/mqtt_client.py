import json
import time

import paho.mqtt.client as mqtt
from crate import client

connection = client.connect("http://cratedb:4200")


def on_connect(client_mqtt, userdata, flags, rc):
    print("Connected to EMQX")

    client_mqtt.subscribe("trafostanice/+/sensors")


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


def start_mqtt():

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