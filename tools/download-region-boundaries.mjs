import { mkdir, writeFile } from 'node:fs/promises';

// Open boundary snapshots are bundled; the application never calls this API.
const countries =
  'AT:AUT BE:BEL BG:BGR HR:HRV CY:CYP CZ:CZE DK:DNK EE:EST FI:FIN FR:FRA DE:DEU GR:GRC HU:HUN IE:IRL IT:ITA LV:LVA LT:LTU LU:LUX MT:MLT NL:NLD PL:POL PT:PRT RO:ROU SK:SVK SI:SVN ES:ESP SE:SWE'
    .split(' ')
    .map((pair) => pair.split(':'));
const destination = new URL('../frontend/public/regions/', import.meta.url);
await mkdir(destination, { recursive: true });
async function json(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response.json();
}
const croatianNames = {
  'Primorje-Gorski Kotar': 'Primorsko-goranska županija',
  'Dubrovnik-Neretva': 'Dubrovačko-neretvanska županija',
  Karlovac: 'Karlovačka županija',
  'Sisak-Moslavina': 'Sisačko-moslavačka županija',
  'Zadar County': 'Zadarska županija',
  'Požega-Slavonia': 'Požeško-slavonska županija',
  'Šibenik-Knin': 'Šibensko-kninska županija',
  'Brod-Posavina': 'Brodsko-posavska županija',
  'Zagreb County': 'Zagrebačka županija',
  'Koprivnica-Križevci': 'Koprivničko-križevačka županija',
  'Virovitica-Podravina': 'Virovitičko-podravska županija',
  'Krapina-Zagorje': 'Krapinsko-zagorska županija',
  'Bjelovar-Bilogora': 'Bjelovarsko-bilogorska županija',
  'Split-Dalmatia': 'Splitsko-dalmatinska županija',
  'City of Zagreb': 'Grad Zagreb',
  Varaždin: 'Varaždinska županija',
  Istria: 'Istarska županija',
  Međimurje: 'Međimurska županija',
  'Vukovar-Syrmia': 'Vukovarsko-srijemska županija',
  'Osijek-Baranja': 'Osječko-baranjska županija',
  'Lika-Senj': 'Ličko-senjska županija',
};
const metadata = [];
const features = [];
let next = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < countries.length) {
      const [code, iso3] = countries[next++];
      const info = await json(`https://www.geoboundaries.org/api/current/gbOpen/${iso3}/ADM1/`);
      const data = await json(info.simplifiedGeometryGeoJSON);
      if (data.type !== 'FeatureCollection' || !data.features.length)
        throw new Error(`Invalid ${code}`);
      for (const [index, feature] of data.features.entries()) {
        features.push({
          type: 'Feature',
          id: `${code}-${feature.properties.shapeID || index}`,
          properties: {
            id: `${code}-${feature.properties.shapeID || index}`,
            country: code,
            name:
              (code === 'HR' ? croatianNames[feature.properties.shapeName] : null) ||
              feature.properties.shapeName ||
              `${code} ${index + 1}`,
            custom: false,
          },
          geometry: feature.geometry,
        });
      }
      metadata.push({ country: code, ...info });
      console.log(`${code}: ${data.features.length} regions`);
    }
  }),
);
features.sort((a, b) => a.properties.id.localeCompare(b.properties.id));
await writeFile(
  new URL('eu-adm1.geojson', destination),
  JSON.stringify({ type: 'FeatureCollection', features }),
);
await writeFile(
  new URL('sources.json', destination),
  JSON.stringify(
    metadata.sort((a, b) => a.country.localeCompare(b.country)),
    null,
    2,
  ),
);
console.log(`Saved ${features.length} regions in ${metadata.length} countries.`);
