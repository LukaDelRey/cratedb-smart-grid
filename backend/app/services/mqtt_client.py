import time
import json
import paho.mqtt.client as mqtt

mqtt_client = mqtt.Client()


def on_connect(client, userdata, flags, rc):
    print("Connected to MQTT broker")

    client.subscribe("trafostanice/+/sensors")


def on_message(client, userdata, msg):
    payload = msg.payload.decode()

    print("MQTT MESSAGE:")
    print(payload)


mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message


def start_mqtt():

    connected = False

    while not connected:
        try:
            mqtt_client.connect("emqx", 1883, 60)
            connected = True
            print("MQTT connected!")

        except Exception as e:
            print("MQTT not ready yet...")
            print(e)

            time.sleep(5)

    mqtt_client.loop_start()