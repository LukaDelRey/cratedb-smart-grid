import time
from crate import client

CRATE_URL = "http://cratedb:4200"

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

        location GEO_POINT INDEX USING GEOHASH WITH (
            precision = '1m'
        ),

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
            overheating BOOLEAN
        )

    )
    CLUSTERED INTO 4 SHARDS
    """

    cursor.execute(sql)

    print("Database initialized!")