Startup 

docker compose down

docker compose up -d --build

cd locust

venv\Scripts\activate 

locust -f locustfile.py

SELECT *
FROM trafostanice_sensors
ORDER BY timestamp DESC
LIMIT 10;