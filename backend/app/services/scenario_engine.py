import asyncio
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from crate import client

from app.config import CRATE_URL
from app.services.mqtt_client import publish_sensor_payload


PUBLISH_INTERVAL_SECONDS = 2

SCENARIO_DEFINITIONS = {
    "overload": {
        "label": "Transformer overload",
        "description": "Raises current and active power above the operating envelope.",
        "icon": "speed",
        "defaultDuration": 30,
        "multiAsset": False,
    },
    "overheating": {
        "label": "Thermal failure",
        "description": "Raises oil and winding temperature to a critical state.",
        "icon": "device_thermostat",
        "defaultDuration": 30,
        "multiAsset": False,
    },
    "short_circuit": {
        "label": "Short circuit",
        "description": "Combines a severe current surge with voltage collapse.",
        "icon": "flash_on",
        "defaultDuration": 20,
        "multiAsset": False,
    },
    "voltage_instability": {
        "label": "Voltage instability",
        "description": "Forces voltage and frequency outside the stable operating band.",
        "icon": "ssid_chart",
        "defaultDuration": 30,
        "multiAsset": False,
    },
    "harmonics_spike": {
        "label": "Harmonics spike",
        "description": "Raises THD to simulate a severe power-quality event.",
        "icon": "multiline_chart",
        "defaultDuration": 30,
        "multiAsset": False,
    },
    "cooling_failure": {
        "label": "Cooling failure",
        "description": "Accelerates winding and oil heating after cooling loss.",
        "icon": "mode_fan_off",
        "defaultDuration": 40,
        "multiAsset": False,
    },
    "insulation_degradation": {
        "label": "Insulation degradation",
        "description": "Raises dissolved gases associated with insulation aging.",
        "icon": "science",
        "defaultDuration": 45,
        "multiAsset": False,
    },
    "oil_leak": {
        "label": "Oil leak",
        "description": "Drops transformer oil level and pressure.",
        "icon": "oil_barrel",
        "defaultDuration": 35,
        "multiAsset": False,
    },
    "arc_discharge": {
        "label": "Arc discharge",
        "description": "Injects an acetylene and hydrogen discharge signature.",
        "icon": "electric_bolt",
        "defaultDuration": 25,
        "multiAsset": False,
    },
    "feeder_failure": {
        "label": "Feeder failure",
        "description": "Drops feeder delivery and propagates low voltage to connected assets.",
        "icon": "power_input",
        "defaultDuration": 40,
        "multiAsset": True,
    },
    "transformer_trip": {
        "label": "Transformer trip",
        "description": "Trips one transformer and removes its electrical output.",
        "icon": "power_settings_new",
        "defaultDuration": 30,
        "multiAsset": False,
    },
    "heatwave": {
        "label": "Heatwave",
        "description": "Raises ambient and transformer temperatures across a region.",
        "icon": "wb_sunny",
        "defaultDuration": 60,
        "multiAsset": True,
    },
    "peak_consumption": {
        "label": "Peak consumption",
        "description": "Raises load and active power across multiple stations.",
        "icon": "trending_up",
        "defaultDuration": 60,
        "multiAsset": True,
    },
    "storm": {
        "label": "Storm",
        "description": "Combines feeder, voltage and telemetry faults across a corridor.",
        "icon": "thunderstorm",
        "defaultDuration": 60,
        "multiAsset": True,
    },
    "voltage_drop": {
        "label": "Voltage drop",
        "description": "Forces the selected station below the voltage threshold.",
        "icon": "bolt",
        "defaultDuration": 30,
        "multiAsset": False,
    },
    "sensor_failure": {
        "label": "Sensor failure",
        "description": "Emits a telemetry quality failure for the selected station.",
        "icon": "sensors_off",
        "defaultDuration": 30,
        "multiAsset": False,
    },
    "offline": {
        "label": "Station offline",
        "description": "Simulates loss of telemetry and station availability.",
        "icon": "power_off",
        "defaultDuration": 30,
        "multiAsset": False,
    },
    "blackout": {
        "label": "Regional blackout",
        "description": "Takes a controlled group of stations offline.",
        "icon": "crisis_alert",
        "defaultDuration": 45,
        "multiAsset": True,
    },
    "cascade": {
        "label": "Cascading failure",
        "description": "Propagates overload, voltage and thermal faults across several stations.",
        "icon": "account_tree",
        "defaultDuration": 45,
        "multiAsset": True,
    },
}

_runs = {}
_tasks = {}


def _connection():
    return client.connect(CRATE_URL)


def _utcnow():
    return datetime.now(timezone.utc)


def _timestamp():
    return _utcnow().strftime("%Y-%m-%d %H:%M:%S")


def _station_priority(station):
    alarms = sum(1 for enabled in (station.get("alarms") or {}).values() if enabled)
    current = float((station.get("electrical") or {}).get("current_a") or 0)
    oil_temp = float((station.get("thermal") or {}).get("oil_temp_c") or 0)
    return alarms * 1000 + current + oil_temp * 2


def _public_run(run):
    return {
        key: value
        for key, value in run.items()
        if key not in {"baselines"}
    }


def scenario_definitions():
    return [
        {"type": scenario_type, **definition}
        for scenario_type, definition in SCENARIO_DEFINITIONS.items()
    ]


def _insert_run(run):
    cursor = _connection().cursor()
    cursor.execute(
        """
        INSERT INTO scenario_runs (
            id, scenario_type, status, requested_by, started_at, ends_at,
            completed_at, duration_seconds, target_station_ids,
            emitted_events, error
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            run["id"],
            run["scenario_type"],
            run["status"],
            run["requested_by"],
            run["started_at"],
            run["ends_at"],
            run.get("completed_at"),
            run["duration_seconds"],
            ",".join(run["target_station_ids"]),
            run["emitted_events"],
            run.get("error"),
        ),
    )


def _update_run(run):
    cursor = _connection().cursor()
    cursor.execute(
        """
        UPDATE scenario_runs
        SET status = ?, completed_at = ?, emitted_events = ?, error = ?
        WHERE id = ?
        """,
        (
            run["status"],
            run.get("completed_at"),
            run["emitted_events"],
            run.get("error"),
            run["id"],
        ),
    )


def _fault_payload(baseline, scenario_type, target_index):
    payload = deepcopy(baseline)
    payload["timestamp"] = _timestamp()
    electrical = payload.setdefault("electrical", {})
    thermal = payload.setdefault("thermal", {})
    oil_gas = payload.setdefault("oil_gas", {})
    alarms = payload.setdefault("alarms", {})

    for alarm_name in ("overload", "overheating", "sensor_failure", "offline", "voltage_drop"):
        alarms.setdefault(alarm_name, False)

    effective_type = scenario_type
    if scenario_type == "cascade":
        effective_type = ("overload", "voltage_drop", "overheating", "offline")[target_index % 4]
    elif scenario_type == "storm":
        effective_type = ("feeder_failure", "voltage_instability", "sensor_failure")[target_index % 3]

    if effective_type == "overload":
        electrical["current_a"] = max(float(electrical.get("current_a") or 0), 650 + target_index * 12)
        electrical["active_power_kw"] = max(float(electrical.get("active_power_kw") or 0), 4200)
        alarms["overload"] = True
    elif effective_type == "overheating":
        thermal["oil_temp_c"] = max(float(thermal.get("oil_temp_c") or 0), 112)
        thermal["winding_temp_c"] = max(float(thermal.get("winding_temp_c") or 0), 128)
        alarms["overheating"] = True
    elif effective_type == "voltage_drop":
        electrical["voltage_kv"] = min(float(electrical.get("voltage_kv") or 10), 7.8)
        alarms["voltage_drop"] = True
    elif effective_type == "sensor_failure":
        alarms["sensor_failure"] = True
    elif effective_type == "short_circuit":
        electrical["current_a"] = max(float(electrical.get("current_a") or 0), 1100)
        electrical["voltage_kv"] = min(float(electrical.get("voltage_kv") or 10), 2.5)
        electrical["active_power_kw"] = 0
        alarms["short_circuit"] = True
    elif effective_type == "voltage_instability":
        electrical["voltage_kv"] = 11.4 if target_index % 2 else 8.4
        electrical["frequency_hz"] = 49.3 if target_index % 2 else 50.7
        alarms["voltage_instability"] = True
        alarms["frequency_instability"] = True
    elif effective_type == "harmonics_spike":
        electrical["harmonics_thd"] = max(float(electrical.get("harmonics_thd") or 0), 12)
        alarms["harmonics_spike"] = True
    elif effective_type == "cooling_failure":
        thermal["oil_temp_c"] = max(float(thermal.get("oil_temp_c") or 0), 108)
        thermal["winding_temp_c"] = max(float(thermal.get("winding_temp_c") or 0), 138)
        thermal["busbar_temp_c"] = max(float(thermal.get("busbar_temp_c") or 0), 95)
        alarms["cooling_failure"] = True
        alarms["overheating"] = True
    elif effective_type == "insulation_degradation":
        oil_gas["hydrogen_ppm"] = max(float(oil_gas.get("hydrogen_ppm") or 0), 85)
        oil_gas["methane_ppm"] = max(float(oil_gas.get("methane_ppm") or 0), 34)
        alarms["insulation_degradation"] = True
    elif effective_type == "oil_leak":
        oil_gas["oil_level_percent"] = min(float(oil_gas.get("oil_level_percent") or 100), 48)
        oil_gas["oil_pressure_bar"] = min(float(oil_gas.get("oil_pressure_bar") or 1.5), 0.6)
        alarms["oil_leak"] = True
    elif effective_type == "arc_discharge":
        oil_gas["acetylene_ppm"] = max(float(oil_gas.get("acetylene_ppm") or 0), 18)
        oil_gas["hydrogen_ppm"] = max(float(oil_gas.get("hydrogen_ppm") or 0), 120)
        alarms["arc_discharge"] = True
    elif effective_type == "feeder_failure":
        electrical["voltage_kv"] = min(float(electrical.get("voltage_kv") or 10), 5.5)
        electrical["active_power_kw"] = 0
        electrical["current_a"] = 0
        alarms["feeder_failure"] = True
        alarms["voltage_drop"] = True
    elif effective_type == "transformer_trip":
        electrical["voltage_kv"] = 0
        electrical["current_a"] = 0
        electrical["active_power_kw"] = 0
        alarms["transformer_trip"] = True
        alarms["offline"] = True
    elif effective_type == "heatwave":
        thermal["ambient_temp_c"] = float(thermal.get("ambient_temp_c") or 20) + 15
        thermal["oil_temp_c"] = float(thermal.get("oil_temp_c") or 60) + 12
        thermal["winding_temp_c"] = float(thermal.get("winding_temp_c") or 70) + 15
        alarms["overheating"] = thermal["oil_temp_c"] >= 90
    elif effective_type == "peak_consumption":
        electrical["current_a"] = float(electrical.get("current_a") or 250) * 1.4
        electrical["active_power_kw"] = float(electrical.get("active_power_kw") or 1800) * 1.4
        alarms["overload"] = electrical["current_a"] >= 500
    elif effective_type in {"offline", "blackout"}:
        electrical["voltage_kv"] = 0
        electrical["current_a"] = 0
        electrical["active_power_kw"] = 0
        alarms["offline"] = True
        if effective_type == "blackout":
            alarms["voltage_drop"] = True

    return payload


def _restored_payload(baseline, scenario_type, target_index):
    payload = deepcopy(baseline)
    payload["timestamp"] = _timestamp()
    return payload


async def _execute_scenario(run):
    cancelled = False

    try:
        deadline = asyncio.get_running_loop().time() + run["duration_seconds"]

        while asyncio.get_running_loop().time() < deadline:
            for index, baseline in enumerate(run["baselines"]):
                publish_sensor_payload(_fault_payload(baseline, run["scenario_type"], index))
                run["emitted_events"] += 1

            remaining = max(0, deadline - asyncio.get_running_loop().time())
            run["progress"] = round(1 - remaining / run["duration_seconds"], 3)
            await asyncio.sleep(min(PUBLISH_INTERVAL_SECONDS, remaining))

        run["status"] = "COMPLETED"
        run["progress"] = 1
    except asyncio.CancelledError:
        cancelled = True
        run["status"] = "STOPPED"
    except Exception as exc:
        run["status"] = "FAILED"
        run["error"] = str(exc)
    finally:
        for index, baseline in enumerate(run["baselines"]):
            try:
                publish_sensor_payload(_restored_payload(baseline, run["scenario_type"], index))
            except Exception as exc:
                run["error"] = run.get("error") or f"State restoration failed: {exc}"

        run["completed_at"] = _utcnow()
        await asyncio.to_thread(_update_run, run)
        _tasks.pop(run["id"], None)

    if cancelled:
        return


async def start_scenario(
    scenario_type,
    stations,
    station_id=None,
    duration_seconds=30,
    target_count=1,
    requested_by="operator",
):
    if scenario_type not in SCENARIO_DEFINITIONS:
        raise ValueError("Unknown scenario type")
    if not stations:
        raise RuntimeError("No station telemetry is available")

    duration_seconds = max(10, min(int(duration_seconds), 300))
    target_count = max(1, min(int(target_count), 20))
    multi_asset = SCENARIO_DEFINITIONS[scenario_type]["multiAsset"]
    if not multi_asset:
        target_count = 1
    elif scenario_type in {"blackout", "cascade", "feeder_failure", "heatwave", "peak_consumption", "storm"}:
        target_count = max(3, target_count)

    candidates = sorted(stations, key=_station_priority, reverse=True)
    if station_id:
        selected = next((station for station in candidates if station.get("station_id") == station_id), None)
        if selected is None:
            raise ValueError("Selected station was not found")
        candidates = [selected] + [station for station in candidates if station is not selected]

    baselines = [deepcopy(station) for station in candidates[:target_count]]
    started_at = _utcnow()
    run = {
        "id": str(uuid4()),
        "scenario_type": scenario_type,
        "status": "RUNNING",
        "requested_by": requested_by,
        "started_at": started_at,
        "ends_at": started_at + timedelta(seconds=duration_seconds),
        "completed_at": None,
        "duration_seconds": duration_seconds,
        "target_station_ids": [station.get("station_id") for station in baselines],
        "emitted_events": 0,
        "progress": 0,
        "error": None,
        "baselines": baselines,
    }

    await asyncio.to_thread(_insert_run, run)
    _runs[run["id"]] = run
    _tasks[run["id"]] = asyncio.create_task(_execute_scenario(run))
    return _public_run(run)


def _database_runs(limit=100):
    cursor = _connection().cursor()
    safe_limit = max(1, min(int(limit), 500))
    cursor.execute(
        f"""
        SELECT *
        FROM scenario_runs
        ORDER BY started_at DESC
        LIMIT {safe_limit}
        """
    )
    columns = [column[0] for column in cursor.description]
    results = []

    for row in cursor.fetchall():
        item = dict(zip(columns, row))
        item["target_station_ids"] = [
            station_id
            for station_id in (item.get("target_station_ids") or "").split(",")
            if station_id
        ]
        item["progress"] = 1 if item.get("status") in {"COMPLETED", "STOPPED", "FAILED"} else 0
        results.append(item)

    return results


async def list_scenario_runs(limit=100):
    stored = await asyncio.to_thread(_database_runs, limit)
    merged = {item["id"]: item for item in stored}
    merged.update({run_id: _public_run(run) for run_id, run in _runs.items()})
    return sorted(merged.values(), key=lambda item: item.get("started_at") or "", reverse=True)[:limit]


async def stop_scenario(run_id):
    run = _runs.get(run_id)
    task = _tasks.get(run_id)

    if run is None or task is None:
        return None
    if task.done():
        return _public_run(run)

    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        # A task cancelled before its first step never enters its own finally.
        run["status"] = "STOPPED"
        run["completed_at"] = _utcnow()
        await asyncio.to_thread(_update_run, run)
        _tasks.pop(run_id, None)
    return _public_run(run)


async def stop_all_scenarios():
    active_ids = [run_id for run_id, task in _tasks.items() if not task.done()]
    if active_ids:
        await asyncio.gather(*(stop_scenario(run_id) for run_id in active_ids))
