import asyncio
import unittest
from unittest.mock import patch

from app.services.region_scope import (
    EU_COUNTRIES,
    boundaries,
    in_ring,
    point_in_country,
    request_country,
    scope_stations,
    station_point,
)


class RegionScopeTests(unittest.TestCase):
    def test_cross_border_custom_scope_includes_both_counties_only(self):
        import json
        from pathlib import Path
        from app.services.region_scope import (
            register_custom_scope,
            get_custom_scope,
            request_custom_scope,
        )

        path = (
            Path(__file__).resolve().parents[2]
            / "frontend/public/regions/test-medimurje-zala.geojson"
        )
        data = json.loads(path.read_text(encoding="utf-8"))
        scope = get_custom_scope(register_custom_scope(data))
        stations = [
            {"station_id": "cakovec", "location": "(16.4339,46.3844)"},
            {"station_id": "zala", "location": "(16.8439,46.8417)"},
            {"station_id": "zagreb", "location": "(15.9819,45.815)"},
            {"station_id": "vienna", "location": "(16.3738,48.2082)"},
        ]
        token = request_custom_scope.set(scope)
        country_token = request_country.set("custom:test")
        try:
            self.assertEqual(
                [s["station_id"] for s in scope_stations(stations)], ["cakovec", "zala"]
            )
        finally:
            request_custom_scope.reset(token)
            request_country.reset(country_token)
        self.assertEqual(scope_stations(stations), stations)

    def test_custom_scope_validation_and_content_addressing(self):
        from app.services.region_scope import register_custom_scope

        feature = {
            "type": "Feature",
            "properties": {"id": "test", "name": "Test"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[15, 45], [17, 45], [17, 47], [15, 47], [15, 45]]],
            },
        }
        data = {"type": "FeatureCollection", "features": [feature]}
        self.assertEqual(register_custom_scope(data), register_custom_scope(data))
        for invalid in [
            None,
            {},
            {"type": "FeatureCollection", "features": []},
            {"type": "FeatureCollection", "features": [feature, feature]},
        ]:
            with self.assertRaises((ValueError, TypeError)):
                register_custom_scope(invalid)
        feature["geometry"]["coordinates"][0][-1] = [16, 45]
        with self.assertRaises(ValueError):
            register_custom_scope(data)

    def test_custom_region_endpoint_counts_cross_border_members(self):
        from app.main import get_regions
        from app.services.region_scope import (
            register_custom_scope,
            get_custom_scope,
            request_custom_scope,
        )

        data = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"id": "test", "name": "Cross border"},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [
                            [[15, 45], [17, 45], [17, 47], [15, 47], [15, 45]]
                        ],
                    },
                }
            ],
        }
        scope = get_custom_scope(register_custom_scope(data))
        token = request_custom_scope.set(scope)
        country_token = request_country.set("custom:test")
        try:
            with patch(
                "app.main.fetch_latest_station_states",
                return_value=[
                    {
                        "station_id": "test",
                        "location": "(16,46)",
                        "active_alarms": [{"severity": "WARNING"}],
                    }
                ],
            ):
                result = get_regions()["regions"]
            self.assertEqual(result[0]["name"], "Cross border")
            self.assertEqual(result[0]["stations"], 1)
            self.assertEqual(result[0]["activeAlarms"], 1)
        finally:
            request_custom_scope.reset(token)
            request_country.reset(country_token)

    def test_custom_scope_header_applies_and_resets_request_context(self):
        from starlette.requests import Request
        from starlette.responses import JSONResponse
        from app.main import country_scope_middleware
        from app.services.region_scope import (
            register_custom_scope,
            request_custom_scope,
        )

        data = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"id": "test", "name": "Test"},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [
                            [[15, 45], [17, 45], [17, 47], [15, 47], [15, 45]]
                        ],
                    },
                }
            ],
        }
        scope_id = register_custom_scope(data)

        async def endpoint(request):
            self.assertIsNotNone(request_custom_scope.get())
            self.assertTrue(request_country.get().startswith("custom:"))
            return JSONResponse(
                {
                    "count": len(
                        scope_stations(
                            [{"location": "(16,46)"}, {"location": "(12,48)"}]
                        )
                    )
                }
            )

        async def run():
            response = await country_scope_middleware(
                Request(
                    {
                        "type": "http",
                        "headers": [(b"x-system-scope", scope_id.encode())],
                    }
                ),
                endpoint,
            )
            self.assertEqual(response.body, b'{"count":1}')
            self.assertIsNone(request_custom_scope.get())
            self.assertIsNone(request_country.get())
            missing = await country_scope_middleware(
                Request({"type": "http", "headers": [(b"x-system-scope", b"missing")]}),
                endpoint,
            )
            self.assertEqual(missing.status_code, 409)

        asyncio.run(run())

    def test_all_eu_countries_and_croatian_counties_are_bundled(self):
        self.assertEqual(
            {item["properties"]["country"] for item in boundaries()}, EU_COUNTRIES
        )
        self.assertEqual(
            sum(item["properties"]["country"] == "HR" for item in boundaries()), 21
        )

    def test_country_membership_uses_real_geometry(self):
        self.assertTrue(point_in_country("HR", (15.9819, 45.815)))
        self.assertTrue(point_in_country("HR", (16.4339, 46.3844)))
        self.assertFalse(point_in_country("HR", (14.5058, 46.0569)))
        self.assertFalse(point_in_country("HR", (16.3738, 48.2082)))
        self.assertTrue(point_in_country("AT", (16.3738, 48.2082)))

    def test_invalid_locations_are_never_assigned(self):
        self.assertIsNone(station_point({}))
        self.assertIsNone(station_point({"location": "(999, 12)"}))
        self.assertIsNone(station_point({"location": {"coordinates": [None, 12]}}))

    def test_edges_belong_to_polygon(self):
        ring = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        self.assertTrue(in_ring((0, 5), ring))
        self.assertFalse(in_ring((11, 5), ring))

    def test_concurrent_country_scopes_do_not_leak(self):
        stations = [
            {"station_id": "zagreb", "location": "(15.9819,45.815)"},
            {"station_id": "vienna", "location": "(16.3738,48.2082)"},
        ]

        async def scoped(country):
            token = request_country.set(country)
            try:
                await asyncio.sleep(0)
                return [station["station_id"] for station in scope_stations(stations)]
            finally:
                request_country.reset(token)

        async def both():
            return await asyncio.gather(scoped("HR"), scoped("AT"))

        self.assertEqual(asyncio.run(both()), [["zagreb"], ["vienna"]])
        self.assertEqual(scope_stations(stations), stations)

    def test_region_endpoint_counts_alarm_conditions(self):
        from app.main import get_regions

        station = {
            "station_id": "zagreb",
            "location": "(15.9819,45.815)",
            "active_alarms": [
                {"severity": "CRITICAL"},
                {"severity": "WARNING"},
                {"severity": "WARNING"},
            ],
        }
        token = request_country.set("HR")
        try:
            with patch("app.main.fetch_latest_station_states", return_value=[station]):
                regions = get_regions()["regions"]
            zagreb = next(item for item in regions if item["name"] == "Grad Zagreb")
            self.assertEqual(zagreb["stations"], 1)
            self.assertEqual(zagreb["criticalAlarms"], 1)
            self.assertEqual(zagreb["warnings"], 2)
            self.assertEqual(sum(item["stations"] for item in regions), 1)
        finally:
            request_country.reset(token)

    def test_alarm_register_passes_country_station_ids_before_query_limit(self):
        from app.main import get_alarm_register

        token = request_country.set("HR")
        try:
            with patch(
                "app.main.fetch_latest_station_states",
                return_value=[{"station_id": "zagreb"}],
            ), patch("app.main.list_alarms", return_value=[]) as query:
                self.assertEqual(get_alarm_register(limit=10), {"data": []})
                self.assertEqual(query.call_args.kwargs["station_ids"], ["zagreb"])
                self.assertEqual(query.call_args.kwargs["limit"], 10)
        finally:
            request_country.reset(token)

    def test_forecast_history_excludes_other_country_stations(self):
        from datetime import datetime, timezone
        from app.services.load_forecast import grid_load_forecast

        hour = int(
            datetime.now(timezone.utc)
            .replace(minute=0, second=0, microsecond=0)
            .timestamp()
            * 1000
        )
        rows = []
        for index in range(1, 49):
            bucket = hour - index * 3600000
            rows.extend(
                [
                    (bucket, "zagreb", 1000, hour - 48 * 3600000, hour),
                    (bucket, "vienna", 999000, hour - 48 * 3600000, hour),
                ]
            )
        station = {"station_id": "zagreb", "electrical": {"active_power_kw": 1000}}
        with patch("app.services.load_forecast.load_history", return_value=rows):
            forecast = grid_load_forecast([station], hours=12)
        self.assertTrue(forecast["available"])
        self.assertTrue(all(point["loadMW"] == 1 for point in forecast["points"]))


if __name__ == "__main__":
    unittest.main()
