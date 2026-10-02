import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
from datetime import timezone
from statistics import mean
from threading import Lock
from time import monotonic
from time import perf_counter

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi import WebSocket
from fastapi import WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from crate import client
from pydantic import BaseModel
from pydantic import StrictFloat

from app.config import CRATE_URL, PERSIST_MQTT_TELEMETRY, cors_origins
from app.services.mqtt_client import is_mqtt_connected, start_mqtt, stop_mqtt
from app.db.init_db import init_db
from app.services.threshold_settings import load_settings, save_settings, settings_snapshot, DEFAULTS, threshold
from app.services.event_bus import event_queue
from app.services.websocket_manager import manager
from app.services.cleanup import cleanup_old_data
from app.services.alarm_repository import (
    alarm_stats,
    station_alarm_state,
    list_alarm_audit,
    list_alarms,
    reconcile_alarm_payload,
    transition_alarm,
)
from app.services.scenario_engine import (
    list_scenario_runs,
    scenario_definitions,
    start_scenario,
    stop_all_scenarios,
    stop_scenario,
)

from shared.generate_stations import stations

from app.services.grid_analytics import (
    calculate_station_health,
    calculate_station_risk,
    nested_value
)

from app.services.blackout_prediction import (
    calculate_blackout_probability
)

from app.services.powerline_generator import (
    generate_power_lines
)
from app.services.load_forecast import grid_load_forecast
from app.services.asset_intelligence import station_prediction, training_record
from app.services.grid_physics import simulate_grid_physics
from app.services.telemetry_repository import (
    insert_sensor_payload,
    recent_telemetry,
    station_history,
)


@asynccontextmanager
async def lifespan(app: FastAPI):

    loop = asyncio.get_running_loop()

    await asyncio.to_thread(init_db)
    await asyncio.to_thread(load_settings)
    await asyncio.to_thread(start_mqtt, loop)

    background_tasks = [
        asyncio.create_task(cleanup_old_data()),
        asyncio.create_task(event_loop()),
        asyncio.create_task(bootstrap_alarm_register()),
    ]

    print("Application started")

    try:
        yield
    finally:
        await stop_all_scenarios()
        for task in background_tasks:
            task.cancel()
        await asyncio.gather(*background_tasks, return_exceptions=True)
        stop_mqtt()
        print("Shutting down...")


app = FastAPI(lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AlarmActionRequest(BaseModel):
    actor: str = "operator"
    note: str | None = None


class ScenarioRunRequest(BaseModel):
    scenario_type: str
    station_id: str | None = None
    duration_seconds: int = 30
    target_count: int = 1
    requested_by: str = "operator"


def get_connection():
    return client.connect(CRATE_URL)


def location_to_lat_lon(location):

    match = (
        location
        .replace("(", "")
        .replace(")", "")
        .split(",")
    )

    lon = float(match[0])
    lat = float(match[1])

    return lat, lon


def has_alarm(station):

    return bool(station_alarm_state(station)["active_alarms"])


def station_id(station):

    return station.get("station_id") or station.get("id")


def station_name(station):

    return (
        station.get("station_name") or
        station.get("name") or
        station_id(station)
    )


def safe_average(values, default=0):

    clean_values = [
        value
        for value in values
        if value is not None
    ]

    if not clean_values:
        return default

    return round(mean(clean_values), 1)


def station_region(station):

    try:

        lat, lon = location_to_lat_lon(
            station["location"]
        )

        return "NORTH" if lat >= 46.38 else "SOUTH"

    except Exception:

        return "NORTH"


def build_forecast_points(stations, hours=12):

    if not stations:
        return []

    base_load = sum([
        nested_value(
            station,
            "electrical",
            "active_power_kw"
        )
        for station in stations
    ]) / 1000

    risk = safe_average([
        calculate_station_risk(station)
        for station in stations
    ])

    points = []

    for hour in range(hours):

        demand_shape = 1 + ((hour % 6) - 2) * 0.035
        risk_shape = risk * (0.85 + (hour % 4) * 0.06)

        points.append({
            "label": f"+{hour + 1}h",
            "loadMW": round(base_load * demand_shape, 1),
            "risk": min(100, round(risk_shape, 1)),
            "confidence": None,
            "method": "heuristic"
        })

    return points


def build_weather_payload(stations):

    risk = safe_average([
        calculate_station_risk(station)
        for station in stations
    ])

    avg_temp = safe_average([
        nested_value(
            station,
            "thermal",
            "ambient_temp_c",
            24
        )
        for station in stations
    ], 24)

    wind_risk = min(
        100,
        round(18 + risk * 0.28)
    )

    lightning_risk = min(
        100,
        round(10 + risk * 0.42)
    )

    storm_risk = min(
        100,
        round(14 + risk * 0.36)
    )

    return {
        "temperatureC": avg_temp,
        "estimated": True,
        "method": "station-risk proxy; no weather-service observations",
        "windRisk": wind_risk,
        "lightningRisk": lightning_risk,
        "stormRisk": storm_risk,
        "gridImpact": min(
            100,
            round((wind_risk + lightning_risk + storm_risk + risk) / 4)
        ),
        "alerts": [
            {
                "title": "Wind loading watch",
                "severity": "WARNING" if wind_risk > 45 else "INFO",
                "asset": "North transmission corridor"
            },
            {
                "title": "Lightning exposure",
                "severity": "CRITICAL" if lightning_risk > 65 else "INFO",
                "asset": "Outdoor substations"
            }
        ]
    }


def build_ai_insights(stations):

    if not stations:
        return []

    insights = []
    for station in stations:
        rules = [
            ("overload", nested_value(station, "electrical", "current_a") >= threshold("overload"),
             "High current threshold exceeded", "Review loading and available transfer capacity."),
            ("cooling", nested_value(station, "thermal", "oil_temp_c") >= 85,
             "Oil temperature threshold exceeded", "Inspect cooling and compare the temperature history."),
            ("maintenance", calculate_station_risk(station) >= 70,
             "Elevated heuristic risk score", "Review this asset before planning maintenance."),
        ]
        alarms = station.get("alarms") or {}
        alarm_insights = [
            ("voltage", ("voltage_drop", "overvoltage", "voltage_instability"),
             "Voltage quality alarm active", "Check voltage regulation, tap settings and feeder conditions."),
            ("frequency", ("frequency_instability",),
             "Frequency instability alarm active", "Compare frequency across nearby stations and review grid balance."),
            ("harmonics", ("harmonics_spike",),
             "Harmonic distortion alarm active", "Review nonlinear loads and inspect harmonic filtering."),
            ("insulation", ("insulation_degradation",),
             "Insulation degradation alarm active", "Review dissolved gas trends and schedule insulation diagnostics."),
            ("oil", ("oil_leak",),
             "Low oil level alarm active", "Inspect for oil leakage and verify the oil level sensor."),
            ("discharge", ("arc_discharge",),
             "Arc discharge alarm active", "Urgently review protection signals and dissolved gas measurements."),
        ]
        rules.extend(
            (kind, any(bool(alarms.get(flag)) for flag in flags), title, recommendation)
            for kind, flags, title, recommendation in alarm_insights
        )
        for kind, triggered, title, recommendation in rules:
            if triggered:
                insights.append({
                    "id": f"insight-{station_id(station)}-{kind}",
                    "type": kind, "title": title, "assetId": station_id(station),
                    "impact": ("Active telemetry alarm; no predicted failure time"
                               if kind in {entry[0] for entry in alarm_insights}
                               else "Current telemetry threshold; no predicted failure time"),
                    "confidence": None, "method": "heuristic",
                    "severity": "WARNING", "recommendation": recommendation,
                })
    return insights


def build_alarm_correlations(stations):

    alarmed = [
        station
        for station in stations
        if has_alarm(station)
    ]

    grouped = []

    cause_map = [
        ("overheating", "Cooling System Failure", "CRITICAL"),
        ("cooling_failure", "Cooling System Failure", "CRITICAL"),
        ("overload", "Transformer Overload", "WARNING"),
        ("voltage_drop", "Grid Instability", "WARNING"),
        ("voltage_instability", "Voltage Instability", "CRITICAL"),
        ("frequency_instability", "Frequency Instability", "CRITICAL"),
        ("harmonics_spike", "Power Quality Degradation", "WARNING"),
        ("short_circuit", "Short Circuit", "CRITICAL"),
        ("insulation_degradation", "Insulation Degradation", "WARNING"),
        ("oil_leak", "Transformer Oil Leak", "CRITICAL"),
        ("arc_discharge", "Internal Arc Discharge", "CRITICAL"),
        ("feeder_failure", "Feeder Failure", "CRITICAL"),
        ("transformer_trip", "Transformer Trip", "CRITICAL"),
        ("sensor_failure", "Telemetry Degradation", "INFO"),
        ("offline", "Asset Offline", "CRITICAL")
    ]

    for key, title, severity in cause_map:

        assets = [
            station
            for station in alarmed
            if (station.get("alarms") or {}).get(key)
        ]

        if not assets:
            continue

        grouped.append({
            "id": f"corr-{key}",
            "title": title,
            "severity": severity,
            "confidence": min(98, 72 + len(assets) * 4),
            "affectedAssets": [
                station_id(station)
                for station in assets[:8]
            ],
            "relatedAlarmCount": len(assets),
            "rootCause": title,
            "nextAction": "Open digital twin and run contingency analysis."
        })

    return grouped


def build_topology(
    stations,
    mqtt_connected=True,
    database_connected=True,
    websocket_clients=0,
):

    telemetry_active = bool(stations)
    statuses = [
        "online" if telemetry_active else "degraded",
        "online" if mqtt_connected else "offline",
        "online",
        "online" if database_connected else "offline",
        "online",
        "online" if telemetry_active else "degraded",
        "online" if telemetry_active else "degraded",
    ]
    health_penalty = sum(
        20 if status == "offline" else 8 if status == "degraded" else 0
        for status in statuses
    )

    return {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "platformHealth": max(0, 100 - health_penalty),
        "nodes": [
            {
                "id": "locust",
                "label": "Locust Simulator",
                "status": statuses[0],
                "metric": f"{len(stations)} active station states" if telemetry_active else "waiting for telemetry"
            },
            {
                "id": "emqx",
                "label": "EMQX MQTT",
                "status": statuses[1],
                "metric": "connected" if mqtt_connected else "disconnected"
            },
            {
                "id": "fastapi",
                "label": "FastAPI Gateway",
                "status": statuses[2],
                "metric": f"{websocket_clients} websocket clients"
            },
            {
                "id": "cratedb",
                "label": "CrateDB",
                "status": statuses[3],
                "metric": f"{len(stations)} latest states" if database_connected else "unavailable"
            },
            {
                "id": "dashboard",
                "label": "Vue Dashboard",
                "status": statuses[4],
                "metric": "realtime"
            },
            {
                "id": "ai",
                "label": "Predictive Analytics",
                "status": statuses[5],
                "metric": "health, risk, anomaly and lifetime scoring"
            },
            {
                "id": "physics",
                "label": "Grid Physics",
                "status": statuses[6],
                "metric": "load flow, thermal loss and cascade model"
            }
        ],
        "edges": [
            ["locust", "emqx"],
            ["emqx", "fastapi"],
            ["fastapi", "ai"],
            ["fastapi", "physics"],
            ["ai", "cratedb"],
            ["physics", "cratedb"],
            ["fastapi", "dashboard"],
            ["fastapi", "cratedb"]
        ]
    }


_latest_station_cache = []
_latest_station_cache_at = 0.0
_latest_station_cache_lock = Lock()
LATEST_STATION_CACHE_SECONDS = 2
_alarm_reconcile_lock = asyncio.Lock()
_power_line_cache = []
_power_line_cache_key = ()
_power_line_cache_lock = Lock()


def telemetry_time(payload):
    value = payload.get("timestamp")
    if isinstance(value, (int, float)):
        return value / 1000 if value > 100_000_000_000 else value
    if isinstance(value, datetime):
        return value.replace(tzinfo=value.tzinfo or timezone.utc).timestamp()
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed.replace(tzinfo=parsed.tzinfo or timezone.utc).timestamp()
    except (ValueError, TypeError):
        return 0


def cache_latest_station_payload(payload):
    """Replace one station atomically; delayed telemetry cannot restore old alarms."""
    payload_id = station_id(payload)
    if not payload_id:
        return False
    payload = station_alarm_state(payload)
    with _latest_station_cache_lock:
        for index, station in enumerate(_latest_station_cache):
            if station_id(station) == payload_id:
                if telemetry_time(payload) < telemetry_time(station):
                    return False
                _latest_station_cache[index] = payload
                break
        else:
            _latest_station_cache.append(payload)
    return True


def fetch_latest_station_states(limit=10000, force_refresh=False):
    global _latest_station_cache, _latest_station_cache_at

    with _latest_station_cache_lock:
        cache_age = monotonic() - _latest_station_cache_at
        if (
            not force_refresh
            and _latest_station_cache
            and cache_age < LATEST_STATION_CACHE_SECONDS
        ):
            return [station_alarm_state(station) for station in _latest_station_cache]

        try:
            connection = get_connection()
            cursor = connection.cursor()

            safe_limit = max(1, min(int(limit), 50000))
            cursor.execute(f"""
                SELECT sensors.*
                FROM trafostanice_sensors sensors
                INNER JOIN (
                    SELECT station_id, MAX(timestamp) AS latest_timestamp
                    FROM trafostanice_sensors
                    GROUP BY station_id
                ) latest ON sensors.station_id = latest.station_id
                    AND sensors.timestamp = latest.latest_timestamp
                ORDER BY sensors.timestamp DESC
                LIMIT {safe_limit}
            """)

            rows = cursor.fetchall()

            columns = [
                col[0]
                for col in cursor.description
            ]

            latest = {}

            for row in rows:

                station = dict(
                    zip(columns, row)
                )

                current_station_id = station.get("station_id")

                if not current_station_id:
                    continue

                if current_station_id not in latest:
                    latest[current_station_id] = station_alarm_state(station)

            # The external DB writer can lag behind MQTT. Never roll live state back.
            for cached in _latest_station_cache:
                cached_id = station_id(cached)
                if cached_id not in latest or telemetry_time(cached) >= telemetry_time(latest[cached_id]):
                    latest[cached_id] = cached
            _latest_station_cache = list(latest.values())
            _latest_station_cache_at = monotonic()
            return [station_alarm_state(station) for station in _latest_station_cache]

        except Exception as exc:

            print(f"CrateDB latest station fetch failed: {exc}")

            return [station_alarm_state(station) for station in _latest_station_cache]


def current_power_lines(station_states):
    global _power_line_cache, _power_line_cache_key

    cache_key = tuple(sorted(
        (str(station_id(station)), str(station.get("location") or ""),
         str(station.get("lat")), str(station.get("lon")))
        for station in station_states if station_id(station)
    ))
    with _power_line_cache_lock:
        if _power_line_cache and cache_key == _power_line_cache_key:
            return list(_power_line_cache)

        _power_line_cache = generate_power_lines(station_states)
        _power_line_cache_key = cache_key
        return list(_power_line_cache)


@app.get("/")
def root():

    return {
        "status": "Smart Grid backend running"
    }


@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


@app.get("/api/health/cratedb")
def cratedb_health():

    try:
        started_at = perf_counter()
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT 1")
        latency_ms = round((perf_counter() - started_at) * 1000, 1)

        return {
            "connected": True,
            "latencyMs": latency_ms,
            "nodes": 1,
            "mqttConnected": is_mqtt_connected(),
            "telemetryPersistence": "backend" if PERSIST_MQTT_TELEMETRY else "external"
        }

    except Exception as exc:

        print(f"CrateDB health check failed: {exc}")

        return {
            "connected": False,
            "latencyMs": 0,
            "nodes": 0,
            "mqttConnected": is_mqtt_connected(),
            "telemetryPersistence": "unavailable"
        }


@app.get("/stations")
def get_stations():

    return stations


@app.get("/sensors")
def get_sensors():

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM trafostanice_sensors
        ORDER BY timestamp DESC
        LIMIT 50
    """)

    rows = cursor.fetchall()

    columns = [
        col[0]
        for col in cursor.description
    ]

    result = [
        dict(zip(columns, row))
        for row in rows
    ]

    return {
        "data": result
    }


@app.get("/api/stations/{station_id}/history")
def get_station_history(
    station_id: str,
    hours: int = 24,
    limit: int = 500,
):
    try:
        rows = station_history(station_id, hours=hours, limit=limit)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Station history unavailable: {exc}",
        ) from exc

    return {
        "stationId": station_id,
        "hours": max(1, min(int(hours), 24 * 30)),
        "data": rows,
    }


@app.get("/latest-stations")
def latest_stations():

    return {
        "data": fetch_latest_station_states()
    }


@app.get("/alarms")
def get_alarms():

    latest_stations = fetch_latest_station_states()

    alarms = [
        station
        for station in latest_stations
        if has_alarm(station)
    ]

    return {
        "data": alarms
    }


@app.get("/api/alarms")
def get_alarm_register(
    status: str | None = None,
    severity: str | None = None,
    station_id: str | None = None,
    limit: int = 250,
):
    statuses = status.split(",") if status else None
    try:
        data = list_alarms(
            statuses=statuses,
            severity=severity,
            station_id=station_id,
            limit=limit,
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Alarm register unavailable") from exc
    return {"data": data}


@app.get("/api/alarms/stats")
def get_alarm_stats():
    return alarm_stats()


@app.get("/api/alarms/{alarm_id}/audit")
def get_alarm_audit(alarm_id: str):
    return {"data": list_alarm_audit(alarm_id)}


@app.post("/api/alarms/{alarm_id}/acknowledge")
def acknowledge_alarm(alarm_id: str, request: AlarmActionRequest):
    try:
        alarm = transition_alarm(alarm_id, "ACK", request.actor, request.note)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    return alarm


@app.post("/api/alarms/{alarm_id}/work-order")
def create_alarm_work_order(alarm_id: str, request: AlarmActionRequest):
    try:
        alarm = transition_alarm(alarm_id, "WORK_ORDER", request.actor, request.note)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    return alarm


@app.post("/api/alarms/{alarm_id}/resolve")
def resolve_alarm(alarm_id: str, request: AlarmActionRequest):
    try:
        alarm = transition_alarm(alarm_id, "RESOLVED", request.actor, request.note)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    return alarm


@app.get("/api/scenarios/definitions")
def get_scenario_definitions():
    return {"data": scenario_definitions()}


@app.get("/api/scenarios")
async def get_scenario_runs(limit: int = 100):
    return {"data": await list_scenario_runs(limit)}


@app.post("/api/scenarios/run")
async def run_scenario(request: ScenarioRunRequest):
    latest_stations = await asyncio.to_thread(fetch_latest_station_states)

    try:
        return await start_scenario(
            scenario_type=request.scenario_type,
            stations=latest_stations,
            station_id=request.station_id,
            duration_seconds=request.duration_seconds,
            target_count=request.target_count,
            requested_by=request.requested_by,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/api/scenarios/{scenario_id}/stop")
async def stop_running_scenario(scenario_id: str):
    scenario = await stop_scenario(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Running scenario not found")
    return scenario


@app.get("/nearby")
def nearby(lat: float, lon: float):

    latest_stations = fetch_latest_station_states()

    result = []

    for station in latest_stations:

        try:

            station_lat, station_lon = location_to_lat_lon(
                station["location"]
            )

            distance_lat = abs(station_lat - lat)
            distance_lon = abs(station_lon - lon)

            if distance_lat < 0.05 and distance_lon < 0.05:

                result.append({
                    "station_id": station["station_id"],
                    "station_name": station["station_name"],
                    "location": station["location"]
                })

        except Exception:
            pass

    return {
        "data": result[:20]
    }


@app.get("/grid/summary")
def grid_summary():

    latest_stations = fetch_latest_station_states()

    if not latest_stations:

        return {
            "gridHealth": 100,
            "blackoutRisk": 0,
            "activeAlarms": 0,
            "stations": 0
        }

    health_scores = [
        calculate_station_health(station)
        for station in latest_stations
    ]

    risk_scores = [
        calculate_station_risk(station)
        for station in latest_stations
    ]

    active_alarms = sum(len(station["active_alarms"]) for station in latest_stations)

    return {
        "gridHealth": round(mean(health_scores), 1),
        "blackoutRisk": round(mean(risk_scores), 1),
        "activeAlarms": active_alarms,
        "stations": len(latest_stations)
    }


@app.get("/regions")
def get_regions():

    latest_stations = fetch_latest_station_states()

    north = []
    south = []

    for station in latest_stations:

        try:

            lat, lon = location_to_lat_lon(
                station["location"]
            )

            if lat >= 46.38:
                north.append(station)
            else:
                south.append(station)

        except Exception:
            pass

    def build_region(region_id, name, data):

        if not data:

            return {
                "id": region_id,
                "name": name,
                "stations": 0,
                "healthScore": 100,
                "blackoutRisk": 0,
                "activeAlarms": 0
            }

        health = mean([
            calculate_station_health(station)
            for station in data
        ])

        risk = mean([
            calculate_station_risk(station)
            for station in data
        ])

        active_alarms = sum(len(station["active_alarms"]) for station in data)

        return {
            "id": region_id,
            "name": name,
            "stations": len(data),
            "healthScore": round(health, 1),
            "blackoutRisk": round(risk, 1),
            "activeAlarms": active_alarms
        }

    return {
        "regions": [
            build_region(
                "REGION-NORTH",
                "North Grid",
                north
            ),
            build_region(
                "REGION-SOUTH",
                "South Grid",
                south
            )
        ]
    }


@app.get("/blackout")
def blackout_prediction():

    latest_stations = fetch_latest_station_states()

    probability = calculate_blackout_probability(
        latest_stations
    )

    critical_stations = [
        station
        for station in latest_stations
        if (
            station.get("thermal", {}).get("oil_temp_c", 0) > threshold("overheating") or
            station.get("electrical", {}).get("current_a", 0) > threshold("overload") or
            has_alarm(station)
        )
    ]

    return {
        "probability": probability,
        "affectedStations": len(critical_stations),
        "estimatedMinutes": int(probability * 4)
    }


# @app.get("/power-lines")
# def get_power_lines():

#     return {
#         "data": generate_power_lines()
#     }


@app.get("/power-lines")
def get_power_lines():

    latest_stations = fetch_latest_station_states()

    return {
        "data": current_power_lines(latest_stations)
    }


@app.get("/grid/forecast")
def get_grid_forecast(hours: int = 12):
    return grid_load_forecast(fetch_latest_station_states(), hours)


@app.get("/ai/insights")
def get_ai_insights():

    latest_stations = fetch_latest_station_states()

    return {
        "insights": build_ai_insights(
            latest_stations
        )
    }


@app.get("/ai/stations/{requested_station_id}")
def get_station_prediction(requested_station_id: str):
    latest_stations = fetch_latest_station_states()
    match = next(
        (
            station
            for station in latest_stations
            if station_id(station) == requested_station_id
        ),
        None,
    )
    if not match:
        raise HTTPException(status_code=404, detail="Station not found")
    return station_prediction(match)


@app.get("/ai/training-dataset")
def get_ai_training_dataset(limit: int = 500):
    rows = recent_telemetry(limit)
    records = [training_record(row) for row in rows]
    state_counts = {}
    for record in records:
        label = record["label"]
        state_counts[label] = state_counts.get(label, 0) + 1
    return {
        "featureVersion": "baseline-v1",
        "records": records,
        "stateCounts": state_counts,
        "count": len(records),
    }


@app.get("/physics/grid")
def get_grid_physics(details: bool = True):
    latest_stations = fetch_latest_station_states()
    result = simulate_grid_physics(
        latest_stations,
        current_power_lines(latest_stations),
    )
    if not details:
        return {
            "model": result["model"],
            "summary": result["summary"],
        }
    return result


@app.get("/weather/grid-impact")
def get_weather_grid_impact():

    latest_stations = fetch_latest_station_states()

    return build_weather_payload(
        latest_stations
    )


@app.get("/alarm-correlations")
def get_alarm_correlations():

    latest_stations = fetch_latest_station_states()

    return {
        "correlations": build_alarm_correlations(
            latest_stations
        )
    }


@app.get("/root-cause/{correlation_id}")
def get_root_cause(correlation_id: str):

    latest_stations = fetch_latest_station_states()
    correlations = build_alarm_correlations(
        latest_stations
    )

    correlation = next(
        (
            item
            for item in correlations
            if item["id"] == correlation_id
        ),
        None
    )

    if not correlation:
        raise HTTPException(
            status_code=404,
            detail="Correlation not found"
        )

    return {
        "id": correlation_id,
        "summary": correlation["title"],
        "severity": correlation["severity"],
        "confidence": correlation["confidence"],
        "affectedAssets": correlation["affectedAssets"],
        "chain": [
            {
                "step": "Signal",
                "title": "Realtime SCADA anomaly",
                "confidence": 93
            },
            {
                "step": "Cause",
                "title": correlation["rootCause"],
                "confidence": correlation["confidence"]
            },
            {
                "step": "Impact",
                "title": "Local overload and customer impact risk",
                "confidence": 81
            },
            {
                "step": "Action",
                "title": correlation["nextAction"],
                "confidence": 76
            }
        ]
    }


@app.get("/n-1/{asset_id}")
def get_contingency(asset_id: str):

    latest_stations = fetch_latest_station_states()
    match = next(
        (
            station
            for station in latest_stations
            if station_id(station) == asset_id
        ),
        None
    )

    if not match:
        raise HTTPException(status_code=404, detail="Asset not found")

    physics = simulate_grid_physics(
        latest_stations,
        current_power_lines(latest_stations),
        failed_asset_id=asset_id,
    )
    affected_nodes = [
        node
        for node in physics["nodes"]
        if node.get("cascadeDepth") is not None
    ]
    base_risk = calculate_station_risk(match)

    return {
        "assetId": asset_id,
        "affectedCustomers": round(len(affected_nodes) * 850 + base_risk * 42),
        "overloadedAssets": physics["summary"]["overloadedLines"],
        "risk": (
            "High"
            if physics["summary"]["cascadeRisk"] > 70
            else "Medium"
            if physics["summary"]["cascadeRisk"] > 35
            else "Low"
        ),
        "recommendedAction": "Transfer load and isolate the affected corridor.",
        "cascadeRisk": physics["summary"]["cascadeRisk"],
        "estimatedLossMW": physics["summary"]["estimatedLossMW"],
        "affectedAssets": [node["id"] for node in affected_nodes[:25]],
        "physicsModel": physics["model"],
    }


@app.get("/system/topology")
def get_system_topology():

    latest_stations = fetch_latest_station_states()

    try:
        cursor = get_connection().cursor()
        cursor.execute("SELECT 1")
        database_connected = True
    except Exception:
        database_connected = False

    return build_topology(
        latest_stations,
        mqtt_connected=is_mqtt_connected(),
        database_connected=database_connected,
        websocket_clients=manager.connection_count,
    )


@app.get("/digital-twin/{asset_type}/{asset_id}")
def get_digital_twin(asset_type: str, asset_id: str):

    if asset_type not in {"station", "substation", "transformer", "region"}:
        raise HTTPException(status_code=404, detail="Unknown asset type")

    latest_stations = fetch_latest_station_states()
    match = next(
        (
            station
            for station in latest_stations
            if station_id(station) == asset_id
        ),
        None
    )

    if not match:
        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )

    return {
        "assetType": asset_type,
        "assetId": asset_id,
        "name": station_name(match),
        "health": calculate_station_health(match),
        "risk": calculate_station_risk(match),
        "region": station_region(match),
        "forecast": build_forecast_points([match], 8),
        "prediction": station_prediction(match),
        "contingency": {
            "affectedCustomers": round(
                1200 + calculate_station_risk(match) * 46
            ),
            "overloadedAssets": max(
                1,
                round(calculate_station_risk(match) / 20)
            )
        }
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):

    await manager.connect(websocket)

    try:
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def event_loop():

    while True:

        payload = await event_queue.get()

        try:
            payload = station_alarm_state(payload)
            if not cache_latest_station_payload(payload):
                continue
            if PERSIST_MQTT_TELEMETRY:
                try:
                    await asyncio.to_thread(insert_sensor_payload, payload)
                except Exception as exc:
                    print(f"Telemetry persistence failed: {exc}")

            try:
                async with _alarm_reconcile_lock:
                    await asyncio.to_thread(reconcile_alarm_payload, payload)
            except Exception as exc:
                print(f"Alarm persistence failed: {exc}")

            await manager.broadcast(payload)
        except Exception as exc:
            print(f"Telemetry processing failed: {exc}")
        finally:
            event_queue.task_done()


async def bootstrap_alarm_register():

    await asyncio.sleep(1)

    try:
        latest_stations = await asyncio.to_thread(fetch_latest_station_states)

        for station in latest_stations:
            # Normal snapshots also resolve alarms left open before a restart.
            async with _alarm_reconcile_lock:
                with _latest_station_cache_lock:
                    current = next((cached for cached in _latest_station_cache
                                    if station_id(cached) == station_id(station)), station)
                await asyncio.to_thread(reconcile_alarm_payload, current)

        print("Alarm register initialized from latest station state")

    except Exception as exc:
        print(f"Alarm register initialization failed: {exc}")


class ThresholdSettingsRequest(BaseModel):
    values: dict[str, StrictFloat]


@app.get("/api/settings/thresholds")
def get_threshold_settings():
    return load_settings()


@app.put("/api/settings/thresholds")
async def update_threshold_settings(request: ThresholdSettingsRequest):
    try:
        result = await asyncio.to_thread(save_settings, request.values)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    await manager.broadcast({"type": "threshold_settings", "settings": result})
    return result


@app.post("/api/settings/thresholds/reset")
async def reset_threshold_settings():
    result = await asyncio.to_thread(save_settings, DEFAULTS)
    await manager.broadcast({"type": "threshold_settings", "settings": result})
    return result
