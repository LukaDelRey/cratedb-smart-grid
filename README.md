# CrateDB Smart Grid Digital Twin

Operativno SCADA okruzenje za simulaciju 1000 trafostanica, MQTT telemetriju, alarmni lifecycle, contingency scenarije, CrateDB analitiku, predictive scoring, spojeni physics model i Vue/Quasar digitalne twin prikaze.

## Pokretanje cijelog sustava

```powershell
docker compose up --build
```

Servisi nakon pokretanja:

- Frontend: http://localhost:5173
- FastAPI i Swagger: http://localhost:8000/docs
- CrateDB Admin UI: http://localhost:4200
- EMQX Dashboard: http://localhost:18083
- Locust: http://localhost:8089

U Locustu pokreni zeljeni broj virtualnih korisnika. Simulator salje telemetriju na `trafostanice/{station_id}/sensors`. EMQX pravilo sprema poruke u CrateDB, a backend je pretplacen na isti topic radi realtime WebSocket prikaza i alarmnog registra.

## EMQX pravilo za CrateDB

Postojeci EMQX-to-CrateDB tok je glavni put spremanja telemetrije. U EMQX rule engineu koristi:

```sql
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
```

PostgreSQL action prema CrateDB-u koristi:

```sql
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
```

Backend moze biti rezervni writer samo ako se eksplicitno postavi `PERSIST_MQTT_TELEMETRY=true`. Nemoj istodobno koristiti taj nacin i aktivno EMQX pravilo jer bi nastali dvostruki zapisi.

## Fault i alarm engine

Scenario Control u aplikaciji podrzava pojedinacne i regionalne scenarije:

- overload, overheating, voltage drop, short circuit i voltage instability
- harmonics spike, cooling failure, insulation degradation, oil leak i arc discharge
- feeder failure, transformer trip, station offline i sensor failure
- heatwave, peak consumption, storm, regional blackout i cascade failure

Alarm engine kombinira eksplicitne zastavice iz simulatora s dinamicnim pragovima iz mjerenja. Otvoreni alarm se deduplicira po stanici i tipu, prolazi lifecycle `ACTIVE -> ACK -> WORK_ORDER -> RESOLVED` i svaka promjena se sprema u audit.

## Lokalni razvoj frontenda

```powershell
cd frontend
npm install
npm run dev
```

Frontend prema zadanim postavkama koristi `http://localhost:8000`. Drugi URL moze se zadati varijablom `VITE_API_URL`.

## Konfiguracija backenda

| Varijabla | Zadana vrijednost | Namjena |
| --- | --- | --- |
| `CRATE_URL` | `http://cratedb:4200` | CrateDB HTTP endpoint |
| `MQTT_HOST` | `emqx` | MQTT broker |
| `MQTT_PORT` | `1883` | MQTT port |
| `PERSIST_MQTT_TELEMETRY` | `false` | Opcionalni rezervni backend writer; EMQX pravilo je zadano |
| `TELEMETRY_RETENTION_DAYS` | `7` | Zadrzavanje sirove telemetrije |
| `CORS_ORIGINS` | lokalni frontend URL-ovi | Dopusteni browser origins |

CrateDB, EMQX podaci i EMQX logovi koriste named volumene, pa podaci prezivljavaju ponovno stvaranje kontejnera.

## Kljucni API tokovi

- `GET /latest-stations` - najnovije stanje svake stanice
- `GET /api/stations/{id}/history` - povijesna telemetrija za twin grafikone
- `GET /api/alarms` - trajni alarmni registar
- `POST /api/alarms/{id}/acknowledge` - potvrda alarma
- `POST /api/alarms/{id}/work-order` - otvaranje radnog naloga
- `POST /api/alarms/{id}/resolve` - zatvaranje alarma
- `POST /api/scenarios/run` - pokretanje simuliranog kvara
- `POST /api/scenarios/{id}/stop` - prekid scenarija i povrat baznog stanja
- `GET /grid/forecast` - prognoza opterecenja i rizika
- `GET /ai/stations/{id}` - health, anomaly, load, blackout i lifetime predikcija asseta
- `GET /ai/training-dataset` - oznaceni NORMAL/WARNING/CRITICAL/FAILURE feature dataset
- `GET /physics/grid` - spojeni load-flow, thermal-loss i cascade snapshot
- `GET /n-1/{id}` - physics-backed contingency rezultat za ispad asseta
- `GET /system/topology` - stanje platformskog podatkovnog toka
- `WS /ws` - realtime telemetrija

## Provjere

```powershell
cd frontend
npm run build

cd ../backend
python -m unittest discover -s tests -v
```
