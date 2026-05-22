from locust import User, task, between

import json
import random
import time

import paho.mqtt.publish as publish


with open("stations.json") as f:
    stations = json.load(f)


class TrafostanicaUser(User):

    wait_time = between(1, 3)

    @task
    def send_sensor_data(self):

        station = random.choice(stations)

        overload = random.random() < 0.02
        overheating = random.random() < 0.01

        current = random.randint(150, 400)
        oil_temp = random.randint(45, 85)

        if overload:
            current = random.randint(450, 700)

        if overheating:
            oil_temp = random.randint(90, 120)

        payload = {

            "timestamp": time.strftime(
                "%Y-%m-%dT%H:%M:%SZ",
                time.gmtime()
            ),

            "station_id": station["id"],

            "station_name": station["name"],

            "location": [
                station["lon"],
                station["lat"]
            ],

            "electrical": {

                "voltage_kv": round(
                    random.uniform(9.8, 10.5),
                    2
                ),

                "current_a": current,

                "frequency_hz": round(
                    random.uniform(49.8, 50.2),
                    2
                ),

                "active_power_kw": random.randint(
                    1000,
                    3000
                ),

                "reactive_power_kvar": random.randint(
                    100,
                    500
                ),

                "harmonics_thd": round(
                    random.uniform(1.0, 5.0),
                    2
                )
            },

            "thermal": {

                "oil_temp_c": oil_temp,

                "winding_temp_c": oil_temp + random.randint(5, 15),

                "busbar_temp_c": random.randint(
                    30,
                    70
                ),

                "ambient_temp_c": random.randint(
                    -5,
                    35
                )
            },

            "oil_gas": {

                "oil_level_percent": random.randint(
                    70,
                    100
                ),

                "oil_pressure_bar": round(
                    random.uniform(1.0, 2.0),
                    2
                ),

                "humidity_ppm": random.randint(
                    5,
                    40
                ),

                "hydrogen_ppm": random.randint(
                    0,
                    25
                ),

                "methane_ppm": random.randint(
                    0,
                    10
                ),

                "acetylene_ppm": random.randint(
                    0,
                    3
                )
            },

            "alarms": {

                "overload": overload,

                "overheating": overheating
            }
        }

        publish.single(

            topic=f"trafostanice/{station['id']}/sensors",

            payload=json.dumps(payload),

            hostname="emqx",

            port=1883
        )