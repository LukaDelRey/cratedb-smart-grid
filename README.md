Startup 

docker compose down

docker compose build --no-cache

docker compose up -d

SELECT *
FROM trafostanice_sensors
ORDER BY timestamp DESC
LIMIT 10;


docker compose down            

docker compose build --no-cache

docker compose up -d       



Rule select:
SELECT
  payload.timestamp AS timestamp,
  payload.station_id AS station_id,
  payload.station_name AS station_name,
  payload.location AS location,
  payload.electrical AS electrical,
  payload.thermal AS thermal,
  payload.oil_gas AS oil_gas,
  payload.alarms AS alarms
FROM "trafostanice/+/sensors"



Action insert:

INSERT INTO trafostanice_sensors (
  timestamp,
  station_id,
  station_name,
  location,
  electrical,
  thermal,
  oil_gas,
  alarms
)
VALUES (
  concat('', ${timestamp}),
  concat('', ${station_id}),
  concat('', ${station_name}),
  concat('', ${location}),
  ${electrical},
  ${thermal},
  ${oil_gas},
  ${alarms}
)