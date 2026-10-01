import json
import time
import asyncio

import paho.mqtt.client as mqtt

from app.config import MQTT_HOST, MQTT_PORT
from app.services.event_bus import event_queue


main_loop = None
mqtt_connection = None


def on_connect(client_mqtt, userdata, flags, rc, properties=None):

    if rc != 0:
        print("EMQX connection rejected:", rc)
        return

    print("Connected to EMQX")

    client_mqtt.subscribe(
        "trafostanice/+/sensors"
    )


def on_message(client_mqtt, userdata, msg):

    try:

        payload = json.loads(
            msg.payload.decode()
        )

        asyncio.run_coroutine_threadsafe(
            event_queue.put(payload),
            main_loop
        )

    except Exception as e:

        print("MQTT processing error:", e)


def start_mqtt(loop):

    global main_loop, mqtt_connection

    main_loop = loop

    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

    mqtt_client.on_connect = on_connect

    mqtt_client.on_message = on_message

    while True:

        try:

            mqtt_client.connect(MQTT_HOST, MQTT_PORT, 60)

            print("MQTT connected!")

            break

        except Exception as e:

            print("Waiting for EMQX...")
            print(e)

            time.sleep(5)

    mqtt_client.loop_start()

    mqtt_connection = mqtt_client


def stop_mqtt():
    global mqtt_connection

    if mqtt_connection is None:
        return

    mqtt_connection.loop_stop()
    mqtt_connection.disconnect()
    mqtt_connection = None


def is_mqtt_connected():
    return bool(mqtt_connection and mqtt_connection.is_connected())


def publish_sensor_payload(payload):

    if mqtt_connection is None:
        raise RuntimeError("MQTT client is not connected")

    station_id = payload.get("station_id")

    if not station_id:
        raise ValueError("Sensor payload requires station_id")

    return mqtt_connection.publish(
        f"trafostanice/{station_id}/sensors",
        json.dumps(payload),
        qos=1,
    )
