# Bundled EU region boundaries

`eu-adm1.geojson` contains simplified geoBoundaries **gbOpen ADM1** snapshots for the 27 EU member states (458 features). Croatia contains 20 counties plus the City of Zagreb. Croatian display names have been localized; geometry and region identifiers come from the source snapshots.

Source: [geoBoundaries](https://www.geoboundaries.org/) and its [API documentation](https://www.geoboundaries.org/api.html). Original per-country sources, reference years, licenses, attribution and pinned download URLs are retained in `sources.json`. OSM-derived boundaries include © OpenStreetMap contributors; see [OpenStreetMap copyright](https://www.openstreetmap.org/copyright). Keep the map attribution and source metadata when redistributing this data.

ADM1 is the source's geographic hierarchy. Administrative granularity, reference years and territorial coverage differ between countries; this is not a promise of the latest legal administrative divisions. Simplified coastlines and borders are suitable for dashboard overview, not cadastral or precision boundary decisions. Assets without valid coordinates are excluded rather than assigned to a fabricated default location.

Refresh the snapshot explicitly from the repository root with:

```sh
node tools/download-region-boundaries.mjs
```

Review changed boundaries and metadata before deploying. Runtime requests use these bundled files and do not call geoBoundaries. The backend reads the same GeoJSON file, so include `frontend/public/regions` in backend deployments (the existing Dockerfile already copies it).

## Custom regions

Settings → Regions accepts a WGS84 GeoJSON `FeatureCollection` containing `Polygon` or `MultiPolygon` features with a nonempty `properties.name`. Rings must be closed and coordinates ordered `[longitude, latitude]`. Limits: 2 MiB, 200 regions, 100,000 vertices. Invalid structure, unsupported geometry, duplicate IDs and out-of-range coordinates are rejected. Complex topology is not automatically repaired; validate shapes in a GIS tool before import.

Imports are previewed and named before saving. Each import becomes an independent geographic configuration alongside EU countries in the System region dropdown. Configurations can cross country borders and can be renamed, exported or deleted in Settings → Regions. Source country boundaries remain available. Overlapping features count independently in regional summaries; system totals count each station once. Configuration names, geometry and the selected configuration persist in this browser. Older per-country imports migrate into separate saved configurations.

`test-medimurje-zala.geojson` is a ready-to-import test configuration combining Međimurska županija (Croatia) and Zala (Hungary) as one MultiPolygon feature. Its geometry comes from the same bundled geoBoundaries snapshots, with source attribution in the file. The counties are adjacent across the Mura border. The file is about 14 KB and includes Čakovec and Zalaegerszeg while excluding Zagreb and Vienna.

## Geographic scope

For country selections, API requests send `X-System-Country`. For custom configurations, the frontend registers validated GeoJSON through `POST /api/region-scopes` and sends the returned content-addressed ID in `X-System-Scope`. The backend caches up to 64 configurations and applies their geometry to request-local station selection and all derived aggregates, forecasts and alarms. If the server restarts or a cached scope is evicted, the frontend registers it again automatically. Geometry is stored durably in the browser; backend registration is an ephemeral lookup cache, not an account-level shared setting. Ingestion and global telemetry caching remain independent of viewer selection. Clients without a scope header retain unscoped API behavior. This is a data-selection preference, not an authorization boundary.

## Verification

```sh
node --experimental-strip-types --test frontend/tests/regionGeometry.test.mjs
PYTHONPATH=backend python -m unittest discover -s backend/tests -v
cd frontend && npm run build
```
