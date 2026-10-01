from locust import User, task, between
import json
import random
import time
import paho.mqtt.client as mqtt

from shared.generate_stations import stations as stations

class TrafostanicaUser(User):

    wait_time = between(1, 3)

    def on_start(self):
        self.mqtt_client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2,
            client_id=f"locust-{id(self)}",
        )
        self.mqtt_client.connect("emqx", 1883, 60)
        self.mqtt_client.loop_start()

    def on_stop(self):
        self.mqtt_client.loop_stop()
        self.mqtt_client.disconnect()

    @task
    def send_sensor_data(self):

        station = random.choice(stations)

        overload = random.random() < 0.02
        overheating = random.random() < 0.01

        sensor_failure = random.random() < 0.005

        offline = random.random() < 0.003

        voltage_drop = random.random() < 0.01

        short_circuit = random.random() < 0.001
        voltage_instability = random.random() < 0.003
        harmonics_spike = random.random() < 0.004
        cooling_failure = random.random() < 0.002
        insulation_degradation = random.random() < 0.003
        oil_leak = random.random() < 0.0015
        arc_discharge = random.random() < 0.0008
        feeder_failure = random.random() < 0.001
        transformer_trip = random.random() < 0.0007

        current = random.randint(150, 400)
        oil_temp = random.randint(45, 85)

        if overload:
            current = random.randint(450, 700)

        if overheating:
            oil_temp = random.randint(90, 120)

        voltage = round(random.uniform(9.8, 10.5), 2)

        if voltage_drop:
            voltage = round(random.uniform(7.0, 9.0), 2)

        if short_circuit:
            current = random.randint(900, 1300)
            voltage = round(random.uniform(1.5, 4.5), 2)

        frequency = round(random.uniform(49.8, 50.2), 2)
        harmonics = round(random.uniform(1.0, 5.0), 2)

        if voltage_instability:
            voltage = round(random.choice((random.uniform(7.5, 8.8), random.uniform(11.1, 11.8))), 2)
            frequency = round(random.choice((random.uniform(48.8, 49.4), random.uniform(50.6, 51.1))), 2)

        if harmonics_spike:
            harmonics = round(random.uniform(8.0, 15.0), 2)

        winding_temp = oil_temp + random.randint(5, 15)
        if cooling_failure:
            oil_temp = random.randint(98, 115)
            winding_temp = oil_temp + random.randint(25, 38)

        oil_level = random.randint(70, 100)
        oil_pressure = round(random.uniform(1.0, 2.0), 2)
        hydrogen = random.randint(0, 25)
        methane = random.randint(0, 10)
        acetylene = random.randint(0, 3)

        if insulation_degradation:
            hydrogen = random.randint(45, 120)
            methane = random.randint(18, 45)
        if oil_leak:
            oil_level = random.randint(35, 60)
            oil_pressure = round(random.uniform(0.4, 0.8), 2)
        if arc_discharge:
            hydrogen = random.randint(90, 180)
            acetylene = random.randint(8, 24)

        active_power = random.randint(1000, 3000)
        if feeder_failure:
            voltage = round(random.uniform(3.5, 6.0), 2)
            current = 0
            active_power = 0
        if transformer_trip:
            voltage = 0
            current = 0
            active_power = 0

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

                "frequency_hz": frequency,

                "active_power_kw": active_power,

                "reactive_power_kvar": random.randint(100, 500),

                "harmonics_thd": harmonics
            },

            "thermal": {

                "oil_temp_c": oil_temp,

                "winding_temp_c": winding_temp,

                "busbar_temp_c": random.randint(30, 70),

                "ambient_temp_c": random.randint(-5, 35)
            },

            "oil_gas": {

                "oil_level_percent": oil_level,

                "oil_pressure_bar": oil_pressure,

                "humidity_ppm": random.randint(5, 40),

                "hydrogen_ppm": hydrogen,

                "methane_ppm": methane,

                "acetylene_ppm": acetylene
            },

            "alarms": {
                "overload": overload,

                "overheating": overheating,

                "sensor_failure": sensor_failure,

                "offline": offline,

                "voltage_drop": voltage_drop,
                "short_circuit": short_circuit,
                "voltage_instability": voltage_instability,
                "frequency_instability": voltage_instability,
                "harmonics_spike": harmonics_spike,
                "cooling_failure": cooling_failure,
                "insulation_degradation": insulation_degradation,
                "oil_leak": oil_leak,
                "arc_discharge": arc_discharge,
                "feeder_failure": feeder_failure,
                "transformer_trip": transformer_trip
            }
        }

        result = self.mqtt_client.publish(
            f"trafostanice/{station['id']}/sensors",
            json.dumps(payload),
            qos=0,
        )
        if result.rc != mqtt.MQTT_ERR_SUCCESS:
            raise RuntimeError(f"MQTT publish failed with code {result.rc}")
