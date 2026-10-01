from datetime import datetime, timedelta, timezone

from crate import client

from app.config import CRATE_URL


REQUIRED_OBJECTS = ("electrical", "thermal", "oil_gas", "alarms")


def _connection():
    return client.connect(CRATE_URL)


def _timestamp(value):
    if isinstance(value, datetime):
        return value.replace(tzinfo=value.tzinfo or timezone.utc)

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        seconds = value / 1000 if abs(value) >= 100_000_000_000 else value
        return datetime.fromtimestamp(seconds, timezone.utc)

    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed.replace(tzinfo=parsed.tzinfo or timezone.utc)
        except ValueError:
            return datetime.now(timezone.utc)

    return datetime.now(timezone.utc)


def normalize_sensor_payload(payload):
    if not isinstance(payload, dict):
        raise ValueError("Sensor payload must be an object")

    station_id = str(payload.get("station_id") or "").strip()
    if not station_id:
        raise ValueError("Sensor payload requires station_id")

    normalized = {
        "timestamp": _timestamp(payload.get("timestamp")),
        "station_id": station_id,
        "station_name": str(payload.get("station_name") or station_id),
        "location": str(payload.get("location") or ""),
    }

    for key in REQUIRED_OBJECTS:
        value = payload.get(key)
        normalized[key] = value if isinstance(value, dict) else {}

    return normalized


def insert_sensor_payload(payload):
    row = normalize_sensor_payload(payload)
    cursor = _connection().cursor()
    cursor.execute(
        """
        INSERT INTO trafostanice_sensors (
            timestamp, station_id, station_name, location,
            electrical, thermal, oil_gas, alarms
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            row["timestamp"],
            row["station_id"],
            row["station_name"],
            row["location"],
            row["electrical"],
            row["thermal"],
            row["oil_gas"],
            row["alarms"],
        ),
    )
    return row


def station_history(station_id, hours=24, limit=500):
    safe_hours = max(1, min(int(hours), 24 * 30))
    safe_limit = max(1, min(int(limit), 2000))
    cutoff = datetime.now(timezone.utc) - timedelta(hours=safe_hours)
    cursor = _connection().cursor()
    cursor.execute(
        f"""
        SELECT timestamp, electrical, thermal, oil_gas, alarms
        FROM trafostanice_sensors
        WHERE station_id = ? AND timestamp >= ?
        ORDER BY timestamp DESC
        LIMIT {safe_limit}
        """,
        (station_id, cutoff),
    )
    columns = [column[0] for column in cursor.description]
    rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
    rows.reverse()
    return rows


def recent_telemetry(limit=500):
    safe_limit = max(1, min(int(limit), 5000))
    cursor = _connection().cursor()
    cursor.execute(
        f"""
        SELECT timestamp, station_id, station_name, location,
               electrical, thermal, oil_gas, alarms
        FROM trafostanice_sensors
        ORDER BY timestamp DESC
        LIMIT {safe_limit}
        """
    )
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]
