import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
from datetime import timezone
from statistics import mean

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi import WebSocket
from fastapi import WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from crate import client

from app.services.mqtt_client import start_mqtt
from app.db.init_db import init_db
from app.services.event_bus import event_queue
from app.services.websocket_manager import manager
from app.services.cleanup import cleanup_old_data

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


@asynccontextmanager
async def lifespan(app: FastAPI):

    loop = asyncio.get_running_loop()

    start_mqtt(loop)

    asyncio.create_task(cleanup_old_data())

    asyncio.create_task(event_loop())

    print("Application started")

    yield

    print("Shutting down...")


app = FastAPI(lifespan=lifespan)

init_db()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_connection():
    return client.connect("http://cratedb:4200")


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

    alarms = station.get("alarms") or {}

    return (
        alarms.get("overload") or
        alarms.get("overheating") or
        alarms.get("sensor_failure") or
        alarms.get("voltage_drop") or
        alarms.get("offline")
    )


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
            "confidence": max(72, 94 - hour)
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

    ranked = sorted(
        stations,
        key=calculate_station_risk,
        reverse=True
    )

    riskiest = ranked[0]
    highest_load = max(
        stations,
        key=lambda station: nested_value(
            station,
            "electrical",
            "active_power_kw"
        )
    )

    return [
        {
            "id": "insight-overload",
            "type": "overload",
            "title": "Overload expected in high-load corridor",
            "assetId": station_id(highest_load),
            "impact": "Expected in 3h",
            "confidence": 89,
            "severity": "WARNING",
            "recommendation": "Prepare load transfer and monitor line loading."
        },
        {
            "id": "insight-cooling",
            "type": "cooling",
            "title": "Cooling degradation detected",
            "assetId": station_id(riskiest),
            "impact": "Transformer thermal margin is shrinking",
            "confidence": 84,
            "severity": "CRITICAL" if calculate_station_risk(riskiest) > 70 else "WARNING",
            "recommendation": "Inspect cooling system and oil temperature trend."
        },
        {
            "id": "insight-maintenance",
            "type": "maintenance",
            "title": "Maintenance recommended",
            "assetId": station_id(riskiest),
            "impact": "Within 14 days",
            "confidence": 78,
            "severity": "INFO",
            "recommendation": "Schedule predictive maintenance window."
        }
    ]


def build_alarm_correlations(stations):

    alarmed = [
        station
        for station in stations
        if has_alarm(station)
    ]

    grouped = []

    cause_map = [
        ("overheating", "Cooling System Failure", "CRITICAL"),
        ("overload", "Transformer Overload", "WARNING"),
        ("voltage_drop", "Grid Instability", "WARNING"),
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


def build_topology(stations):

    return {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "platformHealth": 92,
        "nodes": [
            {
                "id": "locust",
                "label": "Locust Simulator",
                "status": "online",
                "metric": "4,281 msg/s"
            },
            {
                "id": "emqx",
                "label": "EMQX MQTT",
                "status": "online",
                "metric": "connected"
            },
            {
                "id": "fastapi",
                "label": "FastAPI Gateway",
                "status": "online",
                "metric": "ws active"
            },
            {
                "id": "cratedb",
                "label": "CrateDB",
                "status": "online",
                "metric": f"{len(stations)} latest states"
            },
            {
                "id": "dashboard",
                "label": "Vue Dashboard",
                "status": "online",
                "metric": "realtime"
            }
        ],
        "edges": [
            ["locust", "emqx"],
            ["emqx", "fastapi"],
            ["fastapi", "dashboard"],
            ["fastapi", "cratedb"]
        ]
    }


def fetch_latest_station_states(limit=10000):

    try:

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(f"""
            SELECT *
            FROM trafostanice_sensors
            ORDER BY timestamp DESC
            LIMIT {limit}
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

            station_id = station.get("station_id")

            if not station_id:
                continue

            if station_id not in latest:
                latest[station_id] = station

        return list(
            latest.values()
        )

    except Exception as exc:

        print(f"CrateDB latest station fetch failed: {exc}")

        return []

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

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT 1")

        return {
            "connected": True,
            "latencyMs": 8,
            "nodes": 1,
            "queriesPerSecond": 1204
        }

    except Exception as exc:

        print(f"CrateDB health check failed: {exc}")

        return {
            "connected": False,
            "latencyMs": 0,
            "nodes": 0,
            "queriesPerSecond": 0
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

    active_alarms = len([
        station
        for station in latest_stations
        if has_alarm(station)
    ])

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

        active_alarms = len([
            station
            for station in data
            if has_alarm(station)
        ])

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
            station.get("thermal", {}).get("oil_temp_c", 0) > 90 or
            station.get("electrical", {}).get("current_a", 0) > 500 or
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
        "data": generate_power_lines(
            latest_stations
        )
    }


@app.get("/grid/forecast")
def get_grid_forecast():

    latest_stations = fetch_latest_station_states()

    return {
        "scope": "entire-grid",
        "points": build_forecast_points(
            latest_stations
        )
    }


@app.get("/ai/insights")
def get_ai_insights():

    latest_stations = fetch_latest_station_states()

    return {
        "insights": build_ai_insights(
            latest_stations
        )
    }


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
        match = latest_stations[0] if latest_stations else {}

    base_risk = calculate_station_risk(match) if match else 0

    return {
        "assetId": asset_id,
        "affectedCustomers": round(4200 + base_risk * 92),
        "overloadedAssets": max(1, round(base_risk / 15)),
        "risk": (
            "High"
            if base_risk > 70
            else "Medium"
            if base_risk > 35
            else "Low"
        ),
        "recommendedAction": "Transfer load and isolate the affected corridor."
    }


@app.get("/system/topology")
def get_system_topology():

    latest_stations = fetch_latest_station_states()

    return build_topology(
        latest_stations
    )


@app.get("/digital-twin/{asset_type}/{asset_id}")
def get_digital_twin(asset_type: str, asset_id: str):

    latest_stations = fetch_latest_station_states()
    match = next(
        (
            station
            for station in latest_stations
            if station_id(station) == asset_id
        ),
        None
    )

    if not match and latest_stations:
        match = latest_stations[0]

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
            await asyncio.sleep(60)

    except WebSocketDisconnect:

        manager.disconnect(websocket)


async def event_loop():

    while True:

        payload = await event_queue.get()

        await manager.broadcast(payload)
