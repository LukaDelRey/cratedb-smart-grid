from datetime import datetime, timezone
from uuid import uuid4

from crate import client

from app.config import CRATE_URL
from app.services.threshold_settings import threshold

OPEN_STATUSES = ("ACTIVE", "ACK", "WORK_ORDER")
VALID_TRANSITIONS = {
    "ACTIVE": {"ACK", "WORK_ORDER", "RESOLVED"},
    "ACK": {"WORK_ORDER", "RESOLVED"},
    "WORK_ORDER": {"RESOLVED"},
    "RESOLVED": set(),
}

ALARM_DEFINITIONS = {
    "overload": {
        "title": "Transformer overload",
        "severity": "CRITICAL",
        "category": "ELECTRICAL",
        "value_path": ("electrical", "current_a"),
        "unit": "A",
        "threshold": 500,
        "condition": lambda payload: _flag(payload, "overload")
        or _number(payload, "electrical", "current_a") >= threshold("overload"),
    },
    "overheating": {
        "title": "Oil temperature high",
        "severity": "CRITICAL",
        "category": "THERMAL",
        "value_path": ("thermal", "oil_temp_c"),
        "unit": "C",
        "threshold": 90,
        "condition": lambda payload: _flag(payload, "overheating")
        or _number(payload, "thermal", "oil_temp_c") >= threshold("overheating"),
    },
    "sensor_failure": {
        "title": "Sensor failure",
        "severity": "WARNING",
        "category": "TELEMETRY",
        "value_path": None,
        "unit": None,
        "condition": lambda payload: _flag(payload, "sensor_failure"),
    },
    "offline": {
        "title": "Telemetry offline",
        "severity": "CRITICAL",
        "category": "GRID",
        "value_path": None,
        "unit": None,
        "condition": lambda payload: _flag(payload, "offline"),
    },
    "voltage_drop": {
        "title": "Voltage drop",
        "severity": "WARNING",
        "category": "ELECTRICAL",
        "value_path": ("electrical", "voltage_kv"),
        "unit": "kV",
        "threshold": 9.2,
        "condition": lambda payload: _flag(payload, "voltage_drop")
        or 0 < _number(payload, "electrical", "voltage_kv") < threshold("voltage_drop"),
    },
    "overvoltage": {
        "title": "Overvoltage detected",
        "severity": "WARNING",
        "category": "ELECTRICAL",
        "value_path": ("electrical", "voltage_kv"),
        "unit": "kV",
        "threshold": 10.8,
        "condition": lambda payload: _flag(payload, "overvoltage")
        or _number(payload, "electrical", "voltage_kv") >= threshold("overvoltage"),
    },
    "frequency_instability": {
        "title": "Frequency instability",
        "severity": "CRITICAL",
        "category": "ELECTRICAL",
        "value_path": ("electrical", "frequency_hz"),
        "unit": "Hz",
        "threshold": 0.25,
        "condition": lambda payload: _flag(payload, "frequency_instability")
        or abs(_number(payload, "electrical", "frequency_hz", 50) - 50)
        >= threshold("frequency_instability"),
    },
    "harmonics_spike": {
        "title": "Harmonics THD critical",
        "severity": "WARNING",
        "category": "POWER_QUALITY",
        "value_path": ("electrical", "harmonics_thd"),
        "unit": "%",
        "threshold": 5,
        "condition": lambda payload: _flag(payload, "harmonics_spike")
        or _number(payload, "electrical", "harmonics_thd")
        >= threshold("harmonics_spike"),
    },
    "short_circuit": {
        "title": "Short circuit signature",
        "severity": "CRITICAL",
        "category": "ELECTRICAL",
        "value_path": ("electrical", "current_a"),
        "unit": "A",
        "threshold": 800,
        "condition": lambda payload: _flag(payload, "short_circuit")
        or (
            _number(payload, "electrical", "current_a") >= threshold("short_circuit")
            and _number(payload, "electrical", "voltage_kv")
            < threshold("short_circuit_voltage")
        ),
    },
    "cooling_failure": {
        "title": "Cooling system failure",
        "severity": "CRITICAL",
        "category": "THERMAL",
        "value_path": ("thermal", "winding_temp_c"),
        "unit": "C",
        "threshold": 22,
        "condition": lambda payload: _flag(payload, "cooling_failure")
        or (
            _number(payload, "thermal", "winding_temp_c")
            >= threshold("cooling_winding")
            and _number(payload, "thermal", "winding_temp_c")
            - _number(payload, "thermal", "oil_temp_c")
            >= threshold("cooling_failure")
        ),
    },
    "insulation_degradation": {
        "title": "Insulation degradation risk",
        "severity": "WARNING",
        "category": "OIL_GAS",
        "value_path": ("oil_gas", "hydrogen_ppm"),
        "unit": "ppm",
        "threshold": 20,
        "condition": lambda payload: _flag(payload, "insulation_degradation")
        or (
            _number(payload, "oil_gas", "hydrogen_ppm")
            >= threshold("insulation_degradation")
            and _number(payload, "oil_gas", "methane_ppm")
            >= threshold("insulation_methane")
        ),
    },
    "oil_leak": {
        "title": "Transformer oil leak",
        "severity": "CRITICAL",
        "category": "OIL_GAS",
        "value_path": ("oil_gas", "oil_level_percent"),
        "unit": "%",
        "threshold": 65,
        "condition": lambda payload: _flag(payload, "oil_leak")
        or _number(payload, "oil_gas", "oil_level_percent", 100)
        <= threshold("oil_leak"),
    },
    "arc_discharge": {
        "title": "Arc discharge detected",
        "severity": "CRITICAL",
        "category": "OIL_GAS",
        "value_path": ("oil_gas", "acetylene_ppm"),
        "unit": "ppm",
        "threshold": 4,
        "condition": lambda payload: _flag(payload, "arc_discharge")
        or _number(payload, "oil_gas", "acetylene_ppm") >= threshold("arc_discharge"),
    },
    "feeder_failure": {
        "title": "Feeder failure",
        "severity": "CRITICAL",
        "category": "GRID",
        "value_path": ("electrical", "active_power_kw"),
        "unit": "kW",
        "condition": lambda payload: _flag(payload, "feeder_failure"),
    },
    "transformer_trip": {
        "title": "Transformer trip",
        "severity": "CRITICAL",
        "category": "GRID",
        "value_path": ("electrical", "current_a"),
        "unit": "A",
        "condition": lambda payload: _flag(payload, "transformer_trip"),
    },
}


def _connection():
    return client.connect(CRATE_URL)


def _utcnow():
    return datetime.now(timezone.utc)


def _row_dict(cursor, row):
    return dict(zip([column[0] for column in cursor.description], row))


def _nested_value(payload, path):
    if not path:
        return None

    value = payload
    for key in path:
        if not isinstance(value, dict):
            return None
        value = value.get(key)

    return value if isinstance(value, (int, float)) else None


def _number(payload, group, key, default=0):
    values = payload.get(group)
    value = values.get(key, default) if isinstance(values, dict) else default
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _flag(payload, alarm_type):
    alarms = payload.get("source_alarms", payload.get("alarms"))
    return bool(alarms.get(alarm_type)) if isinstance(alarms, dict) else False


def evaluate_alarm_conditions(payload):
    return {
        alarm_type: bool(definition["condition"](payload))
        for alarm_type, definition in ALARM_DEFINITIONS.items()
    }


def station_alarm_state(payload):
    """The authoritative current conditions shared by REST and WebSocket clients."""
    payload = dict(payload)
    payload["source_alarms"] = dict(
        payload.get("source_alarms", payload.get("alarms")) or {}
    )
    # Locust sends a UTC string without an offset; browsers otherwise read local time.
    timestamp = payload.get("timestamp")
    try:
        if isinstance(timestamp, (int, float)):
            seconds = (
                timestamp / 1000 if abs(timestamp) >= 100_000_000_000 else timestamp
            )
            parsed = datetime.fromtimestamp(seconds, timezone.utc)
        elif isinstance(timestamp, datetime):
            parsed = timestamp
        else:
            parsed = datetime.fromisoformat(str(timestamp).replace("Z", "+00:00"))
        payload["timestamp"] = parsed.replace(
            tzinfo=parsed.tzinfo or timezone.utc
        ).isoformat()
    except (ValueError, TypeError, OverflowError, OSError):
        payload["timestamp"] = _utcnow().isoformat()
    conditions = evaluate_alarm_conditions(payload)
    active = [
        {
            "type": alarm_type,
            "title": ALARM_DEFINITIONS[alarm_type]["title"],
            "severity": ALARM_DEFINITIONS[alarm_type]["severity"],
            "value": _nested_value(
                payload, ALARM_DEFINITIONS[alarm_type]["value_path"]
            ),
            "unit": ALARM_DEFINITIONS[alarm_type]["unit"],
        }
        for alarm_type, enabled in conditions.items()
        if enabled
    ]
    severity = (
        "CRITICAL"
        if any(alarm["severity"] == "CRITICAL" for alarm in active)
        else "WARNING" if active else "INFO"
    )
    return {
        **payload,
        "alarms": conditions,
        "active_alarms": active,
        "severity": severity,
        "status": {"CRITICAL": "critical", "WARNING": "warning", "INFO": "normal"}[
            severity
        ],
    }


def _open_alarms(cursor, station_id):
    cursor.execute(
        """
        SELECT *
        FROM alarm_events
        WHERE station_id = ?
          AND status IN ('ACTIVE', 'ACK', 'WORK_ORDER')
        ORDER BY last_seen DESC
        """,
        (station_id,),
    )
    columns = [column[0] for column in cursor.description]
    return {
        row[columns.index("alarm_type")]: dict(zip(columns, row))
        for row in cursor.fetchall()
    }


def _write_audit(cursor, alarm_id, action, actor="system", note=None):
    cursor.execute(
        """
        INSERT INTO alarm_audit (id, alarm_id, action, actor, note, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (str(uuid4()), alarm_id, action, actor, note, _utcnow()),
    )


def reconcile_alarm_payload(payload):
    station_id = payload.get("station_id")

    if not station_id or not isinstance(payload.get("alarms") or {}, dict):
        return []

    connection = _connection()
    cursor = connection.cursor()
    changed = []
    now = _utcnow()
    conditions = evaluate_alarm_conditions(payload)
    open_alarms = _open_alarms(cursor, station_id)

    for alarm_type, definition in ALARM_DEFINITIONS.items():
        is_active = conditions[alarm_type]
        existing = open_alarms.get(alarm_type)

        if is_active and existing:
            cursor.execute(
                """
                UPDATE alarm_events
                SET last_seen = ?, occurrence_count = ?, value = ?
                WHERE id = ?
                """,
                (
                    now,
                    int(existing.get("occurrence_count") or 0) + 1,
                    _nested_value(payload, definition["value_path"]),
                    existing["id"],
                ),
            )
            continue

        if is_active:
            alarm_id = str(uuid4())
            cursor.execute(
                """
                INSERT INTO alarm_events (
                    id, station_id, alarm_type, title, severity, status,
                    source, value, unit, first_seen, last_seen,
                    occurrence_count, metadata
                )
                VALUES (?, ?, ?, ?, ?, 'ACTIVE', 'SCADA', ?, ?, ?, ?, 1, ?)
                """,
                (
                    alarm_id,
                    station_id,
                    alarm_type,
                    definition["title"],
                    definition["severity"],
                    _nested_value(payload, definition["value_path"]),
                    definition["unit"],
                    now,
                    now,
                    {
                        "station_name": payload.get("station_name"),
                        "category": definition.get("category"),
                        "threshold": (
                            threshold(alarm_type) if "threshold" in definition else None
                        ),
                        "detection": "flag-or-dynamic-threshold",
                    },
                ),
            )
            _write_audit(cursor, alarm_id, "CREATED")
            changed.append({"id": alarm_id, "action": "CREATED"})
            continue

        if existing:
            cursor.execute(
                """
                UPDATE alarm_events
                SET status = 'RESOLVED', last_seen = ?, resolved_at = ?
                WHERE id = ?
                """,
                (now, now, existing["id"]),
            )
            _write_audit(cursor, existing["id"], "RESOLVED")
            changed.append({"id": existing["id"], "action": "RESOLVED"})

    return changed


def list_alarms(
    statuses=None, severity=None, station_id=None, limit=250, station_ids=None
):
    cursor = _connection().cursor()
    clauses = []
    params = []

    if statuses:
        normalized = [status.upper() for status in statuses if status]
        if normalized:
            placeholders = ", ".join("?" for _ in normalized)
            clauses.append(f"status IN ({placeholders})")
            params.extend(normalized)

    if severity:
        clauses.append("severity = ?")
        params.append(severity.upper())

    if station_id:
        clauses.append("station_id = ?")
        params.append(station_id)

    if station_ids is not None:
        if not station_ids:
            return []
        placeholders = ", ".join("?" for _ in station_ids)
        clauses.append(f"station_id IN ({placeholders})")
        params.extend(station_ids)

    where_clause = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    safe_limit = max(1, min(int(limit), 1000))
    cursor.execute(
        f"""
        SELECT *
        FROM alarm_events
        {where_clause}
        ORDER BY last_seen DESC
        LIMIT {safe_limit}
        """,
        tuple(params),
    )

    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def get_alarm(alarm_id):
    cursor = _connection().cursor()
    cursor.execute("SELECT * FROM alarm_events WHERE id = ? LIMIT 1", (alarm_id,))
    row = cursor.fetchone()
    return _row_dict(cursor, row) if row else None


def is_valid_transition(current_status, target_status):
    current = str(current_status or "").upper()
    target = str(target_status or "").upper()
    return target == current or target in VALID_TRANSITIONS.get(current, set())


def transition_alarm(alarm_id, status, actor="operator", note=None):
    status = status.upper()
    if status not in {"ACK", "WORK_ORDER", "RESOLVED"}:
        raise ValueError("Unsupported alarm status")

    connection = _connection()
    cursor = connection.cursor()
    alarm = get_alarm(alarm_id)
    if not alarm:
        return None

    if not is_valid_transition(alarm.get("status"), status):
        raise ValueError(
            f"Alarm cannot transition from {alarm.get('status')} to {status}"
        )
    if alarm.get("status") == status:
        return alarm

    now = _utcnow()
    acknowledged_at = alarm.get("acknowledged_at")
    acknowledged_by = alarm.get("acknowledged_by")
    work_order_id = alarm.get("work_order_id")
    work_order_created_at = alarm.get("work_order_created_at")
    resolved_at = alarm.get("resolved_at")

    if status in {"ACK", "WORK_ORDER"} and not acknowledged_at:
        acknowledged_at = now
        acknowledged_by = actor

    if status == "WORK_ORDER" and not work_order_id:
        work_order_id = f"WO-{now.strftime('%Y%m%d')}-{str(uuid4())[:8].upper()}"
        work_order_created_at = now

    if status == "RESOLVED":
        resolved_at = now

    cursor.execute(
        """
        UPDATE alarm_events
        SET status = ?, acknowledged_at = ?, acknowledged_by = ?,
            work_order_id = ?, work_order_created_at = ?, resolved_at = ?
        WHERE id = ?
        """,
        (
            status,
            acknowledged_at,
            acknowledged_by,
            work_order_id,
            work_order_created_at,
            resolved_at,
            alarm_id,
        ),
    )
    _write_audit(cursor, alarm_id, status, actor, note)
    return get_alarm(alarm_id)


def alarm_stats(station_ids=None):
    cursor = _connection().cursor()
    where = ""
    params = ()
    if station_ids is not None:
        placeholders = ", ".join("?" for _ in station_ids)
        where = (
            f"WHERE station_id IN ({placeholders})" if station_ids else "WHERE 1 = 0"
        )
        params = tuple(station_ids)
    cursor.execute(
        f"""
        SELECT status, severity, COUNT(*) AS count
        FROM alarm_events
        {where}
        GROUP BY status, severity
        """,
        params,
    )

    totals = {
        "active": 0,
        "acknowledged": 0,
        "workOrders": 0,
        "resolved": 0,
        "critical": 0,
        "warning": 0,
    }

    for status, severity, count in cursor.fetchall():
        count = int(count or 0)
        if status == "ACTIVE":
            totals["active"] += count
        elif status == "ACK":
            totals["acknowledged"] += count
        elif status == "WORK_ORDER":
            totals["workOrders"] += count
        elif status == "RESOLVED":
            totals["resolved"] += count

        if status in OPEN_STATUSES and severity in {"CRITICAL", "EMERGENCY"}:
            totals["critical"] += count
        if status in OPEN_STATUSES and severity == "WARNING":
            totals["warning"] += count

    return totals


def list_alarm_audit(alarm_id):
    cursor = _connection().cursor()
    cursor.execute(
        """
        SELECT *
        FROM alarm_audit
        WHERE alarm_id = ?
        ORDER BY timestamp DESC
        LIMIT 100
        """,
        (alarm_id,),
    )
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]
