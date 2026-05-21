CREATE TABLE IF NOT EXISTS trafostanice_sensors (
    timestamp TIMESTAMP,
    station_id TEXT,
    station_name TEXT,
    location GEO_POINT,

    electrical OBJECT(DYNAMIC) AS (
        voltage_kv DOUBLE,
        current_a DOUBLE,
        frequency_hz DOUBLE,
        active_power_kw DOUBLE,
        reactive_power_kvar DOUBLE,
        harmonics_thd DOUBLE
    ),

    thermal OBJECT(DYNAMIC) AS (
        oil_temp_c DOUBLE,
        winding_temp_c DOUBLE,
        busbar_temp_c DOUBLE,
        ambient_temp_c DOUBLE
    ),

    oil_gas OBJECT(DYNAMIC) AS (
        oil_level_percent DOUBLE,
        oil_pressure_bar DOUBLE,
        humidity_ppm DOUBLE,
        hydrogen_ppm DOUBLE,
        methane_ppm DOUBLE,
        acetylene_ppm DOUBLE
    )
);