# Popravci unit test nalaza — 1. listopada 2026.

**Posljednji status:** svih 22 dodatna nalaza popravljeno je. Završni rezultat: 423 testa, 422 prolaze, 0 ne prolazi, 1 preskočen. Aktualni izvještaj: `UNIT_TEST_22_FIXES_2026-10-01.md`.

**Naknadna provjera:** rezultat 190/190 ispod odnosi se na tadašnji skup. Prošireni audit ima 417 testova i 22 dodatna neuspjela testa; detalji su u `UNIT_TEST_FULL_REPORT_2026-10-01.md`. Prethodni regresijski testovi zadržani su.

Svih osam grešaka iz početnog audita riješeno je nakon korisnikove upute za popravke. Postojeći neuspjeli testovi zadržali su svoja očekivanja i sada prolaze.

| Nalaz | Promjena | Datoteka |
| --- | --- | --- |
| UT-01 | Nepostojeći digital twin asset vraća 404; uklonjen fallback na prvu stanicu | `backend/app/main.py` |
| UT-02 | Cache ključ topologije uključuje lokaciju i numeričke koordinate, pa pomak stanice ponovno generira vodove | `backend/app/main.py` |
| UT-03 | MQTT callback provjerava uspjeh konekcije prije subscribea i uspješne poruke | `backend/app/services/mqtt_client.py` |
| UT-04 | Verzija zahtjeva i identitet stanice sprječavaju da stari history odgovor ili greška prepišu novi state | `frontend/src/composables/useStationHistory.ts` |
| UT-05 | Promjena/uklanjanje odabrane stanice čisti prethodne history uzorke; prazan odabir resetira loading i error | `frontend/src/composables/useStationHistory.ts` |
| UT-06 | WebSocket handler obrađuje neispravan JSON, null, array i primitive bez neuhvaćene iznimke te označava degraded stanje | `frontend/src/stores/sensorStore.ts` |
| UT-07 | Postojeća CONNECTING ili OPEN WebSocket veza sprječava otvaranje duplikata | `frontend/src/stores/sensorStore.ts` |
| UT-08 | Uspoređuju se valjani timestampovi; starija telemetrija ne prepisuje noviju | `frontend/src/stores/sensorStore.ts` |

Tipu `Station` u `frontend/src/types/dashboard.ts` dodan je opcionalni `timestamp: string | number`, u skladu s postojećim API payloadima. Ako timestamp nedostaje ili je neispravan, zadržava se postojeće ponašanje prihvaćanja poruke jer se njezina starost ne može dokazati.

Dodano je šest dodatnih testova: cache reuse, promjena numeričkih koordinata, zakašnjela history greška tijekom aktualnog zahtjeva, trenutno čišćenje history uzoraka pri promjeni stanice, neobjektne WebSocket poruke i redoslijed numeric/ISO timestampova.

## Stvarno izvršene provjere

| Provjera | Ukupno | Prolazi | Fail/errors | Skipped | Trajanje |
| --- | ---: | ---: | ---: | ---: | ---: |
| Backend/API/simulator s coverageom | 109 | 109 | 0 | 0 | 0.744 s |
| Frontend s coverageom | 81 | 81 | 0 | 0 | 3.457 s |
| Ukupno | 190 | 190 | 0 | 0 | |
| Vue/TypeScript noEmit provjera | | PASS | 0 | | |
| `git diff --check` | | PASS | 0 | | |

Naredbe:

```powershell
.\run-unit-tests.ps1 -Coverage
cd frontend
node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p tsconfig.app.json
```

Aktualni dokazi su `test-results/backend.json`, `test-results/backend.txt` i `test-results/frontend.txt`. Prije završne coverage provjere također je prošao suite od 184 testa bez coveragea. Naknadna TypeScript greška zbog nedostajućeg tipa timestampa popravljena je i provjera je ponovno uspješno izvršena.

Veza sa smjernicama ostaje dokumentirana u `UNIT_TEST_REPORT_2026-10-01.md`. Popravci štite identitet digital twin asseta, aktualnost telemetrije/povijesti, geo topologiju i realtime lifecycle.

Živa CrateDB/EMQX integracija, browser E2E, vizualne regresije i production readiness nisu ovime potvrđeni. Nisu instalirani paketi niti mijenjana infrastruktura ili zatečene nepovezane izmjene.
