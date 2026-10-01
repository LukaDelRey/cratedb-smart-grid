# Dashboard — prikaz kartica i usklađenost alarma

Popravljeno svih pet prijavljenih dashboard problema i osvježavanje top-bar metrika.

| Područje | Promjena |
| --- | --- |
| Load Forecast | Nedostupna confidence prikazuje kratko `N/A` (engleski) ili `N/D` (hrvatski). Objašnjenje ostaje u tooltipu; postotak nije izmišljen. |
| Predictive Grid Insights | Ista kratka oznaka. Fiksiran bočni prostor od 36 px, normalna širina glavnog teksta, kompaktni redovi i scroll unutar kartice. Prazan skup ima jasno prazno stanje. |
| Aktivni alarmi / pin / popup | Jedan frontend skup flag-or-threshold pravila odgovara backend alarm engineu. Voltage drop upozorava i kada ukupni risk score ne doseže warning prag. Lista koristi isti trenutni snapshot, uključujući fallback red dok persistent zapis još nije stigao. |
| Povratak u normalno stanje | Novija normalna telemetrija odmah uklanja odgovarajući red iz aktivne liste, čak i kada posljednji DB poll još vraća stari ACTIVE/ACK zapis. Pin i već otvoren popup osvježavaju se zajedno. Povijest događaja i alarm audit ostaju sačuvani. |
| Alarm correlation | Odabir učitava incident i otvara RCA panel. Ako incident u međuvremenu nestane, prikazuje se korisna poruka umjesto neobrađene iznimke. |
| Root Cause Analysis | Glavni tekstovi imaju vlastitu visinu bez flex skupljanja. Duži pomoćni tekst ima elipsu i puni tekst u title tooltipu; lijevi stupac može se scrollati na niskoj visini. |
| Top bar / KPI | Active Alarms koristi broj trenutnih alarmnih uvjeta, uključujući ACK i WORK_ORDER dok su fizički uvjeti aktivni. Grid Status koristi aktualnu ozbiljnost stanica i blackout udio; visoki blackout rizik više nije označen kao medium. System Load koristi trenutačni zbroj snage i nominalni kapacitet od 3 MW po stanici. Sparklines top bara više ne generiraju demo povijest. |

Normalni pinovi substation i transformer sloja koriste zelenu boju, warning žutu, critical crvenu, offline sivu. Popup klik uzima aktualni asset po ID-ju umjesto moguće stare renderirane feature kopije. Otvoreni popupovi oba sloja prate daljnju telemetriju. Popup sada izričito navodi aktivne alarmne uvjete; uz aktivni warning ne tvrdi „Normal operating envelope”.

`frontend/src/services/stationAlarms.ts` središnji je frontend izvor pravila. `shared/alarm_rule_fixtures.json` sadrži 39 ugovornih slučajeva za svaki alarm flag i relevantne granice. Backend i frontend provjeravaju iste slučajeve, čime se buduće odstupanje pravila otkriva testovima.

## Kako sada radi simulator i alarm lifecycle

Locust nasumično odabire stanicu, generira normalne mjerne vrijednosti te određene fault zastavice i vrijednosti prema vjerojatnostima. Poruka sadrži cijelo novo stanje odabrane stanice. Osim eksplicitnih zastavica, alarm engine aktivira alarme i na izmjerenim pragovima, primjerice voltage drop ispod 9.2 kV.

Stanje stanice ostaje posljednje poznato stanje do sljedeće poruke za isti ID. Povratak u normalno stanje nije automatski timeout od jedne sekunde: mora stići novija telemetrija te stanice u kojoj više nema aktivnog alarma prema flagovima i pragovima. Kada stigne, backend reconcile zapisuje RESOLVED i audit; frontend odmah uklanja aktivni red. ACK ili work order sami po sebi ne znače da je fizički uvjet nestao.

Historical event stream namjerno zadržava događaje koji su se dogodili. Aktivna lista prikazuje samo trenutačne uvjete za poznate stanice. Za asset bez dostupne telemetrije ne pretpostavlja se da je alarm riješen.

## Provjere

- Backend: **167/167 prolazi**.
- Frontend: **300 prolazi, 0 ne prolazi, 1 preskočen**.
- Ukupno: **468 testova, 467 prolazi, 0 ne prolazi, 1 preskočen**.
- TypeScript `vue-tsc --noEmit -p tsconfig.app.json` prolazi.
- Produkcijski Vite build prolazi. Ostaje upozorenje za veliki Mapbox bundle.
- `git diff --check` prolazi.

Novi regresijski testovi provjeravaju stvarni WebSocket warning → recovery → ponovljeni warning, uklanjanje stale persistent reda, broj u top baru, source status pinova, već otvoren substation/transformer popup, uspješan RCA klik i nestali incident. Jedini preskok i dalje je neaktivni legacy `components/map/GridMap.vue`.

Izvršen je i pregled lokalnog dashboarda povezanog s postojećim backendom na portu 8000. Na desktop viewportu 1440×900 confidence kartice nemaju horizontalni overflow, insight redovi imaju oko 100 px umjesto cijele visine komponente, a glavni RCA tekstovi imaju jednak clientHeight i scrollHeight. Klik na stvarnu korelaciju otvorio je RCA; odabrani sensor-failure WARNING alarm otvorio je WARNING popup iste stanice. Ciljani povratak iste stanice u normalu provjeren je determinističkim testom, bez slanja lažne telemetrije u aktivne servise.

Dokazi: `test-results/backend.json`, `frontend.json`, potpuni tekstualni logovi i screenshotovi `dashboard-confidence-fixed.jpg` te `dashboard-layout-fixed.jpg`.

![Confidence kartica i dashboard](C:/Users/HiwePC8/Documents/Websites/CrateDB-project/CrateDB/test-results/dashboard-confidence-fixed.jpg)

![Insight redovi i RCA](C:/Users/HiwePC8/Documents/Websites/CrateDB-project/CrateDB/test-results/dashboard-layout-fixed.jpg)
