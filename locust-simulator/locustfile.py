from locust import User, task, between
import json
import random
import time
import paho.mqtt.publish as publish

from shared.generate_stations import stations as stations

class TrafostanicaUser(User):

    wait_time = between(1, 3)

    @task
    def send_sensor_data(self):

        station = random.choice(stations)

        overload = random.random() < 0.02
        overheating = random.random() < 0.01

        sensor_failure = random.random() < 0.005

        offline = random.random() < 0.003

        voltage_drop = random.random() < 0.01

        current = random.randint(150, 400)
        oil_temp = random.randint(45, 85)

        if overload:
            current = random.randint(450, 700)

        if overheating:
            oil_temp = random.randint(90, 120)

        voltage = round(random.uniform(9.8, 10.5), 2)

        if voltage_drop:
            voltage = round(random.uniform(7.0, 9.0), 2)

        if offline:
            return

        payload = {

            "timestamp": time.strftime(
                "%Y-%m-%d %H:%M:%S",
                time.gmtime()
            ),

            "station_id": station["id"],

            "station_name": station["name"],

            "location": f"({station['lon']},{station['lat']})",

            "electrical": {

                "voltage_kv": voltage,

                "current_a": current,

                "frequency_hz": round( random.uniform(49.8, 50.2), 2),

                "active_power_kw": random.randint(1000, 3000),

                "reactive_power_kvar": random.randint(100, 500),

                "harmonics_thd": round(random.uniform(1.0, 5.0), 2)
            },

            "thermal": {

                "oil_temp_c": oil_temp,

                "winding_temp_c": oil_temp + random.randint(5, 15),

                "busbar_temp_c": random.randint(30, 70),

                "ambient_temp_c": random.randint(-5, 35)
            },

            "oil_gas": {

                "oil_level_percent": random.randint(70, 100),

                "oil_pressure_bar": round(random.uniform(1.0, 2.0), 2),

                "humidity_ppm": random.randint(5, 40),

                "hydrogen_ppm": random.randint(0, 25),

                "methane_ppm": random.randint(0, 10),

                "acetylene_ppm": random.randint(0, 3)
            },

            "alarms": {
                "overload": overload,

                "overheating": overheating,

                "sensor_failure": sensor_failure,

                "offline": offline,

                "voltage_drop": voltage_drop
            }
        }

        publish.single(

            topic=f"trafostanice/{station['id']}/sensors",

            payload=json.dumps(payload),

            hostname="emqx",

            port=1883
        )