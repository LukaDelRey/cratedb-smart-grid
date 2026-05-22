import asyncio
from crate import client

connection = client.connect("http://cratedb:4200")

async def cleanup_old_data():

    while True:

        try:

            cursor = connection.cursor()

            cursor.execute("""
                DELETE FROM trafostanice_sensors
                WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '7 days'
            """)

            print("Old data cleaned")

        except Exception as e:
            print("Cleanup error:", e)

        await asyncio.sleep(3600)