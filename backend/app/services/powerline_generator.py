# from math import sqrt
# from shared.generate_stations import stations


# def distance(a, b):

#     return sqrt(
#         (a["lat"] - b["lat"]) ** 2 +
#         (a["lon"] - b["lon"]) ** 2
#     )


# def get_line_status(load_pct):

#     if load_pct >= 90:
#         return "CRITICAL"

#     if load_pct >= 75:
#         return "WARNING"

#     return "ONLINE"


# def generate_power_lines():

#     lines = []
#     used_edges = set()

#     max_connections_per_station = 2
#     max_lines = 260

#     for i, current in enumerate(stations):

#         candidates = []

#         for j, other in enumerate(stations):

#             if i == j:
#                 continue

#             candidates.append({
#                 "station": other,
#                 "distance": distance(current, other)
#             })

#         candidates.sort(
#             key=lambda item: item["distance"]
#         )

#         nearest = candidates[
#             :max_connections_per_station
#         ]

#         for item in nearest:

#             target = item["station"]

#             edge_key = tuple(
#                 sorted([
#                     current["id"],
#                     target["id"]
#                 ])
#             )

#             if edge_key in used_edges:
#                 continue

#             used_edges.add(edge_key)

#             load_pct = 35 + (len(lines) % 55)

#             voltage = (
#                 400
#                 if len(lines) % 19 == 0
#                 else 220
#                 if len(lines) % 7 == 0
#                 else 110
#             )

#             lines.append({
#                 "line_id": f"LINE-{len(lines) + 1:04}",
#                 "from_station": current["id"],
#                 "to_station": target["id"],
#                 "from_coords": [
#                     current["lat"],
#                     current["lon"]
#                 ],
#                 "to_coords": [
#                     target["lat"],
#                     target["lon"]
#                 ],
#                 "voltage_kv": voltage,
#                 "load_pct": load_pct,
#                 "status": get_line_status(load_pct)
#             })

#             if len(lines) >= max_lines:
#                 return lines

#     return lines


from math import sqrt


def parse_location(location):

    match = (
        location
        .replace("(", "")
        .replace(")", "")
        .split(",")
    )

    lon = float(match[0])
    lat = float(match[1])

    return lat, lon


def normalize_station(station):

    if "station_id" in station:

        lat, lon = parse_location(
            station["location"]
        )

        return {
            "id": station["station_id"],
            "lat": lat,
            "lon": lon
        }

    return {
        "id": station["id"],
        "lat": station["lat"],
        "lon": station["lon"]
    }


def distance(a, b):

    return sqrt(
        (a["lat"] - b["lat"]) ** 2 +
        (a["lon"] - b["lon"]) ** 2
    )


def get_line_status(load_pct):

    if load_pct >= 90:
        return "CRITICAL"

    if load_pct >= 75:
        return "WARNING"

    return "ONLINE"


class UnionFind:

    def __init__(self, items):

        self.parent = {
            item: item
            for item in items
        }

    def find(self, item):

        if self.parent[item] != item:
            self.parent[item] = self.find(
                self.parent[item]
            )

        return self.parent[item]

    def union(self, a, b):

        root_a = self.find(a)
        root_b = self.find(b)

        if root_a == root_b:
            return False

        self.parent[root_b] = root_a

        return True


def generate_power_lines(source_stations):

    nodes = [
        normalize_station(station)
        for station in source_stations
        if station.get("location") or station.get("lat")
    ]

    if len(nodes) < 2:
        return []

    edges = []

    for i, a in enumerate(nodes):

        for b in nodes[i + 1:]:

            edges.append({
                "from": a,
                "to": b,
                "distance": distance(a, b)
            })

    edges.sort(
        key=lambda edge: edge["distance"]
    )

    uf = UnionFind([
        node["id"]
        for node in nodes
    ])

    lines = []
    used_edges = set()

    # MST: poveže sve vidljive trafostanice najkraćim mogućim lokalnim vezama
    for edge in edges:

        a = edge["from"]
        b = edge["to"]

        if not uf.union(a["id"], b["id"]):
            continue

        used_edges.add(
            tuple(sorted([a["id"], b["id"]]))
        )

        lines.append(
            build_line(lines, a, b)
        )

        if len(lines) >= len(nodes) - 1:
            break

    # Malo dodatnih kratkih veza da mreža izgleda prirodnije
    extra_limit = int(len(nodes) * 0.15)

    for edge in edges:

        if extra_limit <= 0:
            break

        a = edge["from"]
        b = edge["to"]

        key = tuple(
            sorted([a["id"], b["id"]])
        )

        if key in used_edges:
            continue

        used_edges.add(key)

        lines.append(
            build_line(lines, a, b)
        )

        extra_limit -= 1

    return lines


def build_line(lines, a, b):

    load_pct = 35 + (len(lines) % 55)

    voltage = (
        400
        if len(lines) % 19 == 0
        else 220
        if len(lines) % 7 == 0
        else 110
    )

    return {
        "line_id": f"LINE-{len(lines) + 1:04}",
        "from_station": a["id"],
        "to_station": b["id"],
        "from_coords": [
            a["lat"],
            a["lon"]
        ],
        "to_coords": [
            b["lat"],
            b["lon"]
        ],
        "voltage_kv": voltage,
        "load_pct": load_pct,
        "status": get_line_status(load_pct)
    }