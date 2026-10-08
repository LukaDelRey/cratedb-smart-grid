from collections import defaultdict, deque
from app.services.asset_intelligence import station_prediction
from app.services.grid_analytics import nominal_voltage_kv, nested_value


def _clamp(value, minimum=0.0, maximum=100.0):
    return max(minimum, min(maximum, float(value)))


def _station_id(station):
    return station.get("station_id") or station.get("id")


def _line_value(line, *keys):
    for key in keys:
        value = line.get(key)
        if value is not None:
            return value
    return None


def simulate_grid_physics(stations, lines, failed_asset_id=None):
    station_map = {
        _station_id(station): station for station in stations if _station_id(station)
    }
    adjacency = defaultdict(list)

    for line in lines:
        source = _line_value(line, "from_station", "fromStation", "from")
        target = _line_value(line, "to_station", "toStation", "to")
        if source in station_map and target in station_map:
            adjacency[source].append(target)
            adjacency[target].append(source)

    node_state = {}
    failed = set()
    for node_id, station in station_map.items():
        electrical = station.get("electrical") or {}
        alarms = station.get("alarms") or {}
        measured_voltage = float(electrical.get("voltage_kv") or 0)
        nominal_voltage = nominal_voltage_kv(measured_voltage) or 10
        current = float(electrical.get("current_a") or 0)
        power_mw = float(electrical.get("active_power_kw") or 0) / 1000
        offline = bool(alarms.get("offline") or alarms.get("transformer_trip"))

        if node_id == failed_asset_id or offline:
            failed.add(node_id)

        load_pu = _clamp(current / 500, 0, 1.8)
        voltage_pu = measured_voltage / nominal_voltage if measured_voltage > 0 else 0
        node_state[node_id] = {
            "id": node_id,
            "demandMW": round(power_mw, 3),
            "loadPu": round(load_pu, 4),
            "measuredVoltagePu": round(voltage_pu, 4),
            "phaseAngleRad": -load_pu * 0.045,
            "failed": node_id in failed,
            "prediction": station_prediction(station),
        }

    affected_depth = {}
    queue = deque((node_id, 0) for node_id in failed)
    while queue:
        node_id, depth = queue.popleft()
        if node_id in affected_depth and affected_depth[node_id] <= depth:
            continue
        affected_depth[node_id] = depth
        if depth >= 3:
            continue
        for neighbor in adjacency[node_id]:
            queue.append((neighbor, depth + 1))

    edges = []
    total_losses = 0.0
    overloaded = 0
    for line in lines:
        source = _line_value(line, "from_station", "fromStation", "from")
        target = _line_value(line, "to_station", "toStation", "to")
        if source not in node_state or target not in node_state:
            continue

        a = node_state[source]
        b = node_state[target]
        reactance = 0.08 + (len(adjacency[source]) + len(adjacency[target])) * 0.004
        transfer_mw = abs(a["phaseAngleRad"] - b["phaseAngleRad"]) / reactance * 10
        served_load = (a["demandMW"] + b["demandMW"]) * 0.5
        flow_mw = transfer_mw + served_load
        cascade_factor = 1.0
        if source in affected_depth:
            cascade_factor += max(0.0, 0.55 - affected_depth[source] * 0.14)
        if target in affected_depth:
            cascade_factor += max(0.0, 0.55 - affected_depth[target] * 0.14)
        flow_mw *= cascade_factor
        capacity_mw = max(4.0, float(_line_value(line, "capacityMW") or 8.0))
        load_pct = _clamp(flow_mw / capacity_mw * 100, 0, 180)
        resistance = reactance * 0.18
        loss_mw = (flow_mw / capacity_mw) ** 2 * resistance
        total_losses += loss_mw
        if load_pct >= 100:
            overloaded += 1

        edges.append(
            {
                "id": _line_value(line, "line_id", "id") or f"{source}-{target}",
                "from": source,
                "to": target,
                "flowMW": round(flow_mw, 3),
                "capacityMW": round(capacity_mw, 2),
                "loadPct": round(load_pct, 1),
                "lossMW": round(loss_mw, 4),
                "status": (
                    "CRITICAL"
                    if load_pct >= 100
                    else "WARNING" if load_pct >= 80 else "ONLINE"
                ),
            }
        )

    nodes = []
    low_voltage_nodes = 0
    for node_id, state in node_state.items():
        depth = affected_depth.get(node_id)
        propagation_penalty = 0 if depth is None else max(0.0, 0.18 - depth * 0.045)
        voltage_pu = (
            0
            if state["failed"]
            else max(
                0.65,
                state["measuredVoltagePu"]
                - state["loadPu"] * 0.018
                - propagation_penalty,
            )
        )
        current = float(
            nested_value(station_map[node_id], "electrical", "current_a") or 0
        )
        thermal_loss_index = (current / 500) ** 2
        if voltage_pu < 0.95:
            low_voltage_nodes += 1

        nodes.append(
            {
                **state,
                "voltagePu": round(voltage_pu, 4),
                "thermalLossIndex": round(thermal_loss_index, 4),
                "cascadeDepth": depth,
                "stress": (
                    "FAILED"
                    if state["failed"]
                    else (
                        "HIGH"
                        if voltage_pu < 0.95 or thermal_loss_index > 1
                        else "NORMAL"
                    )
                ),
            }
        )

    cascade_risk = _clamp(
        len(affected_depth) / max(len(nodes), 1) * 100
        + overloaded * 4
        + low_voltage_nodes * 1.5
    )
    total_demand = sum(node["demandMW"] for node in nodes)
    return {
        "model": "simplified-dc-coupled",
        "summary": {
            "nodes": len(nodes),
            "lines": len(edges),
            "totalDemandMW": round(total_demand, 2),
            "estimatedLossMW": round(total_losses, 3),
            "overloadedLines": overloaded,
            "lowVoltageNodes": low_voltage_nodes,
            "failedNodes": len(failed),
            "cascadeRisk": round(cascade_risk, 1),
        },
        "nodes": nodes,
        "edges": edges,
    }
