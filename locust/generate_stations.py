import random
import json

stations = []

CENTER_LAT = 46.3844
CENTER_LON = 16.4339

for i in range(1000):

    lat_offset = random.uniform(-0.05, 0.05)
    lon_offset = random.uniform(-0.05, 0.05)

    station = {
        "id": f"TS-{i+1:04}",
        "name": f"Trafostanica {i+1}",
        "lat": round(CENTER_LAT + lat_offset, 6),
        "lon": round(CENTER_LON + lon_offset, 6)
    }

    stations.append(station)

with open("stations.json", "w") as f:
    json.dump(stations, f, indent=2)

print("Generated 1000 stations")