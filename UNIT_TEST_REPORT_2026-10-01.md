# Smart Grid — unit test izvještaj

**Posljednji status:** svih 22 dodatna nalaza popravljeno je. Završni rezultat: 423 testa, 422 prolaze, 0 ne prolazi, 1 preskočen. Aktualni izvještaj: `UNIT_TEST_22_FIXES_2026-10-01.md`.

**Aktualni prošireni audit:** ovaj izvještaj je povijesni. Novi skup ima 417 testova (394 prolaze, 22 ne prolaze, 1 preskočen). Pogledati `UNIT_TEST_FULL_REPORT_2026-10-01.md`; `test-results/` sada sadrži rezultate proširenog skupa.

**Naknadni status:** korisnik je odobrio popravke; svih osam nalaza riješeno je. Aktualno prolazi **190/190 testova**, uz uspješnu TypeScript provjeru. Izvorni audit u nastavku opisuje stanje prije popravaka. Detalji su u `UNIT_TEST_FIX_REPORT_2026-10-01.md`, a `test-results/` sadrži posljednje rezultate.

Datum: 1. listopada 2026. Opseg: pregled i unit/izolirani API testovi, prema naknadnoj uputi korisnika bez popravaka produkcijskog koda.

## Stvarni rezultat

| Suite | Ukupno | Prolazi | Ne prolazi | Errors | Skipped |
| --- | ---: | ---: | ---: | ---: | ---: |
| Backend, API i simulator | 107 | 104 | 3 | 0 | 0 |
| Frontend | 77 | 72 | 5 | 0 | 0 |
| Ukupno | 184 | 176 | 8 | 0 | 0 |

Početna testna baza imala je 46 backend i 17 frontend testova. Dodan je 121 test. Neuspjeli testovi ostaju aktivni i vraćaju exit code 1. Nisu označeni kao skipped/expected failure niti su očekivanja prilagođena neispravnom ponašanju.

Stvarni dokazi posljednjeg pokretanja:

- `test-results/backend.json`: broj testova, trajanje, neuspjeli testovi i ograničena trace pokrivenost.
- `test-results/backend.txt`: pojedinačni backend rezultati i tracebackovi.
- `test-results/frontend.txt`: frontend TAP rezultati i V8 coverage.

Posljednje pokretanje s coverageom: backend 0.912 s; frontend 3.272 s. Ovo su vremena lokalnih izoliranih testova, a ne performance baseline aplikacije.

## Pronađene greške

| ID | Područje | Očekivanje | Stvarno ponašanje | Regresijski test |
| --- | --- | --- | --- | --- |
| UT-01 | Digital twin identitet | Nepostojeći asset vraća 404 | Vraća 200 i podatke prve dostupne stanice pod traženim ID-jem | `test_api_contracts.py::test_unknown_asset_never_returns_another_station` |
| UT-02 | Power-line cache | Promjena lokacije stanice ponovno generira vodove | Cache ključ koristi samo ID-jeve pa vraća staru topologiju | `test_cache_and_schema.py::test_powerline_cache_invalidates_when_station_moves` |
| UT-03 | MQTT | Odbijena konekcija ne pokreće subscribe | Callback se pretplaćuje i za rc=5 te ispisuje Connected | `test_infrastructure.py::test_subscribe_only_on_successful_connection` |
| UT-04 | Povijest stanice | Stari odgovor ne prepisuje novu odabranu stanicu | Odgovor TS-1 pristigao nakon TS-2 prepisuje njezine podatke | `application.test.mjs`: `station history discards responses from a previously selected station` |
| UT-05 | Povijest stanice | Uklanjanje odabira čisti povijest | Podaci prethodne stanice ostaju prikazani | `application.test.mjs`: `station history clears data after asset selection is removed` |
| UT-06 | WebSocket | Neispravan JSON se obradi bez neuhvaćene iznimke | `JSON.parse` baca iznimku iz event handlera | `application.test.mjs`: `WebSocket malformed JSON is handled without an uncaught exception` |
| UT-07 | WebSocket lifecycle | Ponovljeni start tijekom CONNECTING koristi postojeću vezu | Otvara drugu vezu jer provjerava samo OPEN | `application.test.mjs`: `repeated start while WebSocket connects does not open a duplicate connection` |
| UT-08 | Redoslijed telemetrije | Noviji timestamp ostaje autoritativan | Starija WebSocket poruka prepisuje noviju | `application.test.mjs`: `older WebSocket telemetry never replaces newer station state` |

UT-01 i UT-04/05/08 izravno ugrožavaju ispravnost prikazanog asseta ili vremenskog stanja. Za prihvaćanje regresijskog suitea potrebno je riješiti svih osam nalaza. Produkcijski popravci nisu dio ove isporuke.

## Što je testirano

Backend:

- postojeći izračuni health/risk, blackout, prediction/training record i fizika mreže;
- alarmni pragovi, eksplicitne zastavice, dozvoljeni lifecycle prijelazi;
- stvarna reconcile logika: create, ponavljanje bez novog alarma, resolve, audit;
- ACK, work-order i idempotentni/odbijeni prijelazi;
- parametrizacija SQL filtera, granice limita, mapiranje redova i kronološki redoslijed;
- insert normalizacija i propagacija DB greške;
- latest-state deduplikacija, force refresh, cache i DB outage;
- FastAPI routing, query/body validacija, statusi 200/400/404/409/422/503 i response envelope;
- MQTT topic, JSON, subscribe, QoS, retry, publish failure i shutdown;
- cleanup SQL i otkazivanje petlje, bez stvarnog DELETE-a;
- event queue tok i broadcast nakon greške persistencea;
- scenario validacija, dovršetak, pokušaj restorea i publish failure;
- init DB schema pozivi kroz mock cursor i connection retry;
- Locust payload kroz stvarnu `send_sensor_data` funkciju uz kontroliran random i mock scheduler;
- shared station katalog, jedinstveni ID-jevi, koordinate i generator.

Frontend:

- sve exportane API funkcije, mapiranje envelopea, parametri, timeout konfiguracija, action body;
- propagacija HTTP 400/401/403/404/409/422/500, timeout i network error;
- stvarni Vue reactive/computed state, Pinia store i Vue mount/unmount lifecycle;
- REST telemetry, load/alarms/risk derivacije, djelomične greške i connection status;
- WebSocket ažuriranje/deduplikacija, reconnect i negativni testovi;
- sve composable datoteke: alarm center/register, forecast workspace/load forecast, station history, scenario control, dashboard map preferences/topbar/operator metrics;
- filtriranje, pretraga, severity sortiranje, serije, bounds, SVG koordinate;
- potvrđeni ACK odgovor i odbijanje akcije bez lažnog ACK statea;
- uklanjanje polling intervala nakon unmounta;
- i18n fallback i postojeći number/date/asset/metric helper testovi.

## Veza sa smjernicama projekta

Tekst svih `.docx` datoteka iz `smjernice-projekta` izdvojen je radi pregleda. Sljedeća matrica povezuje zahtjeve s implementacijom i dokazom. PDF/PPTX i PNG vizualne reference nisu zasebno verificirane ovim unit suiteom.

| Smjernica / dokument | Zahtjev | Testni dokaz / status |
| --- | --- | --- |
| `1. Projektni Cilj sustava.docx` | IoT/SCADA simulacija, MQTT, CrateDB, Vue realtime, geo lokacije | `test_simulator_contracts.py`, `test_repository_boundaries.py`, store/WebSocket testovi |
| `2. Korak -Locust simulator za 1000 trafostanica.docx` | Payload i katalog stanica | Generator/katalog i Locust payload testirani; 1000 paralelnih korisnika nije unit testirano |
| `3. Korak - EMQX → CrateDB integracija.docx` | Topic i odvojenost brokera/storagea | MQTT i DB granice testirane zasebno; živa EMQX rule integracija nije izvršena |
| `4. Korak - FastAPI backend.docx` | Latest/history/API/realtime | ASGI contract testovi, cache, queue, WebSocket manager |
| `5. Korak Vue + Quasar SCADA Dashboard.docx` | Dashboard state i realtime | Pinia, API i composable testovi; browser rendering nije izvršen |
| `5.1 Korak SCADA Transformer Dashboard Vue Quasar.docx` i transformer dokumenti | Asset drill-down, metrike, trendovi | Asset helperi, unknown twin regresija, history/metric testovi; Vue template interakcije ostaju otvorene |
| `6. Korak - Realtime Analytics + AI Anomaly Detection + Predictive Maintenance.docx` | Health/risk/prediction/training | Postojeći analytics/asset intelligence testovi i forecast workspace |
| `7. industry-grade Digital Twin arhitektura.docx` | Identitet i dinamičko stanje | Twin API, store derivacije, UT-01 i UT-08 |
| `7.1. Multi-layer power grid physics simulation (load flow).docx` | Load/cascade model | `test_grid_physics_extended.py`, `test_blackout_prediction.py`; fizička točnost modela nije certificirana |
| `Locust simulacija alarma i kvarova.docx` | Fault signature i restore | `test_scenario_payloads.py`, `test_simulator_contracts.py`, async scenario testovi |
| `Smart Grid Alarm Engine Architecture.docx` | Severity, rules, lifecycle, audit, correlation | Alarm rules/lifecycle/repository/API, center/register; eksterni notification kanali nisu testirani |
| `SCADA Alarm Center.docx` | Filtri, ACK i work order | Frontend center/register i backend transition testovi |
| `SCADA AI Forcecasting kod.docx` | Forecast prikaz i agregacije | Workspace/load forecast, API envelope, SVG finite-coordinate testovi |
| `SCADA Dashboard kod.docx`, `SCADA GEO Dashboard opis.docx` | KPI, geo state, service status | Store, topbar/operator metrics, map preferences i topology/health contracts |
| `SCADA Grid Map kod.docx` | Koordinate, topologija, risk prikaz | Powerline/katalog/physics testovi; UT-02; stvarni map renderer nije testiran |
| `SCADA Digital Twin kod.docx` | Odabrani asset i povezana analitika | Twin identity testovi i station history regresije |
| `SCADA Maintenance kod.docx` | Work-order state | Alarm work-order lifecycle i API body testovi; zaseban maintenance workflow nije potvrđen |
| `SQL upiti za dashboard.docx` | Latest, filteri i geo upiti | Latest/history/filter SQL konstrukcija testirana; izvršavanje geo SQL-a na CrateDB-u nije potvrđeno |
| `ToDo - Final - Utility Test Environment.docx` | Fault engine, AI dataset, physics i scenario lifecycle | Implementirani baseline testiran; 10k–100k poruka/s, trenirani ML/GNN, industrijski protokoli nisu dokazani |
| `Zakljuci.docx` | EMQX je broker, CrateDB storage | Granice ostaju odvojene; nisu preuzeta RabbitMQ pravila iz drugog projekta |

Smjernice su prijedlozi različitih faza i sadrže različite pragove: primjer temperature 85 °C u SQL dokumentu, primjer 95 °C u Alarm Engine dokumentu, a trenutna implementacija ima 90 °C. Testovi granica dokazuju aktualnu implementaciju; ne predstavljaju poslovno odobrenje konačnog praga.

Priloženi promptovi za MaxiMolding korišteni su kao metodološki primjer: otkrivanje strukture, kontrolirane fixture vrijednosti, negativni scenariji, stvarno pokretanje i transparentan izvještaj. Nisu preuzeti zahtjevi za Fleet customers/recipes, RabbitMQ, Vue UMD, zabranu TypeScripta/Vitea ili automatsku produkcijsku certifikaciju.

## Pokretanje

Iz korijena repozitorija:

```powershell
.\run-unit-tests.ps1
.\run-unit-tests.ps1 -Coverage
```

Zasebno:

```powershell
.\.venv\Scripts\python.exe backend\tests\run_suite.py --coverage
cd frontend
npm run test:unit
npm run test:unit:coverage
```

Koriste se postojeći Python `unittest`, Node `node:test`, TypeScript compiler, Vue, Pinia i Axios. Nisu instalirani dodatni paketi. Node 22.17.0 i Python 3.13 korišteni su u ovom okruženju.

Testni TS loader razrješava postojeće extensionless importe i zamjenjuje samo Vite environment granicu. Axios adapter se postavlja prije importa aplikacije. Node koristi `--experimental-test-isolation=none` zbog sandbox `spawn EPERM` ograničenja. Svaki test dobiva novu Pinia instancu, mountovi se uklanjaju nakon testa, a mockovi se resetiraju.

Konačni runner blokira stvarnu mrežu na Python/Node socket granici. Jedina Python iznimka je standard-library Windows socketpair za internu asyncio wake-up komunikaciju. FastAPI lifespan nije pokrenut. SQL DDL/DELETE i MQTT publish postoje isključivo na mock granicama u konačnom suiteu.

Napomena o pripremi: prvo frontend pokretanje imalo je pogrešno postavljen Axios mock nakon importa klijenta i pokušalo je kontaktirati lokalni API. Pokretanje je prekinuto; ti rezultati nisu prihvaćeni. Konačna priprema adapter postavlja unaprijed i ima dodatnu socket zabranu.

## Pokrivenost i ograničenja

Frontend V8 rezultat za učitane datoteke je 88.98% linija / 79.85% grana, uključujući testove i velike i18n datoteke. To nije pokrivenost cijelog frontenda. TS datoteke instrumentirane su nakon transpilationa; lokacije uncovered lines odnose se na izvršeni kod i nisu pouzdane izvorne TS lokacije bez source mapa.

Backend standard-library `trace` izvještaj nije puna aplikacijska coverage metrika: importi se događaju prije tracinga, a sync FastAPI handleri u worker threadovima nisu obuhvaćeni glavnim tracerom. Niska brojka za `main.py` zato ne znači da API contract testovi nisu izvršeni. Sirovi rezultat spremljen je uz ove napomene. Branch coverage backend nije mjeren.

Nisu izvršeni:

- stvarni CrateDB SQL/EMQX end-to-end integration testovi;
- Playwright browser testovi i vizualne regresije Vue komponenti i map layersa;
- soak/load testovi i dokaz kapaciteta 1000+ paralelnih stanica;
- backup/restore, deployment i rollback;
- puni security/RBAC/tenant audit ili produkcijski acceptance gateovi;
- sve async scenario start/cancel/overlap/persistence grane i sve lifecycle shutdown grane;
- dokaz svih zahtjeva iz razvojnih i vizualnih smjernica koji još nisu implementirani.

Unit testovi pokrivaju kritičnu poslovnu logiku i granice kroz cijeli tok aplikacije, ali ne znače 100% pokrivenost svake datoteke niti potpuni end-to-end ili production readiness dokaz. Trenutna regresijska provjera je **FAIL: 8 reproduciranih grešaka**.

## Promjene ove isporuke

Dodane su testne datoteke `backend/tests/test_api_contracts.py`, `test_repository_boundaries.py`, `test_infrastructure.py`, `test_cache_and_schema.py`, `test_simulator_contracts.py`, `test_bootstrap.py`, `run_suite.py`; frontend `application.test.mjs`, `register-loader.mjs`, `ts-loader.mjs`; zajednički `run-unit-tests.ps1`, ovaj izvještaj i `test-results/` dokazi.

U `frontend/package.json` promijenjene su samo dvije testne naredbe kako bi učitale TS loader i radile u ovom sandboxu. Zatečeni `UNIT_TEST_REPORT.md` ostaje kao prethodni baseline. Dvije privremene produkcijske izmjene za UT-01 i UT-03 vraćene su nakon korisnikove upute; zatečene promjene drugih datoteka nisu dio ove isporuke.
