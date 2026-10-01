# Popravci svih 22 nalaza — 1. listopada 2026.

Svih 22 neuspjela testa iz proširenog audita sada prolazi. Nakon dodatnih regresijskih provjera ukupni skup ima **423 testa: 422 prolaze, 0 ne prolazi, 1 je preskočen**. TypeScript provjera i `git diff --check` prolaze.

| Skup | Testovi | Prolaze | Ne prolaze | Preskočeni |
| --- | ---: | ---: | ---: | ---: |
| Backend / API / simulator | 166 | 166 | 0 | 0 |
| Frontend / komponente / ugovori | 257 | 256 | 0 | 1 |
| Ukupno | 423 | 422 | 0 | 1 |

Jedini preskok ostaje neaktivna legacy komponenta `components/map/GridMap.vue`, koja nije importirana u aplikaciju. Niti jedan od 22 nalaza nije skriven preskakanjem ili promjenom očekivanja njegova testa.

## Što je popravljeno

| Nalaz prethodnog audita | Promjena |
| --- | --- |
| B01 | Alarm pravila toleriraju neispravne object grupe; lista/string više ne uzrokuju poziv `.get()` nad pogrešnim tipom. |
| B02 | Stop prije prvog izvršavanja scenario taska obrađuje cancellation i zapisuje STOPPED te completion timestamp. Shutdown koristi isti stop put. Za scenarije koji su emitirali događaje ostaje postojeći restore u finally bloku. |
| B03 | Nedostupna baza pri listanju alarma vraća 503 s neutralnim opisom nedostupnosti. |
| B04 | Bez telemetrije nema konstruiranih forecast točaka. |
| B05 | Station prediction navodi `method: heuristic` i nedostupnu confidence vrijednost. |
| B06 | Uklonjeni su fiksni AI confidence postotci; vrijednost je null, a UI prikazuje da pouzdanost nije dostupna. |
| B07 | Uklonjene su tri stalne insight tvrdnje. Upozorenja se emitiraju samo za stanicu koja prelazi prag struje, temperature ulja ili heurističkog rizika. Ne tvrde dijagnosticirani kvar ili rok budućeg kvara. |
| B08 | Digital twin odbija nepoznat asset tip. |
| B09 | Weather payload i panel označavaju procjenu iz telemetrije bez meteoroloških opažanja. |
| B10 | Numerički epoch u sekundama i milisekundama pravilno se pretvara u UTC, bez zamjene trenutnim vremenom. |
| B11 | Naive datetime dobiva UTC zonu, kao i naive ISO string. |
| F01 | Mini chart prikazuje samo dostupnu povijest; bez nje ne izmišlja mjerenja niti demo forecast. Jedno mjerenje ima konačne koordinate. |
| F02 | Offline i maintenance brojevi dolaze iz station flags, bez statistički izmišljenih brojeva. |
| F03 | Substation struja 0 ostaje 0; primijenjeno i na susjedne mjerne vrijednosti. |
| F04 | Forecast interpolacija čuva stvarni nulti load/risk/confidence umjesto zamjene sinusoidom ili nominalnim vrijednostima. |
| F05 | Bez forecast ulaza nema buduće serije. Postojeća povijest i dalje se prikazuje u history rasponu. |
| F06 | Operator frekvencija 0 ostaje 0, bez nominalnog 50.02 Hz fallbacka. |
| F07 | Transformer temperatura ulja i load 0 ostaju 0; uklonjeni su demo fallbackovi i za winding temperature/health/risk. |
| F08 | Nepostojeća stanica nema 354 A i slična demo mjerenja. Twin stranice prikazuju poruku o nedostupnoj telemetriji; nule u numeričkom prikazu predstavljaju prazno stanje. |
| F09 | Dinamična polja customer popup HTML-a escapiraju &, <, >, navodnike i apostrof prije prosljeđivanja Mapboxu. |
| F10 | Neispravne ili izvanrasponske koordinate koriste konačni map fallback. |
| F11 | GeoJSON Point koordinate koriste isti longitude/latitude redoslijed kao tekst. |

Acceptance ugovori B05/B06/B09 iz prethodnog izvještaja sada su implementirani; nisu predstavljeni kao regresije ranije objavljene API sheme. Tipovi ForecastPoint/Insight dopuštaju null confidence, a oba jezika imaju tekstove za nedostupnu pouzdanost, vremensku procjenu i nedostupnu telemetriju.

Jedan stariji test prije je očekivao 28 izmišljenih budućih točaka na sedmodnevnom rasponu bez forecast ulaza. Njegova assertion promijenjena je u praznu buduću seriju kako bi odgovarala popravku F05; provjere stvarne povijesti i konačnih SVG koordinata zadržane su. Izvorni testovi za svih 22 nalaza zadržali su očekivanja.

Dodano je šest regresijskih testova: scoping threshold upozorenja i null confidence, nulti backend forecast, ekvivalentnost epoch sekundi/milisekundi, koordinate izvan raspona, prikaz nedostupne confidence te shutdown neposredno nakon scenario starta.

## Dokazi i ograničenja

`test-results/backend.json`, `backend.txt`, `frontend.json` i `frontend.txt` sadrže rezultate završnog pokretanja. Inventar izvora i veza sa smjernicama ostaju u `source-inventory.csv` i `project-guidelines.json`. Coverage ograničenja opisana su u `UNIT_TEST_FULL_REPORT_2026-10-01.md`.

AI je i dalje **heuristički**, a weather prikaz je procjena izvedena iz telemetrije. Ovim popravcima nije implementiran trenirani IsolationForest/RandomForest model niti stvarni meteorološki servis. Uklonjene su neutemeljene tvrdnje i postotci; zeleni unit testovi ne dokazuju ML točnost ili production readiness.

Stvarna CrateDB/EMQX integracija i browser E2E nisu pokrenuti. Provjerena je lokalna aplikacijska logika s kontroliranim vanjskim granicama, svih 45 aktivnih komponenti te TypeScript tipovi.

Ponovno pokretanje iz korijena:

```powershell
.\run-unit-tests.ps1 -Coverage
```
