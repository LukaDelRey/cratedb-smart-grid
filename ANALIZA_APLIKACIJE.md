# Detaljna analiza Smart Grid / CrateDB aplikacije

Ovaj dokument objašnjava izvršni kod aplikacije od nastanka jedne senzorske poruke do njezina prikaza na dashboardu. Naglasak je na dijelovima koji stvarno sudjeluju u toku podataka. Stilovi, prijevodi i statičke slike nisu analizirani redak po redak jer ne mijenjaju podatke ni ponašanje sustava.

## 1. Arhitektura u jednoj slici

```text
shared/stations.json
        |
        v
Locust simulator -- MQTT JSON --> EMQX broker
                                      |       |
                         EMQX rule ---+       +--- FastAPI MQTT subscriber
                              |                       |
                              v                       v
                           CrateDB             asyncio event_queue
                              ^                       |
                              |              alarm reconciliation
                              |                       |
                    FastAPI REST queries              v
                              |                WebSocket broadcast
                              +-----------+-----------+
                                          |
                                          v
                                  frontend/gridApi.ts
                                          |
                                          v
                                   Pinia sensorStore
                                          |
                         +----------------+----------------+
                         v                v                v
                    DashboardMap     Alarm panel     Forecast card
```

Najvažnije je razlikovati dva paralelna puta iste MQTT poruke:

1. Put za trajnu pohranu: `Locust -> EMQX Rule Engine -> CrateDB`.
2. Put za prikaz uživo: `Locust -> EMQX -> FastAPI MQTT client -> queue -> WebSocket -> Pinia`.

FastAPI ne sprema osnovnu telemetriju u `trafostanice_sensors`. Taj upis mora napraviti EMQX pravilo opisano u README-u. FastAPI sam sprema samo alarmni registar, audit alarma i zapise pokrenutih scenarija.

## 2. Docker infrastruktura

Važan kod: [`docker-compose.yml`](docker-compose.yml).

```yaml
services:
  cratedb:
    image: crate:latest
    ports:
      - "4200:4200"
      - "5432:5432"
    command: >
      crate
      -Ccluster.name=smart-grid
      -Cnode.name=node1
      -Cauth.host_based.enabled=false
```

- `crate:latest` pokreće jedan CrateDB čvor.
- Port `4200` služi za HTTP SQL API i CrateDB Admin UI.
- Port `5432` je PostgreSQL kompatibilni wire protocol.
- `cluster.name` i `node.name` samo imenuju klaster i čvor.
- Isključena host-based autentikacija olakšava lokalni razvoj, ali nije prikladna za produkciju.

```yaml
  emqx:
    image: emqx/emqx:latest
    ports:
      - "1883:1883"
      - "18083:18083"
```

- `1883` je MQTT port na koji Locust objavljuje, a backend se pretplaćuje.
- `18083` je EMQX administracijsko sučelje u kojem se konfigurira pravilo za CrateDB.
- `emqx_data` i `emqx_log` su named volumes, pa EMQX konfiguracija i logovi preživljavaju ponovno stvaranje kontejnera.

```yaml
  backend:
    depends_on:
      - cratedb
      - emqx
    ports:
      - "8000:8000"
```

`depends_on` određuje redoslijed pokretanja kontejnera, ali ne jamči da su CrateDB i EMQX već spremni. Zato backend u vlastitom kodu ima petlje `wait_for_cratedb()` i retry za MQTT.

Frontend sluša na `5173`, a Locust na `8089`. Docker mreža omogućuje servisima da se međusobno zovu imenima `cratedb` i `emqx`; zato backend koristi `http://cratedb:4200`, a ne `localhost`.

## 3. Statički katalog trafostanica

Važan kod: [`shared/generate_stations.py`](shared/generate_stations.py).

```python
CENTER_LAT = 46.3844
CENTER_LON = 16.4339

def generate_stations(count=1000):
    generated = []
    for i in range(count):
        lat_offset = random.uniform(-0.05, 0.05)
        lon_offset = random.uniform(-0.05, 0.05)
        station = {
            "id": f"TS-{i+1:04}",
            "name": f"Trafostanica {i+1}",
            "lat": round(CENTER_LAT + lat_offset, 6),
            "lon": round(CENTER_LON + lon_offset, 6)
        }
        generated.append(station)
    return generated
```

- Funkcija prema zadanim postavkama stvara 1000 objekata.
- `TS-{i+1:04}` daje identifikatore `TS-0001`, `TS-0002` itd.
- Offset od `+-0.05` stupnjeva raspoređuje stanice oko koordinata Čakovca.
- Ova funkcija stvara identitet i lokaciju, ali ne stvara senzorska mjerenja.

```python
def load_stations():
    if not stations_file.exists():
        data = generate_stations()
        save_stations(data)
        return data
    with open(stations_file, "r") as f:
        return json.load(f)

stations = load_stations()
```

Kod u trenutku importa provjerava `shared/stations.json`. Ako datoteka postoji, učitavaju se iste lokacije; ako ne postoji, lokacije se jednom generiraju i spremaju. Varijabla `stations` zato je zajednički katalog koji koriste Locust i endpoint `/stations`.

## 4. Locust: nastanak jedne telemetrijske poruke

Važan kod: [`locust-simulator/locustfile.py`](locust-simulator/locustfile.py).

```python
class TrafostanicaUser(User):
    wait_time = between(1, 3)

    @task
    def send_sensor_data(self):
        station = random.choice(stations)
```

Svaki virtualni Locust korisnik izvršava `send_sensor_data`, zatim čeka između jedne i tri sekunde. Korisnik ne predstavlja stalno jednu stanicu: pri svakom izvršavanju bira slučajnu stanicu. Broj poruka zato ovisi o broju virtualnih korisnika, a ne izravno o broju stanica.

```python
overload = random.random() < 0.02
overheating = random.random() < 0.01
sensor_failure = random.random() < 0.005
offline = random.random() < 0.003
voltage_drop = random.random() < 0.01
```

Svaka zastavica računa se neovisno. Jedna poruka može istodobno imati, primjerice, `overload=True` i `overheating=True`. Vjerojatnosti su 2%, 1%, 0,5%, 0,3% i 1% po generiranoj poruci.

```python
current = random.randint(150, 400)
oil_temp = random.randint(45, 85)

if overload:
    current = random.randint(450, 700)
if overheating:
    oil_temp = random.randint(90, 120)

voltage = round(random.uniform(9.8, 10.5), 2)
if voltage_drop:
    voltage = round(random.uniform(7.0, 9.0), 2)
```

Najprije nastaju normalne vrijednosti. Aktivna alarmna zastavica zatim mijenja povezanu fizičku vrijednost. To je važno jer backend risk ne gleda samo `alarms`, nego dodatno boduje struju i temperaturu; kvar tako povećava risk na dva načina.

```python
payload = {
    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime()),
    "station_id": station["id"],
    "station_name": station["name"],
    "location": f"({station['lon']},{station['lat']})",
    "electrical": {
        "voltage_kv": voltage,
        "current_a": current,
        "frequency_hz": round(random.uniform(49.8, 50.2), 2),
        "active_power_kw": random.randint(1000, 3000),
        "reactive_power_kvar": random.randint(100, 500),
        "harmonics_thd": round(random.uniform(1.0, 5.0), 2)
    },
    "thermal": { ... },
    "oil_gas": { ... },
    "alarms": { ... }
}
```

- `timestamp` je UTC tekst bez eksplicitne oznake vremenske zone.
- `location` je tekst u obliku `(longitude,latitude)`, a ne GeoJSON objekt.
- `electrical`, `thermal`, `oil_gas` i `alarms` namjerno odgovaraju CrateDB `OBJECT(DYNAMIC)` stupcima.
- `active_power_kw` nije izveden iz napona i struje; nasumično je generiran zasebno. Simulator zato nije fizički konzistentan load-flow model.

```python
publish.single(
    topic=f"trafostanice/{station['id']}/sensors",
    payload=json.dumps(payload),
    hostname="emqx",
    port=1883
)
```

Objekt se serijalizira u JSON i šalje brokeru. `publish.single` za svaku poruku stvara kratkotrajnu MQTT vezu, objavi poruku i zatvori vezu. To je jednostavno, ali skuplje od trajne veze pri velikom broju poruka.

## 5. EMQX pravilo i spremanje u CrateDB

Važan kod: [`README.md`](README.md).

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

`+` je MQTT wildcard za jednu razinu teme. Pravilo prihvaća poruke svih stanica i iz JSON payload-a izdvaja točno ona polja koja postoje u tablici.

```sql
INSERT INTO trafostanice_sensors (...)
VALUES (
  concat('', ${timestamp}),
  concat('', ${station_id}),
  concat('', ${station_name}),
  concat('', ${location}),
  ${electrical}, ${thermal}, ${oil_gas}, ${alarms}
)
```

Tekstualna polja prisilno se pretvaraju u tekst pomoću `concat('', value)`, dok se objekti šalju kao strukturirane vrijednosti. Ovo pravilo nije deklarirano u Docker Composeu niti se automatski instalira. Bez ručno stvorenog EMQX pravila tablica telemetrije ostaje prazna.

## 6. Inicijalizacija baze

Važan kod: [`backend/app/db/init_db.py`](backend/app/db/init_db.py).

```python
def wait_for_cratedb():
    while True:
        try:
            connection = client.connect(CRATE_URL)
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            return connection
        except Exception:
            time.sleep(5)
```

Petlja blokira pokretanje backenda dok baza ne odgovori. Vraća otvorenu vezu koju `init_db()` koristi za DDL naredbe. Nema maksimalnog broja pokušaja, pa backend može zauvijek ostati u čekanju ako CrateDB nije dostupan.

```sql
CREATE TABLE IF NOT EXISTS trafostanice_sensors (
    timestamp TIMESTAMP,
    station_id TEXT,
    station_name TEXT,
    location TEXT,
    electrical OBJECT(DYNAMIC) AS (...),
    thermal OBJECT(DYNAMIC) AS (...),
    oil_gas OBJECT(DYNAMIC) AS (...),
    alarms OBJECT(DYNAMIC) AS (...)
)
CLUSTERED INTO 4 SHARDS
```

`OBJECT(DYNAMIC)` znači da su navedena očekivana podpolja, ali CrateDB može prihvatiti i dodatna podpolja. Tablica nema primarni ključ: svaka poruka postaje novi vremenski zapis. Četiri sharda imaju smisla za distribuirani klaster, iako Compose trenutno pokreće samo jedan čvor.

`alarm_events` je trenutno stanje alarma. `alarm_audit` je nepromjenjiva povijest prijelaza. `scenario_runs` čuva metapodatke simulacija. Tablice `transformers`, `power_lines` i `region_analytics` postoje, ali trenutačni backend ih ne puni ni ne čita.

## 7. FastAPI životni ciklus

Važan kod: [`backend/app/main.py`](backend/app/main.py).

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_running_loop()
    start_mqtt(loop)
    asyncio.create_task(cleanup_old_data())
    asyncio.create_task(event_loop())
    asyncio.create_task(bootstrap_alarm_register())
    try:
        yield
    finally:
        await stop_all_scenarios()
```

- `loop` je glavni FastAPI asyncio event loop.
- MQTT biblioteka radi u vlastitoj dretvi, pa joj se predaje referenca na glavni loop.
- Tri pozadinska coroutine zadatka pokreću se bez blokiranja HTTP servera.
- `yield` označava razdoblje u kojem aplikacija prima zahtjeve.
- Pri gašenju se prekidaju aktivni scenariji, što pokreće njihovu logiku vraćanja početnog stanja.

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    await asyncio.to_thread(init_db)
    await asyncio.to_thread(start_mqtt, asyncio.get_running_loop())
    ...

app = FastAPI(lifespan=lifespan)
```

`init_db()` se izvršava u FastAPI lifespan fazi i čeka dostupnost CrateDB-a prije MQTT pretplate. Time import modula ostaje bez mrežnih nuspojava, a tablice nastaju prije obrade telemetrije.

## 8. MQTT subscriber, event queue i WebSocket

Važni dokumenti: [`mqtt_client.py`](backend/app/services/mqtt_client.py), [`event_bus.py`](backend/app/services/event_bus.py) i [`websocket_manager.py`](backend/app/services/websocket_manager.py).

```python
event_queue = asyncio.Queue()
```

Queue razdvaja sinkroni MQTT callback od asinkrone FastAPI obrade. MQTT callback samo validira JSON i stavlja ga u red; alarmni SQL i WebSocket slanje obavljaju se poslije.

```python
def on_connect(client_mqtt, userdata, flags, rc):
    client_mqtt.subscribe("trafostanice/+/sensors")

def on_message(client_mqtt, userdata, msg):
    payload = json.loads(msg.payload.decode())
    asyncio.run_coroutine_threadsafe(
        event_queue.put(payload),
        main_loop
    )
```

`msg.payload` dolazi kao bytes. `decode()` ga pretvara u string, a `json.loads()` u Python dict. `run_coroutine_threadsafe` je most između Paho dretve i asyncio petlje. Bez njega iz MQTT dretve ne bi bilo sigurno izravno koristiti `asyncio.Queue`.

```python
async def event_loop():
    while True:
        payload = await event_queue.get()
        await asyncio.to_thread(reconcile_alarm_payload, payload)
        await manager.broadcast(payload)
```

Obrada jedne poruke ima strogi redoslijed: prvo alarmni registar, zatim WebSocket. `reconcile_alarm_payload` je sinkron i radi SQL, pa se izvršava u worker threadu preko `asyncio.to_thread` kako ne bi zaustavio cijeli event loop.

```python
class ConnectionManager:
    async def connect(self, websocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    async def broadcast(self, data):
        for connection in self.active_connections:
            await connection.send_json(data)
```

Manager čuva otvorene browser veze. Svaka telemetrijska poruka šalje se svakom browseru. Slanje je serijsko, pa jedan spor klijent može usporiti cijeli broadcast. Ne postoji autentikacija, filtriranje po stanici ni backpressure ograničenje reda.

## 9. Trajni alarmni registar

Važan kod: [`backend/app/services/alarm_repository.py`](backend/app/services/alarm_repository.py).

```python
ALARM_DEFINITIONS = {
    "overload": {
        "title": "Transformer overload",
        "severity": "CRITICAL",
        "value_path": ("electrical", "current_a"),
        "unit": "A"
    },
    ...
}
```

Ova mapa prevodi sirovu boolean zastavicu u poslovni alarm. `value_path` kaže gdje iz payload-a uzeti mjerenu vrijednost. Za `sensor_failure` i `offline` vrijednost je `None` jer su to stanja, a ne mjerenja.

```python
for alarm_type, definition in ALARM_DEFINITIONS.items():
    is_active = bool(alarm_flags.get(alarm_type))
    existing = _open_alarm(cursor, station_id, alarm_type)
```

Za svaku od pet mogućih vrsta sustav traži otvoren alarm iste stanice i tipa. Otvorenima se smatraju `ACTIVE`, `ACK` i `WORK_ORDER`.

```python
if is_active and existing:
    UPDATE alarm_events
    SET last_seen=?, occurrence_count=?, value=?
```

Ponovljena aktivna zastavica ne stvara novi red. Ažurira zadnje vrijeme, povećava brojač i sprema zadnju izmjerenu vrijednost.

```python
if is_active:
    INSERT INTO alarm_events (... status ...)
    VALUES (... 'ACTIVE' ...)
    _write_audit(cursor, alarm_id, "CREATED")
```

Ako nema otvorenog alarma, stvara se UUID, status `ACTIVE` i audit zapis `CREATED`.

```python
if existing:
    UPDATE alarm_events
    SET status='RESOLVED', resolved_at=?
```

Ovaj blok može se dosegnuti samo kada `is_active` nije istinit. Dakle, prva sljedeća poruka iste stanice s alarmom `false` automatski zatvara prethodni alarm.

`transition_alarm()` dopušta operateru samo `ACK`, `WORK_ORDER` i `RESOLVED`. Kod `WORK_ORDER` generira identifikator naloga, a svaka radnja završava u `alarm_audit` tablici.

## 10. Scenario engine

Važan kod: [`backend/app/services/scenario_engine.py`](backend/app/services/scenario_engine.py).

```python
SCENARIO_DEFINITIONS = {
    "overload": {...},
    "overheating": {...},
    "short_circuit": {...},
    "voltage_instability": {...},
    "harmonics_spike": {...},
    "cooling_failure": {...},
    "insulation_degradation": {...},
    "oil_leak": {...},
    "arc_discharge": {...},
    "feeder_failure": {...},
    "transformer_trip": {...},
    "heatwave": {...},
    "peak_consumption": {...},
    "storm": {...},
    "voltage_drop": {...},
    "sensor_failure": {...},
    "offline": {...},
    "blackout": {...},
    "cascade": {...}
}
```

Definicije su metapodaci za UI i validaciju. `multiAsset=False` prisiljava jednu ciljnu stanicu, dok regionalni scenariji poput heatwave, storm, blackout i cascade koriste najmanje tri.

```python
def _station_priority(station):
    alarms = sum(1 for enabled in station["alarms"].values() if enabled)
    current = ...
    oil_temp = ...
    return alarms * 1000 + current + oil_temp * 2
```

Ako korisnik ne izabere stanicu, najprije se ciljaju već problematične stanice. Svaki aktivni alarm vrijedi 1000 bodova, pa dominira nad strujom i temperaturom.

```python
def _fault_payload(baseline, scenario_type, target_index):
    payload = deepcopy(baseline)
    payload["timestamp"] = _timestamp()
```

`deepcopy` sprječava izmjenu originalnog baseline objekta. Nakon toga određeni scenarij postavlja ekstremne vrijednosti: overload najmanje `650 A` i `4200 kW`, overheating najmanje `112/128 °C`, voltage drop najviše `7.8 kV`, a offline postavlja napon, struju i snagu na nulu.

```python
while loop.time() < deadline:
    for baseline in run["baselines"]:
        publish_sensor_payload(_fault_payload(...))
    await asyncio.sleep(2)
```

Scenarij svake dvije sekunde objavljuje kvar u isti MQTT topic kao Locust. Zbog toga simulirani kvar prolazi kroz potpuno isti EMQX, CrateDB, alarmni i WebSocket tok kao obična telemetrija.

U `finally` bloku šalje `_restored_payload`. To je nova MQTT poruka s potpunom kopijom početnog mjerenja i izvornim alarmima, pa zaustavljanje scenarija ne gasi alarm koji je postojao prije simulacije.

## 11. Odabir zadnjeg stanja stanice

Važan kod: [`backend/app/main.py`](backend/app/main.py).

```python
cursor.execute(f"""
    SELECT *
    FROM trafostanice_sensors
    ORDER BY timestamp DESC
    LIMIT {limit}
""")

latest = {}
for row in rows:
    station = dict(zip(columns, row))
    if station_id not in latest:
        latest[station_id] = station
```

SQL dohvaća najnovijih 10.000 poruka svih stanica. Budući da su retci već silazno sortirani, prvi red koji Python vidi za određeni `station_id` predstavlja zadnje stanje. Ovo je korektno dok se najnovije stanje svake relevantne stanice nalazi unutar limita. Efikasniji produkcijski pristup bio bi SQL window funkcija ili agregacija `MAX_BY` po stanici.

## 12. Analitičke formule

Važan kod: [`backend/app/services/grid_analytics.py`](backend/app/services/grid_analytics.py).

```python
score = 100
score -= oil_temp * 0.28
score -= max(0, current - 420) * 0.08
score -= max(0, abs(voltage - 110) - 8) * 0.8
score -= thd * 1.5
```

Health kreće od 100. Temperatura uvijek oduzima bodove; struja oduzima tek iznad `420 A`; napon ima toleranciju `+-8 kV` oko 110; THD uvijek oduzima bodove. Zatim alarmi oduzimaju dodatnih 8 do 30 bodova. Konačna vrijednost ograničava se na `0..100`.

```python
risk = 4
risk += oil_temp * 0.32
risk += current * 0.045
risk += max(0, active_power - 2600) * 0.012
risk += thd * 1.8
```

Risk je suprotan pokazatelj: viša vrijednost znači veći problem. Alarm overload dodaje 18, overheating 20, voltage drop 10, sensor failure 7, a offline 35. I ovdje se rezultat ograničava na `0..100`.

Važna greška modela: Locust generira približno `10 kV`, a health očekuje `110 kV`. Normalna stanica zato dobiva približno 73 boda naponske kazne. To može spustiti backend `gridHealth` gotovo na nulu čak i bez kvara.

## 13. Agregacijski endpointi

```python
@app.get("/grid/summary")
def grid_summary():
    latest_stations = fetch_latest_station_states()
    health_scores = [calculate_station_health(s) for s in latest_stations]
    risk_scores = [calculate_station_risk(s) for s in latest_stations]
    return {
        "gridHealth": mean(health_scores),
        "blackoutRisk": mean(risk_scores),
        "activeAlarms": len([s for s in latest_stations if has_alarm(s)]),
        "stations": len(latest_stations)
    }
```

`activeAlarms` ovdje nije broj pojedinačnih alarma. Ako jedna stanica ima tri aktivne zastavice, i dalje se računa kao jedna alarmirana stanica.

```python
def calculate_blackout_probability(stations):
    critical = 0
    for station in stations:
        if oil_temp > 90 or current > 500:
            critical += 1
    return (critical / len(stations)) * 100
```

`/blackout` nije vremenski model ni ML predikcija. To je udio trenutačno kritičnih stanica. `estimatedMinutes = int(probability * 4)` dodatna je heuristika bez vremenske serije.

```python
base_load = sum(active_power_kw) / 1000
for hour in range(12):
    demand_shape = 1 + ((hour % 6) - 2) * 0.035
    risk_shape = risk * (0.85 + (hour % 4) * 0.06)
```

`/grid/forecast` vraća 12 točaka. Opterećenje je trenutačni zbroj pomnožen periodičkim faktorom, risk je prosjek trenutačnog riska pomnožen drugim periodičkim faktorom, a confidence kreće od 94 i pada po satu. To je deterministička projekcija, ne naučeni forecast model.

`/ai/insights`, `/weather/grid-impact`, `/alarm-correlations`, `/root-cause` i `/n-1` također su rule-based konstrukcije. Naziv "AI" opisuje UI namjenu, ali u repozitoriju nema ML modela, treninga ni inference biblioteke.

## 14. Generiranje elektroenergetskih vodova

Važan kod: [`backend/app/services/powerline_generator.py`](backend/app/services/powerline_generator.py).

`normalize_station()` pretvara zapis iz baze s `station_id` i tekstualnom lokacijom u zajednički oblik `{id, lat, lon}`. `distance()` računa euklidsku udaljenost u stupnjevima, ne geodetsku udaljenost u kilometrima.

```python
for i, a in enumerate(nodes):
    for b in nodes[i + 1:]:
        edges.append({"from": a, "to": b, "distance": distance(a, b)})
edges.sort(key=lambda edge: edge["distance"])
```

Stvaraju se svi mogući parovi stanica. Za 1000 stanica to je 499.500 kandidata. Zatim se sortiraju od najkraćeg prema najdužem.

```python
if not uf.union(a["id"], b["id"]):
    continue
lines.append(build_line(lines, a, b))
```

`UnionFind` implementira Kruskalov algoritam. `union()` vraća `False` ako bi brid stvorio ciklus. Rezultat prvog prolaza je minimalno razapinjuće stablo s `N-1` vodova koje povezuje sve stanice.

Nakon toga dodaje se još `15%` najkraćih neiskorištenih bridova kako bi mreža izgledala realističnije. `build_line()` ipak dodjeljuje napon i opterećenje prema rednom broju voda, a ne prema telemetriji. Topologija je geometrijski uvjerljiva, ali nije stvarni elektroenergetski model.

## 15. Frontend bootstrap, router i tipovi

Važni dokumenti: [`frontend/src/main.ts`](frontend/src/main.ts), [`router/index.ts`](frontend/src/router/index.ts) i [`types/dashboard.ts`](frontend/src/types/dashboard.ts).

```ts
const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(Quasar)
app.mount('#app')
```

Pinia mora biti registrirana prije komponenti koje pozivaju `useSensorStore()`. Router mapira `/` na dashboard, a ostale URL-ove na digital twin, alarm center i forecasting stranice. `App.vue` sadrži samo `<router-view />`, pa odabrana ruta određuje cijeli prikaz.

`types/dashboard.ts` opisuje ugovor između API-ja, storea i komponenti. Većina polja stanice je opcionalna jer frontend mora preživjeti nepotpun MQTT payload. `PersistentAlarm` prati strukturu `alarm_events`, dok `AlarmEvent` predstavlja lakši, prolazni WebSocket događaj. To su namjerno dva različita modela.

Postoji tipna slabost: `ForecastPoint` je generički `Record`, a dio komponenti koristi `any`. TypeScript zato neće otkriti neke razlike između backend `snake_case` i frontend `camelCase` naziva.

## 16. `gridApi.ts`: transportni service sloj

Važan kod: [`frontend/src/services/gridApi.ts`](frontend/src/services/gridApi.ts).

```ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const api = axios.create({ baseURL: API_URL, timeout: 10000 })
```

Svaki REST poziv koristi isti base URL i timeout od deset sekundi. Produkcijska adresa može se zadati Vite varijablom.

```ts
export async function fetchLatestStations(): Promise<Station[]> {
  const response = await api.get('/latest-stations')
  return response.data.data || []
}
```

Service radi tri stvari: poziva endpoint, uklanja transportni omotač `{data: ...}` i daje TypeScript povratni tip. Ne sprema rezultat i ne sadrži UI logiku.

Ostale metode slijede isti obrazac. Alarmne akcije koriste POST, primjerice `/api/alarms/{id}/acknowledge`. Query parametar `stationId` prevodi se u backend naziv `station_id`.

```ts
export function getWebSocketUrl(): string {
  return API_URL
    .replace('http://', 'ws://')
    .replace('https://', 'wss://') + '/ws'
}
```

Isti host koristi se za WebSocket. HTTPS se pravilno pretvara u sigurni `wss` protokol.

## 17. `sensorStore.ts`: centralni frontend model

Važan kod: [`frontend/src/stores/sensorStore.ts`](frontend/src/stores/sensorStore.ts).

```ts
const stationsMap = ref<Record<string, Station>>({})
const regions = ref<Region[]>([])
const powerLines = ref<PowerLine[]>([])
const forecast = ref<ForecastPoint[]>([])
const summary = ref<GridSummary>({...})
const connection = ref<ConnectionState>({...})
```

`ref` čini vrijednosti reaktivnima. `stationsMap` koristi ID kao ključ, pa nova poruka može zamijeniti samo jednu stanicu u O(1), bez pretraživanja cijelog polja.

```ts
function updateStation(station: Station) {
  if (!station?.station_id) return
  stationsMap.value[station.station_id] = station
  const alarms = alarmList(station)
  ...
}
```

Ovo je glavna ulazna točka i za REST početno učitavanje i za WebSocket. Nakon zamjene zapisa svi `computed` izrazi koji čitaju stanice automatski se ponovno izračunavaju.

`stationAlarmSignatures` sprečava stvaranje identičnog UI eventa za svaku ponovljenu poruku istog alarma. Potpis uključuje ID, popis alarma, risk i status; novi događaj nastaje tek kada se nešto od toga promijeni.

```ts
const settled = await Promise.allSettled(
  entries.map(async ([key, promise]) => [key, await promise])
)
```

`refreshAll()` istodobno pokreće stanice, summary, regije, blackout, vodove, forecast, insights, weather, correlations, topology i CrateDB health. `allSettled` zadržava uspješne rezultate i kada jedan endpoint padne. Timer to ponavlja svakih 15 sekundi.

```ts
ws.onmessage = event => {
  const payload = JSON.parse(event.data)
  if (payload.station_id) {
    updateStation(payload)
    recordMetricSnapshot()
    return
  }
  pushEvent(...)
}
```

Senzorski payload odmah ažurira stanicu. Drugi tipovi WebSocket poruka postaju samo događaji. Kod zatvaranja veze store čeka tri sekunde i ponovno zove `connectWebSocket()`.

```ts
const totalLoadMW = computed(() => {
  const totalKW = stations.value.reduce(
    (sum, station) => sum + (station.electrical?.active_power_kw || 0), 0
  )
  return Math.round(totalKW / 1000)
})
```

Ovo nije backend vrijednost. Frontend je izračunava iz zadnjeg poznatog stanja svake stanice. Isto vrijedi za `transformers`, `customers` i `topRiskSubstations`.

Svaka stanica postaje jedan virtualni transformator. Svaka deseta stanica postaje virtualni customer cluster. `rulYears` je `health / 100 * 20`, a ne rezultat modela održavanja.

`recordMetricSnapshot()` sprema lokalne točke samo u memoriji browsera. Frekvencija, voltage stability i energy efficiency dodatno sadrže sinusne pulseve prema `Date.now()`. Nakon reloada povijest nestaje.

## 18. `DashboardPage.vue`: sastavljanje ekrana

Važan kod: [`frontend/src/pages/DashboardPage.vue`](frontend/src/pages/DashboardPage.vue).

```vue
<DashboardMap :focus-station="stationFocusRequest" />
<ActiveAlarmsEventsPanel
  :events="store.eventStream"
  :top-risk-substations="store.topRiskSubstations"
  @focus-station="focusStationOnMap"
/>
<LoadForecastCard :points="store.forecast" />
<BlackoutPredictionCard :prediction="store.blackout" />
```

DashboardPage ne dohvaća podatke sam. On čita store i prosljeđuje točno potrebne vrijednosti komponentama. To je jednosmjerni tok `store -> props -> prikaz`.

```ts
onMounted(() => {
  store.start()
})
```

`store.start()` prvo čeka početni REST `refreshAll()`, zatim otvara WebSocket i postavlja 15-sekundni refresh timer. Zato karta ne počinje s praznim realtime tokom ako u bazi već postoje podaci.

Kada alarmni panel emitira `focus-station`, stranica stvara novi objekt s ID-em i `requestedAt`. Timestamp osigurava da se i ponovni klik na istu stanicu tretira kao novi zahtjev.

## 19. Komponenta 1: Dashboard karta

Važni dokumenti: [`DashboardMap.vue`](frontend/src/components/dashboard/map/DashboardMap.vue), [`SubstationLayer.vue`](frontend/src/components/dashboard/map/layers/SubstationLayer.vue) i [`PowerLineLayer.vue`](frontend/src/components/dashboard/map/layers/PowerLineLayer.vue).

```ts
const DEFAULT_LAYERS = {
  regions:false,
  substations:true,
  transformers:false,
  lines:true,
  ...
}
```

DashboardMap je koordinator Mapbox slojeva. Na početku su vidljive stanice i vodovi. Ostale slojeve korisnik uključuje kroz `LayerPanel`.

```ts
map.value = new mapboxgl.Map({
  container: mapContainer.value,
  style: 'mapbox://styles/mapbox/dark-v11',
  center: [16.4339, 46.3844],
  zoom: 9.8
})
```

Mapbox instanca nastaje tek nakon mounta jer joj treba stvarni DOM element. Child layer komponente renderiraju se tek kada `mapLoaded` postane `true`; prije toga Mapbox source i layer API nije spreman.

`SubstationLayer.stationFeature()` pretvara backend stanicu u GeoJSON:

```ts
return {
  type:'Feature',
  geometry:{ type:'Point', coordinates:[location.lng, location.lat] },
  properties:{
    id:station.station_id,
    voltage:station.electrical?.voltage_kv || 0,
    health:store.getStationHealth(station),
    risk:store.getStationRisk(station),
    status:store.getStationStatus(station)
  }
}
```

GeoJSON `properties` postaju ulaz Mapbox expressionima. `statusColor` je `match` izraz koji critical boji crveno, warning narančasto, offline sivo, a ostalo zeleno.

```ts
watch(
  () => props.stations,
  () => source.setData(buildGeoJson()),
  { deep:true }
)
```

Kad WebSocket zamijeni jednu stanicu u storeu, `store.stations` se promijeni, prop se promijeni, watcher ponovno izgradi GeoJSON i Mapbox ažurira source. Sama karta se ne uništava i ne stvara ponovno.

Backend vodovi prolaze kroz `parseBackendLine()`. Koordinate iz backenda su `[lat, lon]`, a GeoJSON traži `[lon, lat]`, pa ih komponenta namjerno obrće. Ako backend vrati premalo vodova, `buildGeneratedLines()` na frontendu radi vlastitu nearest-neighbor topologiju. To znači da prikazani vod može biti backend MST ili frontend fallback, ovisno o broju valjanih rezultata.

## 20. Komponenta 2: aktivni alarmi i događaji

Važni dokumenti: [`ActiveAlarmsEventsPanel.vue`](frontend/src/components/dashboard/operations/alarms/ActiveAlarmsEventsPanel.vue) i [`useAlarmRegister.ts`](frontend/src/composables/useAlarmRegister.ts).

Komponenta je uglavnom prikaz: tablica iterira `visibleRows`, badge koristi `severity`, a četiri akcije otvaraju asset, fokusiraju kartu, potvrđuju alarm ili stvaraju radni nalog.

Prava logika je u composableu:

```ts
const persistentRows = persistentAlarms.value.map(...)
const liveRows = options.getEvents().filter(...).map(...)
const riskRows = options.getTopRiskSubstations()
  .filter(station => station.risk >= 40 && station.risk < 70)
  .map(...)
const mergedRows = [...persistentRows, ...liveRows, ...riskRows]
```

Tablica je kombinacija tri različita izvora:

1. Stvarni trajni alarmi iz `alarm_events`.
2. Prolazni WebSocket/UI događaji iz `eventStream`.
3. Sintetički `Load High` retci izvedeni iz risk rezultata.

`persistentAssets` sprječava da ista stanica istodobno dobije trajni i generirani risk red. Rezultat se sortira po `occurredAt`.

```ts
if (row.persistent) {
  await acknowledgePersistentAlarm(row.id)
  await refreshPersistentAlarms()
  return
}
```

Za trajni red akcija ide na backend i ostaje u CrateDB-u. Za live ili risk red samo se mijenja lokalni `Set`; takav ACK ili work order nestaje nakon reloada. Composable svakih 15 sekundi ponovno dohvaća otvorene trajne alarme.

## 21. Komponenta 3: Load Forecast

Važni dokumenti: [`LoadForecastCard.vue`](frontend/src/components/dashboard/right-sidebar/LoadForecastCard.vue) i [`useLoadForecast.ts`](frontend/src/composables/useLoadForecast.ts).

Komponenta dobiva samo `points`. Composable joj vraća već pripremljene SVG putanje, postotak, osi i sažetke. To drži matematičku logiku izvan templatea.

```ts
const historyPoints = computed(() => {
  const loads = store.metricHistory.totalLoadMW
  if (loads.length < 2) return []
  return loads.map(...)
})
```

Za način `1h` prednost ima lokalna povijest koju je store skupljao od otvaranja stranice. To je zapravo povijesni prikaz, ne buduća prognoza.

```ts
const displayPoints = computed(() => {
  if (mode.value === '1h' && historyPoints.value.length) {
    return historyPoints.value
  }
  return projectedPoints(activeRange.value)
})
```

Za `24h` i `7d` koristi se `projectedPoints()`. Funkcija interpolira 12 backend točaka na 28 točaka. Ako neka vrijednost nedostaje, generira sinusoidalni ciklus, shoulder val i mali rastući trend.

```ts
x = ((timestamp - start) / timelineRange) * 320
y = 132 - (loadPercent / 100) * 104 - 14
```

Ovo pretvara podatkovne vrijednosti u koordinatni sustav SVG-a. `linePath` je niz `x,y` točaka za `<polyline>`, a `areaPath` zatvara istu liniju do dna grafikona kako bi se mogla ispuniti bojom.

`capacityMW` uzima najveće od nominalnog kapaciteta `broj stanica * 3 MW`, trenutačnog opterećenja i promatranog maksimuma. Zato je prikazani postotak relativan prema dinamički procijenjenom kapacitetu, ne prema kapacitetu pohranjenom u bazi.

## 22. Blackout kartica kao jednostavniji završni primjer

[`BlackoutPredictionCard.vue`](frontend/src/components/dashboard/right-sidebar/BlackoutPredictionCard.vue) nema vlastiti dohvat niti model. Prima `store.blackout`, prikazuje `probability`, `affectedStations` i `estimatedMinutes`, a dva computed izraza biraju tekst i boju prema pragovima 35% i 70%.

Prop `topRisk` deklariran je, ali se u komponenti ne koristi. Sav prikazani sadržaj dolazi iz `/blackout` endpointa.

## 23. Potpuni život jedne overload poruke

1. Locust odabere `TS-0042` i dobije `overload=True`.
2. Struju promijeni iz normalnih `150-400 A` u `450-700 A`.
3. JSON objavi na `trafostanice/TS-0042/sensors`.
4. EMQX pravilo upiše cijeli payload u `trafostanice_sensors`.
5. FastAPI MQTT callback isti JSON stavi u `event_queue`.
6. `reconcile_alarm_payload` stvori ili ažurira `alarm_events` za `TS-0042/overload`.
7. `manager.broadcast` pošalje payload browseru.
8. `sensorStore.updateStation` zamijeni `stationsMap['TS-0042']`.
9. `getStationRisk` boduje povišenu struju i dodatnih 18 bodova za overload.
10. `SubstationLayer` watcher izgradi novi GeoJSON i marker može postati warning ili critical.
11. `pushEvent` dodaje red u realtime stream ako se potpis alarma promijenio.
12. Alarm panel u sljedećem refreshu trajnih alarma dobiva i CrateDB `alarm_events` zapis.
13. Nakon najviše 15 sekundi REST refresh ponovno izračuna globalni summary, blackout, forecast, insights, regije i vodove iz najnovijih CrateDB stanja.

## 24. Najvažnije nedosljednosti i ograničenja

1. Simulator je sintetički i nije kalibriran prema stvarnom Čakovec load-flow modelu ili zaštitnim relejima.
2. Backend i frontend imaju odvojene, trenutačno usklađene kopije health/risk formula; promjene se moraju primijeniti na oba mjesta.
3. `stationAnalytics.ts` je stari, praktično nekorišteni treći skup sličnih formula.
4. Predictive scoring, weather, forecast, root cause i blackout su objašnjivi baseline modeli, ne trenirani produkcijski ML modeli.
5. EMQX pravilo za CrateDB nije automatski provisionirano.
6. Vodovi, transformatori i customer clusteri većinom su izvedeni ili sintetički, ne zasebno izmjereni asseti.
7. Lokalna metric history nije dohvaćena iz CrateDB-a i gubi se reloadom.
8. Unit testovi pokrivaju formule, alarmna pravila, lifecycle, scenarije, physics i normalizaciju; puni browser/WebSocket E2E suite još nije automatiziran.
9. CrateDB sada koristi named volume, a zasebni recovery volume čuva kopiju prethodno pronađenih podataka.
10. `fetch_latest_station_states` koristi kratki zajednički cache, ali početno osvježavanje i dalje učitava i deduplicira do 10.000 redaka u Pythonu.
11. Lokalni razvoj nema autentikaciju, TLS ni RBAC; CrateDB host-based autentikacija namjerno je isključena i to nije produkcijska konfiguracija.

## 25. Mentalni model za čitanje projekta

Kada pratiš neku vrijednost na dashboardu, postavi ova četiri pitanja:

1. Je li vrijednost izravno simulirana u `locustfile.py`?
2. Je li spremljena u CrateDB ili samo prolazi WebSocketom?
3. Računa li je backend endpoint ili frontend `computed`?
4. Prikazuje li komponenta stvarnu vrijednost, heuristiku ili fallback?

Primjer: `oil_temp_c` je simulirana, spremljena i direktno prikazana vrijednost. `station risk` je frontend/backend heuristika izvedena iz više mjerenja. `forecast confidence` je generirani broj. `transformer RUL` je frontend formula iz health rezultata. Ta razlika je ključna za ispravno razumijevanje cijele aplikacije.
