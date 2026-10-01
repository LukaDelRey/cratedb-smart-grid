# Unit Test Baseline

Datum provjere: 2026-09-30

## Rezultat

| Područje | Ukupno | Prolazi | Ne prolazi |
| --- | ---: | ---: | ---: |
| Backend | 46 | 46 | 0 |
| Frontend | 17 | 17 | 0 |
| Ukupno | 63 | 63 | 0 |

Prije ove provjere postojalo je 17 backend testova i nije bilo frontend unit testova. Dodano je 29 backend i 17 frontend testova.

## Pronađeni i ispravljeni nedostaci

### 1. Frontend i backend ne izračunavaju jednako rizik stanice

Prije ispravka referentna stanica bez alarma i s normalnim mjerenjima na backendu se klasificirala kao `NORMAL`, dok je stara frontend formula vraćala:

- health: `79`
- risk: `41`

Vrijednost `41` ulazila je u frontend `WATCH/WARNING` raspon. Frontend sada koristi jednu zajedničku implementaciju usklađenu s backend pravilima; ista stanica dobiva rizik `7`. `sensorStore` također koristi tu implementaciju umjesto vlastite kopije formule.

Regression test:

`frontend/tests/coreLogic.test.mjs` - `a normal station matches the backend risk score`

### 2. Generator vodova odbacuje valjanu koordinatu nula

`generate_power_lines()` je provjeravao koordinatu preko truthy vrijednosti. Provjera sada eksplicitno prihvaća numeričku nulu i zahtijeva da postoje latitude i longitude.

Regression test:

`backend/tests/test_powerline_generator.py` - `test_zero_latitude_is_a_valid_coordinate`

## Pokrivenost

Frontend coverage alat pokazuje 100% line coverage i 87.31% branch coverage samo za pet učitanih modula:

- `utils/assets.ts`
- `utils/dateTime.ts`
- `utils/metricSeries.ts`
- `utils/numbers.ts`
- `services/stationAnalytics.ts`

Frontend ukupno ima 70 `.ts` i `.vue` izvornih datoteka. Izravno je unit testirano 5 od 70 datoteka, odnosno približno 7.1%. Zato se rezultat od 100% ne smije tumačiti kao pokrivenost cijelog frontenda.

Backend ima 12 servisnih modula, od kojih je 9 izravno obuhvaćeno testovima. Najbolje su pokrivene čiste funkcije za analitiku, fiziku mreže, WebSocket distribuciju i blackout izračun. DB i infrastrukturne grane ostaju znatno slabije pokrivene.

## Što je pokriveno

- alarm lifecycle prijelazi i dinamički pragovi
- health i risk izračuni
- asset prediction i klasifikacija stanja
- blackout probability
- pojednostavljeni grid physics i cascade propagation
- generiranje power-line topologije
- fault i restore payloadi scenarija
- normalizacija telemetrije
- WebSocket connect, disconnect i broadcast
- frontend number/date/asset helperi
- frontend sparkline LOD i timestamp mapiranje
- osnovni frontend health/risk invarianti

## Što još nije unit testirano

- `sensorStore` i realtime spajanje REST/WebSocket podataka
- `gridApi` response mapiranje, timeouti i error handling
- alarm register i alarm center composableovi
- forecast, scenario i station-history composableovi
- Vue komponente, map layers i njihove transformacije podataka
- router i i18n ponašanje
- FastAPI endpointi i response ugovori u `main.py`
- CrateDB query parametri, rezultati i failure grane
- alarm reconcile/transition tokovi s bazom
- MQTT connect/message/publish ponašanje
- cleanup servis
- kompletan async scenario lifecycle i DB persistence

## Naredbe

Backend:

```powershell
cd backend
..\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Frontend:

```powershell
cd frontend
npm run test:unit
npm run test:unit:coverage
```

## Zaključak

Temeljna matematička i transformacijska logika ima početnu unit-test zaštitu, ali aplikacija kao cjelina još nije dovoljno pokrivena za pouzdanu regresijsku provjeru. Najveći sljedeći prioriteti su `sensorStore`, alarmni composableovi, API mapiranje i backend DB lifecycle funkcije.
