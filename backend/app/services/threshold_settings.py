"""Shared, persisted thresholds. Defaults preserve the original alarm rules."""
from copy import deepcopy
import json
from math import isfinite
from threading import RLock
from crate import client
from app.config import CRATE_URL

# key, label, unit, default, minimum, maximum, comparison
_SPECS = [
    ("health_warning", "Health score · warning below", "%", 70, 0, 100, "<"),
    ("health_critical", "Health score · critical below", "%", 40, 0, 100, "<"),
    ("overload", "Current · critical", "A", 500, 1, 100000, "≥"),
    ("overheating", "Oil temperature · critical", "°C", 90, -50, 250, "≥"),
    ("voltage_drop", "Voltage · warning below", "kV", 9.2, 0.01, 1000, "<"),
    ("overvoltage", "Voltage · warning above", "kV", 10.8, 0.01, 1000, "≥"),
    ("frequency_instability", "Frequency deviation from 50 Hz · critical", "Hz", .25, .01, 10, "≥"),
    ("harmonics_spike", "Harmonics THD · warning", "%", 5, .01, 100, "≥"),
    ("short_circuit", "Short circuit current · critical", "A", 800, 1, 100000, "≥"),
    ("short_circuit_voltage", "Short circuit voltage below", "kV", 6, .01, 1000, "<"),
    ("cooling_winding", "Cooling failure · minimum winding temperature", "°C", 95, -50, 250, "≥"),
    ("cooling_failure", "Cooling failure · winding/oil difference", "°C", 22, .01, 200, "≥"),
    ("insulation_degradation", "Insulation degradation · hydrogen", "ppm", 20, .01, 100000, "≥"),
    ("insulation_methane", "Insulation degradation · methane", "ppm", 8, .01, 100000, "≥"),
    ("oil_leak", "Oil level · critical below or equal", "%", 65, 0, 100, "≤"),
    ("arc_discharge", "Acetylene · critical", "ppm", 4, .01, 100000, "≥"),
]
DEFAULTS = {key: value for key, _, _, value, _, _, _ in _SPECS}
FIELDS = [dict(key=k, label=l, unit=u, default=d, min=lo, max=hi, comparison=c)
          for k, l, u, d, lo, hi, c in _SPECS]
_values = deepcopy(DEFAULTS)
_lock = RLock()


def threshold(key):
    with _lock:
        return _values[key]


def validate(values):
    if set(values) != set(DEFAULTS):
        raise ValueError("Provide every threshold, with no unknown keys.")
    for field in FIELDS:
        value = values[field["key"]]
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not isfinite(value):
            raise ValueError(f"{field['label']} must be a finite number.")
        if not field["min"] <= value <= field["max"]:
            raise ValueError(f"{field['label']} must be between {field['min']} and {field['max']}.")
    if values["health_critical"] >= values["health_warning"]:
        raise ValueError("Critical health score must be below warning health score.")
    if values["voltage_drop"] >= values["overvoltage"]:
        raise ValueError("Low voltage must be below high voltage.")
    if values["short_circuit"] < values["overload"]:
        raise ValueError("Short circuit current must be at least the overload current.")
    return dict(values)


def settings_snapshot():
    with _lock:
        return {"values": dict(_values), "defaults": dict(DEFAULTS), "fields": deepcopy(FIELDS)}


def load_settings():
    with _lock:
        connection = client.connect(CRATE_URL)
        try:
            cursor = connection.cursor()
            cursor.execute("SELECT config_json FROM application_settings WHERE id = ?", ("thresholds",))
            row = cursor.fetchone()
            values = validate({**DEFAULTS, **(json.loads(row[0]) if row else {})})
            _values.clear()
            _values.update(values)
        finally:
            connection.close()
        return settings_snapshot()


def save_settings(values):
    values = validate(values)
    with _lock:
        connection = client.connect(CRATE_URL)
        try:
            cursor = connection.cursor()
            cursor.execute("INSERT INTO application_settings (id, config_json) VALUES (?, ?) "
                           "ON CONFLICT (id) DO UPDATE SET config_json = excluded.config_json", ("thresholds", json.dumps(values)))
            cursor.execute("REFRESH TABLE application_settings")
            _values.clear()
            _values.update(values)
        finally:
            connection.close()
    return settings_snapshot()
