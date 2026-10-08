from math import exp

from app.services.grid_analytics import (
    calculate_station_health,
    calculate_station_risk,
    nested_value,
)


def _clamp(value, minimum=0.0, maximum=100.0):
    return max(minimum, min(maximum, float(value)))


def classify_operating_state(station):
    alarms = station.get("alarms") or {}
    critical_flags = {
        "offline",
        "short_circuit",
        "transformer_trip",
        "feeder_failure",
        "arc_discharge",
    }

    if any(bool(alarms.get(key)) for key in critical_flags):
        return "FAILURE"

    risk = calculate_station_risk(station)
    if risk >= 70 or any(bool(value) for value in alarms.values()):
        return "CRITICAL"
    if risk >= 40:
        return "WARNING"
    return "NORMAL"


def station_prediction(station):
    current = float(nested_value(station, "electrical", "current_a") or 0)
    voltage = float(nested_value(station, "electrical", "voltage_kv") or 0)
    power = float(nested_value(station, "electrical", "active_power_kw") or 0)
    thd = float(nested_value(station, "electrical", "harmonics_thd") or 0)
    oil_temp = float(nested_value(station, "thermal", "oil_temp_c") or 0)
    winding_temp = float(nested_value(station, "thermal", "winding_temp_c") or oil_temp)
    ambient_temp = float(nested_value(station, "thermal", "ambient_temp_c") or 20)
    hydrogen = float(nested_value(station, "oil_gas", "hydrogen_ppm") or 0)
    methane = float(nested_value(station, "oil_gas", "methane_ppm") or 0)
    acetylene = float(nested_value(station, "oil_gas", "acetylene_ppm") or 0)

    load_factor = _clamp(current / 500 * 100)
    temp_gradient = max(0.0, winding_temp - ambient_temp)
    gas_index = hydrogen + methane * 2 + acetylene * 5
    thermal_stress = _clamp((temp_gradient - 25) * 1.6)
    power_quality_stress = _clamp(max(0.0, thd - 2.0) * 18)
    gas_stress = _clamp(gas_index * 1.4)
    degradation = _clamp(
        load_factor * 0.25
        + thermal_stress * 0.35
        + power_quality_stress * 0.15
        + gas_stress * 0.25
    )

    health = calculate_station_health(station)
    risk = calculate_station_risk(station)
    predicted_current = current * (1.02 + min(0.16, degradation / 700))
    blackout_probability = _clamp(100 / (1 + exp(-((risk - 55) / 10))))
    remaining_life_days = max(
        30,
        round(25 * 365 * (health / 100) * (1 - degradation / 140)),
    )

    return {
        "stationId": station.get("station_id") or station.get("id"),
        "method": "heuristic",
        "confidence": None,
        "operatingState": classify_operating_state(station),
        "healthScore": health,
        "riskScore": risk,
        "anomalyScore": round(_clamp((risk + degradation) / 2), 1),
        "predictedLoadA": round(predicted_current, 1),
        "predictedLoadMW": round(
            power / 1000 * (predicted_current / max(current, 1)), 2
        ),
        "blackoutProbability": round(blackout_probability, 1),
        "remainingLifeDays": remaining_life_days,
        "degradationPercent": round(degradation, 1),
        "features": {
            "loadFactor": round(load_factor / 100, 3),
            "tempGradientC": round(temp_gradient, 1),
            "gasIndex": round(gas_index, 1),
            "voltageKv": round(voltage, 2),
            "harmonicsThd": round(thd, 2),
        },
    }


def training_record(station):
    prediction = station_prediction(station)
    return {
        "timestamp": station.get("timestamp"),
        "stationId": prediction["stationId"],
        "label": prediction["operatingState"],
        "healthScore": prediction["healthScore"],
        "riskScore": prediction["riskScore"],
        "degradationPercent": prediction["degradationPercent"],
        "blackoutProbability": prediction["blackoutProbability"],
        **prediction["features"],
    }
