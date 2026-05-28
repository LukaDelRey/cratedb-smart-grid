# import json
# import time
# import asyncio

# import paho.mqtt.client as mqtt

# from crate import client

# from app.services.event_bus import event_queue


# connection = client.connect(
#     "http://cratedb:4200"
# )

# main_loop = None


# def on_connect(client_mqtt, userdata, flags, rc):

#     print("Connected to EMQX")

#     client_mqtt.subscribe(
#         "trafostanice/+/sensors"
#     )


# def on_message(client_mqtt, userdata, msg):

#     try:

#         payload = json.loads(
#             msg.payload.decode()
#         )

#         cursor = connection.cursor()

#         cursor.execute(
#             """
#             INSERT INTO trafostanice_sensors (
#                 timestamp,
#                 station_id,
#                 station_name,
#                 location,
#                 electrical,
#                 thermal,
#                 oil_gas,
#                 alarms
#             )
#             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
#             """,
#             (
#                 payload["timestamp"],
#                 payload["station_id"],
#                 payload["station_name"],
#                 payload["location"],
#                 payload["electrical"],
#                 payload["thermal"],
#                 payload["oil_gas"],
#                 payload["alarms"]
#             )
#         )

#         print(
#             f"Saved sensor data: {payload['station_id']}"
#         )

#         asyncio.run_coroutine_threadsafe(
#             event_queue.put(payload),
#             main_loop
#         )

#     except Exception as e:

#         print(
#             "MQTT processing error:",
#             e
#         )


# def start_mqtt(loop):

#     global main_loop

#     main_loop = loop

#     mqtt_client = mqtt.Client()

#     mqtt_client.on_connect = on_connect

#     mqtt_client.on_message = on_message

#     while True:

#         try:

#             mqtt_client.connect(
#                 "emqx",
#                 1883,
#                 60
#             )

#             print("MQTT connected!")

#             break

#         except Exception as e:

#             print("Waiting for EMQX...")
#             print(e)

#             time.sleep(5)

#     mqtt_client.loop_start()



import json
import time
import asyncio

import paho.mqtt.client as mqtt

from app.services.event_bus import event_queue


main_loop = None


def on_connect(client_mqtt, userdata, flags, rc):

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