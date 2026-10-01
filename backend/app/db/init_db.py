import time
from crate import client

from app.config import CRATE_URL

def wait_for_cratedb():
    while True:
        try:
            connection = client.connect(CRATE_URL)
            cursor = connection.cursor()

            cursor.execute("SELECT 1")

            print("CrateDB connected!")
            return connection

        except Exception as e:
            print("Waiting for CrateDB...")
            print(e)

            time.sleep(5)
            

def init_db():

    connection = wait_for_cratedb()

    cursor = connection.cursor()

    sql = """
    CREATE TABLE IF NOT EXISTS trafostanice_sensors (

        timestamp TIMESTAMP,
        station_id TEXT,
        station_name TEXT,

        location TEXT,

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
        ),

        alarms OBJECT(DYNAMIC) AS (
            overload BOOLEAN,
            overheating BOOLEAN,
            sensor_failure BOOLEAN,
            offline BOOLEAN,
            voltage_drop BOOLEAN
        )
    )
    CLUSTERED INTO 4 SHARDS
    """

    cursor.execute(sql)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transformers (

        timestamp TIMESTAMP,

        transformer_id TEXT,
        transformer_name TEXT,

        station_id TEXT,

        location TEXT,

        load_pct DOUBLE,

        health_score DOUBLE,

        oil_temp_c DOUBLE,

        status TEXT
    )
    CLUSTERED INTO 2 SHARDS
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS power_lines (

        line_id TEXT,

        from_station TEXT,

        to_station TEXT,

        voltage_kv DOUBLE,

        load_pct DOUBLE,

        status TEXT
    )
    CLUSTERED INTO 2 SHARDS
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS region_analytics (

        timestamp TIMESTAMP,

        region_id TEXT,

        health_score DOUBLE,

        blackout_risk DOUBLE,

        active_alarms INTEGER,

        total_stations INTEGER
    )
    CLUSTERED INTO 2 SHARDS
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alarm_events (
        id TEXT PRIMARY KEY,
        station_id TEXT,
        alarm_type TEXT,
        title TEXT,
        severity TEXT,
        status TEXT,
        source TEXT,
        value DOUBLE,
        unit TEXT,
        first_seen TIMESTAMP,
        last_seen TIMESTAMP,
        occurrence_count INTEGER,
        acknowledged_at TIMESTAMP,
        acknowledged_by TEXT,
        work_order_id TEXT,
        work_order_created_at TIMESTAMP,
        resolved_at TIMESTAMP,
        metadata OBJECT(DYNAMIC)
    )
    CLUSTERED INTO 2 SHARDS
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alarm_audit (
        id TEXT PRIMARY KEY,
        alarm_id TEXT,
        action TEXT,
        actor TEXT,
        note TEXT,
        timestamp TIMESTAMP
    )
    CLUSTERED INTO 2 SHARDS
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS scenario_runs (
        id TEXT PRIMARY KEY,
        scenario_type TEXT,
        status TEXT,
        requested_by TEXT,
        started_at TIMESTAMP,
        ends_at TIMESTAMP,
        completed_at TIMESTAMP,
        duration_seconds INTEGER,
        target_station_ids TEXT,
        emitted_events INTEGER,
        error TEXT
    )
    CLUSTERED INTO 2 SHARDS
    """)

    print("Database initialized!")
