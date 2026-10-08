STANDARD_VOLTAGES_KV = (10, 20, 35, 110, 220, 400)

HEALTH_ALARM_PENALTIES = {
    "overload": 12,
    "overheating": 14,
    "voltage_drop": 8,
    "overvoltage": 8,
    "voltage_instability": 12,
    "frequency_instability": 12,
    "harmonics_spike": 10,
    "sensor_failure": 10,
    "cooling_failure": 18,
    "insulation_degradation": 15,
    "oil_leak": 18,
    "arc_discharge": 24,
    "short_circuit": 35,
    "feeder_failure": 28,
    "transformer_trip": 35,
    "offline": 30,
}

RISK_ALARM_PENALTIES = {
    "overload": 18,
    "overheating": 20,
    "voltage_drop": 10,
    "overvoltage": 10,
    "voltage_instability": 16,
    "frequency_instability": 16,
    "harmonics_spike": 12,
    "sensor_failure": 7,
    "cooling_failure": 22,
    "insulation_degradation": 20,
    "oil_leak": 24,
    "arc_discharge": 32,
    "short_circuit": 40,
    "feeder_failure": 34,
    "transformer_trip": 40,
    "offline": 35,
}


def nested_value(station, group, key, default=0):

    value = station.get(group) or {}

    if isinstance(value, dict):
        return value.get(key, default)

    return default


def alarm_enabled(station, key):

    alarms = station.get("alarms") or {}

    if isinstance(alarms, dict):
        return bool(alarms.get(key))

    return False


def nominal_voltage_kv(voltage):
    try:
        value = float(voltage)
    except (TypeError, ValueError):
        return None

    if value <= 0:
        return None

    return min(STANDARD_VOLTAGES_KV, key=lambda nominal: abs(nominal - value))


def voltage_health_penalty(voltage):
    nominal = nominal_voltage_kv(voltage)
    if nominal is None:
        return 0

    deviation_percent = abs(float(voltage) - nominal) / nominal * 100
    return max(0, deviation_percent - 5) * 0.8


def calculate_station_health(station):

    oil_temp = nested_value(station, "thermal", "oil_temp_c")

    current = nested_value(station, "electrical", "current_a")

    voltage = nested_value(station, "electrical", "voltage_kv")

    thd = nested_value(station, "electrical", "harmonics_thd")

    score = 100
    score -= oil_temp * 0.28
    score -= max(0, current - 420) * 0.08
    score -= voltage_health_penalty(voltage)
    score -= thd * 1.5

    for alarm_name, penalty in HEALTH_ALARM_PENALTIES.items():
        if alarm_enabled(station, alarm_name):
            score -= penalty

    return max(0, min(100, round(score)))


def calculate_station_risk(station):

    oil_temp = nested_value(station, "thermal", "oil_temp_c")

    current = nested_value(station, "electrical", "current_a")

    active_power = nested_value(station, "electrical", "active_power_kw")

    thd = nested_value(station, "electrical", "harmonics_thd")

    hydrogen = nested_value(station, "oil_gas", "hydrogen_ppm")

    risk = 5
    risk += max(0, oil_temp - 60) * 0.8
    risk += max(0, current - 350) * 0.1
    risk += max(0, active_power - 2600) * 0.01
    risk += max(0, thd - 3) * 3
    risk += max(0, hydrogen - 15) * 0.8

    for alarm_name, penalty in RISK_ALARM_PENALTIES.items():
        if alarm_enabled(station, alarm_name):
            risk += penalty

    return min(100, max(0, round(risk)))
