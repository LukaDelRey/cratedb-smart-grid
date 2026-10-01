import asyncio
from crate import client

from app.config import CRATE_URL, TELEMETRY_RETENTION_DAYS

async def cleanup_old_data():

    while True:

        try:

            cursor = client.connect(CRATE_URL).cursor()

            cursor.execute(f"""
                DELETE FROM trafostanice_sensors
                WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '{TELEMETRY_RETENTION_DAYS} days'
            """)

            print("Old data cleaned")

        except Exception as e:
            print("Cleanup error:", e)

        await asyncio.sleep(3600)
