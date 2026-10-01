"""Seasonal baseline from persisted telemetry, not a trained AI forecast."""
from datetime import datetime, timedelta, timezone
from threading import Lock
from time import monotonic
from statistics import mean
from crate import client
from app.config import CRATE_URL
from app.services.grid_analytics import calculate_station_risk, nested_value

_history = None
_history_at = 0
_lock = Lock()


def load_history():
    global _history, _history_at
    with _lock:
        if _history is not None and monotonic() - _history_at < 60:
            return _history
        cursor = client.connect(CRATE_URL).cursor()
        cutoff = datetime.now(timezone.utc) - timedelta(days=8)
        cursor.execute("""
            SELECT DATE_TRUNC('hour', timestamp) AS bucket, station_id,
                   AVG(electrical['active_power_kw']) AS load_kw,
                   MIN(timestamp) AS first_seen, MAX(timestamp) AS last_seen
            FROM trafostanice_sensors
            WHERE timestamp >= ?
            GROUP BY bucket, station_id
            ORDER BY bucket
        """, (cutoff,))
        _history = cursor.fetchall()
        _history_at = monotonic()
        return _history


def grid_load_forecast(stations, hours=12):
    hours = max(1, min(int(hours), 168))
    now = datetime.now(timezone.utc)
    current = sum(nested_value(station, 'electrical', 'active_power_kw') for station in stations) / 1000
    risk = round(mean([calculate_station_risk(station) for station in stations]), 1) if stations else 0
    try:
        rows = load_history()
    except Exception:
        rows = []
    span = (max(row[4] for row in rows) - min(row[3] for row in rows)) / 3_600_000 if rows else 0
    buckets = {}
    # Complete UTC hours only; weight each sampled station equally, not by message count.
    current_hour = int(now.replace(minute=0, second=0, microsecond=0).timestamp() * 1000)
    for bucket, station_id, load_kw, *_ in rows:
        if bucket < current_hour and load_kw is not None:
            buckets.setdefault(bucket, {})[station_id] = float(load_kw)
    profiles = {}
    for bucket, loads in buckets.items():
        if len(loads) < max(1, len(stations) * .5):
            continue
        hour = datetime.fromtimestamp(bucket / 1000, timezone.utc).hour
        profiles.setdefault(hour, []).append(mean(loads.values()) * len(stations) / 1000)
    enough_daily = span >= 24 and len(profiles) == 24
    enough_weekly = span >= 167 and len(buckets) >= 167 and enough_daily
    available = hours == 1 or (enough_weekly if hours > 24 else enough_daily)
    method = 'historical-hourly-seasonal-baseline' if enough_daily else 'current-load-persistence'
    points = []
    if available and stations:
        count = 7 if hours == 1 else hours + 1
        for index in range(count):
            progress = index / (count - 1)
            timestamp = now + timedelta(hours=hours * progress)
            target = mean(profiles.get(timestamp.hour, [current])) if enough_daily else current
            # Anchor to live load, then converge to the historical hourly profile.
            blend = min(1, hours * progress / 3)
            load = current * (1 - blend) + target * blend
            points.append({'timestamp':timestamp.isoformat(), 'label':timestamp.isoformat(),
                           'loadMW':round(load, 1), 'risk':risk, 'confidence':None, 'method':method})
    return {'scope':'entire-grid', 'horizonHours':hours, 'available':available,
            'availableHorizons':[1] + ([24] if enough_daily else []) + ([168] if enough_weekly else []),
            'historyHours':round(span, 1), 'method':method,
            'reason':None if available else 'insufficient-history', 'points':points}
