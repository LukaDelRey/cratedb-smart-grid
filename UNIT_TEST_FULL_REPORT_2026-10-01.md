# Ponovljeni potpuni unit audit — 1. listopada 2026.

**Naknadni popravci:** svih 22 nalaza u nastavku riješeno je na korisnikov zahtjev. Aktualni skup ima 423 testa (422 prolaze, 0 ne prolazi, 1 preskočen). Detalji su u `UNIT_TEST_22_FIXES_2026-10-01.md`; sadržaj ovog audita opisuje stanje prije tih popravaka.

Ponovno pokrenut i proširen skup testova cijele aplikacije. Rezultat **nije zelen**: 394 prolaze, 22 ne prolaze, 1 je preskočen. Raniji rezultat 190/190 odnosio se na manji skup i ne dokazuje ispravnost svih komponenti ili ispunjenje AI zahtjeva. Prethodni regresijski testovi ostaju u skupu.

| Skup | Testovi | Prolaze | Ne prolaze | Errors | Preskočeni |
| --- | ---: | ---: | ---: | ---: | ---: |
| Backend / izolirani API / simulator | 162 | 151 | 11 | 0 | 0 |
| Frontend / Vue komponente / ugovori | 255 | 243 | 11 | 0 | 1 |
| Ukupno | **417** | **394** | **22** | **0** | **1** |

TypeScript provjera `vue-tsc --noEmit -p tsconfig.app.json` prolazi. Neuspjeli testovi ostaju aktivni i daju exit code 1. U ovom ponovljenom auditu dodani su testovi, testni adapteri, inventar i izvještaj; produkcijski kod nije popravljan.

## Opseg i dokazi

Backend obuhvaća normalizaciju telemetrije, SQL granice i repositoryje, cache, konfiguraciju, inicijalizaciju baze, MQTT, WebSocket, event pipeline, cleanup, alarme i audit, fiziku mreže, prediction/training podatke, scenarije, njihove async zadatke i FastAPI rute. Testovi izvršavaju stvarni aplikacijski kod; baza, broker, mreža i persistence granice su zamijenjeni kontroliranim adapterima.

Frontend obuhvaća svih **45 aktivnih Vue komponenti**: setup/computed provjere s praznim podacima i telemetrijskom fixturom te renderiranje praznog stanja. Dodatni testovi provjeravaju karte i uklanjanje slojeva/listenera, grafikone, nulte vrijednosti, emitirane događaje, asset identitete, router, svih 9 composable modula, API servise, Pinia store, utils i hrvatske/engleske prijevode. Vue, Pinia i router su stvarni; Mapbox, Leaflet, Vue Flow i Vue ECharts vizualne granice su zamijenjene testnim adapterima. To nije provjera izgleda u pregledniku.

Jedina preskočena komponenta je `frontend/src/components/map/GridMap.vue`: neaktivni legacy sadržaj počinje nezatvorenim HTML komentarom i nije importiran u aplikaciju. Preskok je izričito zabilježen, a ne prikazan kao prolaz.

Inventar `test-results/source-inventory.csv` navodi svih **99 datoteka** u aplikacijskim direktorijima, uključujući module i resurse bez runtime unit provjere. `main.ts` browser bootstrap i `echarts.ts` registracija nisu izvršeni kao samostalni unit testovi; tipovi imaju statičku provjeru. CSS, slike, Docker i konfiguracije ne dobivaju lažan status prolaza funkcionalnih testova.

Dokazi:

- `test-results/backend.json` i `backend.txt`: brojevi, imenovani neuspjeli testovi, tracebackovi i pokrivenost Python linija.
- `test-results/frontend.json` i `frontend.txt`: brojevi, imenovani neuspjeli testovi, TAP i V8 coverage.
- `test-results/source-inventory.csv`: testni opseg po datoteci i jasno označena izuzeća.
- `test-results/project-guidelines.json`: inventar 45 projektnih smjernica, SHA-256 i relevantni izvatci DOCX teksta.

## Svih 22 neuspjela testa

### Backend — 11

| Nalaz | Reprodukcija / očekivanje | Test u `backend/tests` |
| --- | --- | --- |
| B01 | `electrical` kao lista ruši alarm reconcile; očekuje se kontrolirana obrada neispravne telemetrije | `test_async_lifecycle.py`: `test_alarm_reconcile_malformed_groups_never_crashes` |
| B02 | Stop scenarija prije prvog izvršavanja zadatka propušta `CancelledError` i ostavlja RUNNING stanje | `test_async_lifecycle.py`: `test_immediate_scenario_stop_does_not_escape_cancellation` |
| B03 | DB greška u listanju alarma ostaje neobrađena; predloženo očekivanje je eksplicitan 503 | `test_complete_api.py`: `test_alarm_list_database_failure_returns_service_unavailable` |
| B04 | Bez stanica backend ipak vraća 12 forecast točaka s confidence vrijednostima | `test_complete_api.py`: `test_empty_grid_does_not_produce_confident_forecast` |
| B05 | Heuristička predikcija nema oznaku metode ili verziju modela | `test_complete_api.py`: `test_heuristic_predictions_disclose_their_method` |
| B06 | AI confidence postotci nemaju priložen dokaz ili kalibraciju | `test_complete_api.py`: `test_insight_confidence_has_evidence_or_is_unavailable` |
| B07 | Normalna telemetrija dobiva tvrdnju „Cooling degradation detected” | `test_complete_api.py`: `test_normal_telemetry_does_not_claim_detected_cooling_failure` |
| B08 | Nepoznati digital twin tip prihvaćen je umjesto odbijenog zahtjeva | `test_complete_api.py`: `test_unknown_twin_type_is_rejected` |
| B09 | Weather rezultat izveden iz station risk podataka nema oznaku procjene ili izvora | `test_complete_api.py`: `test_weather_without_weather_source_is_explicitly_estimated` |
| B10 | Epoch timestamp u milisekundama zamijenjen je trenutnim vremenom | `test_data_quality.py`: `test_epoch_milliseconds_are_not_silently_replaced_with_current_time` |
| B11 | Naive `datetime` objekt ostaje bez UTC zone, za razliku od naive ISO stringa | `test_data_quality.py`: `test_naive_datetime_is_assumed_utc_like_naive_iso_string` |

B05, B06 i B09 su **predloženi acceptance ugovori za transparentnost izvora**, a ne postojeća dokumentirana JSON shema. Nazivi `method`, `modelVersion`, `confidenceEvidence`, `estimated` i `source` predloženi su načini ispunjavanja zahtjeva; druga jasno dokumentirana implementacija može biti jednako valjana. B03 također specificira predloženi status nedostupnosti servisa. Ovi nalazi odvojeni su od regresija već postojećih ugovora.

### Frontend — 11

| Nalaz | Reprodukcija / očekivanje | Test |
| --- | --- | --- |
| F01 | Mini chart izmišlja mjerenja kad je povijest prazna | `components.test.mjs`: `mini chart does not invent actual measurements when history is empty` |
| F02 | Grid health prikazuje izmišljene offline/maintenance brojeve | `components.test.mjs`: `grid health component does not invent offline or maintenance stations` |
| F03 | Izmjerena struja 0 u SubstationTwin zamijenjena je s 354 A | `components.test.mjs`: `substation twin preserves zero measured current instead of demo fallback` |
| F04 | Forecast zamjenjuje nulti load/risk fallback vrijednostima | `components.test.mjs`: `forecast chart preserves zero load and zero risk from server` |
| F05 | Forecast crta seriju i bez ulaznih podataka | `components.test.mjs`: `forecast chart does not invent a history/forecast series without any input` |
| F06 | Izmjerena frekvencija 0 zamijenjena je nominalnom | `components.test.mjs`: `operator frequency metric preserves a measured zero instead of nominal fallback` |
| F07 | TransformerTwin ne čuva stvarnu temperaturu ulja 0 | `components.test.mjs`: `transformer twin preserves a real zero oil temperature` |
| F08 | Nepostojeća stanica prikazuje izmišljeno mjerenje struje | `components.test.mjs`: `substation twin does not display fabricated measurement values for an unknown ID` |
| F09 | Ime korisnika ulazi neescapirano u map popup HTML; string test potvrđuje ulaz za HTML injection | `components.test.mjs`: `map popup text cannot inject HTML from a customer name` |
| F10 | Neispravni tekst koordinata postaje NaN za map renderer | `contracts.test.mjs`: `store invalid numeric coordinates are not exposed as NaN to map renderers` |
| F11 | GeoJSON Point objekt ne daje iste koordinate kao ekvivalentan tekst | `contracts.test.mjs`: `GeoJSON Point coordinates use the same longitude/latitude as string coordinates` |

F09 test provjerava generirani HTML string; nije izvršavao napadački JavaScript u pregledniku. Neuspjeli test F07 zaustavlja se na temperaturi ulja, pa dodatna load assertion u istom testu nije dokaz zasebnog nalaza.

## Veza s projektnim smjernicama

Priloženi promptovi za drugu aplikaciju korišteni su kao predložak za audit podataka, regresije i acceptance provjere. Njihovi zahtjevi za izmjene, deployment ili release nisu tretirani kao nova korisnikova autorizacija. Primijenjena je korisnikova uputa za ponovljeno testiranje ove aplikacije.

| Smjernice | Testna veza | Što rezultat dokazuje / što ostaje |
| --- | --- | --- |
| `1. Projektni Cilj sustava`, `2. Korak -Locust simulator za 1000 trafostanica`, Locust dokumenti | generator, jedinstveni ID-jevi, payload, granice randoma i simulator lifecycle | Izolirani oblik i ponašanje; stvarni throughput i 1000 aktivnih klijenata nisu testirani |
| `3. Korak - EMQX → CrateDB integracija`, EMQX upute, SQL upiti | MQTT callbacks/QoS, SQL parametrizacija, writer konfiguracija, DB init i cleanup | Kod granica je testiran; stvarni broker/rule engine/baza nisu pokrenuti |
| `4. Korak - FastAPI backend` | API ugovori, validacija, statusi, nepostojeći asseti, WebSocket i lifespan | Lokalni izolirani ASGI pozivi; stvarni HTTP server i deployment nisu provjereni |
| `5. Korak`, `5.1 Korak` i SCADA Dashboard/Grid Map/Digital Twin/Transformer dokumenti | 45 aktivnih komponenti, 9 map slojeva, asset router, history, metričke serije i nule | Logika i osnovni template render; pikselna usporedba PNG/PDF/PPTX uzoraka nije izvršena |
| `Smart Grid Alarm Engine Architecture`, `SCADA Alarm Center`, Locust alarm/kvar dokument | pragovi, reconcile, lifecycle, ACK, work order, audit, correlation/root cause | Izolirani lifecycle i ugovori; B01 i B03 ostaju |
| `6. Korak - Realtime Analytics + AI Anomaly Detection + Predictive Maintenance`, SCADA AI Forecasting | insight/forecast/prediction acceptance, training labels, feature izračuni, frontend nule | B04–B07 i F04–F05 potvrđuju nepouzdane prikaze; trenirani model nije implementiran |
| `7. industry-grade Digital Twin arhitektura`, `7.1. Multi-layer power grid physics simulation` | fizika, topologija, power-line cache, contingency, asset intelligence | Testirane formule; validacija prema stvarnom elektroenergetskom modelu nije izvršena |
| `ToDo - Final - Utility Test Environment`, `Zakljuci`, platform opis | scenario start/stop/restore, fault bootstrap, training records, inventar nedostataka | B02 ostaje; puna production acceptance, sigurnosni i performance audit nisu unit testovi |

DOCX tekst svih dokumenta u direktoriju ponovno je obrađen. Ostali referentni resursi evidentirani su u inventaru; to nije tvrdnja da su slike, PDF i prezentacija vizualno prihvaćeni.

### AI status

Kod i dalje koristi fiksne insight poruke, heurističke formule i konstruirane confidence postotke. Nije pronađen implementiran trening ili učitavanje IsolationForest/RandomForest modela koje navodi 6. korak. Training record endpoint i matematičke formule mogu proći unit testove bez treniranog modela. To ne dokazuje ML anomaly detection, prognostičku točnost ili kalibraciju. LSTM/GNN dio označen kao budući smjer nije tretiran kao obavezna postojeća funkcionalnost.

## Pokrivenost i granice zaključka

Python trace uključuje importe, discovery i worker threadove te sve aplikacijske Python module u nazivniku. To je pokrivenost izvršenih linija, bez branch coverage; importirana definicija ne dokazuje sve putanje funkcije. V8 report odnosi se na transformirani TS/SFC kod bez pouzdanog mapiranja svih originalnih linija; uključuje i testni harness. Njegov ukupni postotak nije postotak poslovnih zahtjeva, niti dokaz 100% izvornog koda.

Nisu izvršeni browser E2E, stvarna CrateDB/EMQX integracija, Docker deployment, benchmark 1000+ stanica, dugotrajan rad, stvarni vremenski servis, ML accuracy/calibration, penetracijski test ili vizualna acceptance usporedba. Zato se aplikacija ovim rezultatom ne može označiti production ready. Svaka aktivna komponenta ima osnovni test, ali svaki UI event, validacijska grana i stanje još nemaju zasebnu assertion.

## Ponovno pokretanje

Iz korijena projekta:

```powershell
.\run-unit-tests.ps1 -Coverage
```

Za statičku provjeru, iz `frontend` direktorija:

```powershell
node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p tsconfig.app.json
```

Runner obnavlja dokaze i inventar. Nije potrebno povezivanje na produkcijske servise. Exit code 1 je očekivan dok navedeni nalazi ostaju aktivni.
