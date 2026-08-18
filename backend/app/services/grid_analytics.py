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


def calculate_station_health(station):

    oil_temp = nested_value(
        station,
        "thermal",
        "oil_temp_c"
    )

    current = nested_value(
        station,
        "electrical",
        "current_a"
    )

    voltage = nested_value(
        station,
        "electrical",
        "voltage_kv"
    )

    thd = nested_value(
        station,
        "electrical",
        "harmonics_thd"
    )

    score = 100
    score -= oil_temp * 0.28
    score -= max(0, current - 420) * 0.08
    score -= max(0, abs(voltage - 110) - 8) * 0.8
    score -= thd * 1.5

    if alarm_enabled(station, "overload"):
        score -= 12

    if alarm_enabled(station, "overheating"):
        score -= 14

    if alarm_enabled(station, "voltage_drop"):
        score -= 8

    if alarm_enabled(station, "sensor_failure"):
        score -= 10

    if alarm_enabled(station, "offline"):
        score -= 30

    return max(
        0,
        min(100, round(score))
    )


def calculate_station_risk(station):

    oil_temp = nested_value(
        station,
        "thermal",
        "oil_temp_c"
    )

    current = nested_value(
        station,
        "electrical",
        "current_a"
    )

    active_power = nested_value(
        station,
        "electrical",
        "active_power_kw"
    )

    thd = nested_value(
        station,
        "electrical",
        "harmonics_thd"
    )

    risk = 4
    risk += oil_temp * 0.32
    risk += current * 0.045
    risk += max(0, active_power - 2600) * 0.012
    risk += thd * 1.8

    if alarm_enabled(station, "overload"):
        risk += 18

    if alarm_enabled(station, "overheating"):
        risk += 20

    if alarm_enabled(station, "voltage_drop"):
        risk += 10

    if alarm_enabled(station, "sensor_failure"):
        risk += 7

    if alarm_enabled(station, "offline"):
        risk += 35

    return min(
        100,
        max(0, round(risk))
    )
