import json
import random
from pathlib import Path

stations = []

CENTER_LAT = 46.3844
CENTER_LON = 16.4339

stations_file = Path(__file__).parent / "stations.json"


def generate_stations(count=1000):

    generated = []

    for i in range(count):

        lat_offset = random.uniform(-0.05, 0.05)
        lon_offset = random.uniform(-0.05, 0.05)

        station = {
            "id": f"TS-{i+1:04}",
            "name": f"Trafostanica {i+1}",
            "lat": round(CENTER_LAT + lat_offset, 6),
            "lon": round(CENTER_LON + lon_offset, 6)
        }

        generated.append(station)

    return generated


def save_stations(data):

    with open(stations_file, "w") as f:
        json.dump(data, f, indent=2)


def load_stations():

    if not stations_file.exists():

        data = generate_stations()

        save_stations(data)

        return data

    with open(stations_file, "r") as f:
        return json.load(f)


stations = load_stations()


if __name__ == "__main__":

    stations = generate_stations()

    save_stations(stations)

    print(f"Generated {len(stations)} stations")