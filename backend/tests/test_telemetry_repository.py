import unittest
from datetime import datetime, timezone

from app.services.telemetry_repository import normalize_sensor_payload


class TelemetryRepositoryTests(unittest.TestCase):
    def test_normalizes_complete_payload(self):
        payload = {
            "timestamp": "2026-09-29 10:30:00",
            "station_id": "TS-0042",
            "station_name": "Station 42",
            "location": "(16.4,46.3)",
            "electrical": {"voltage_kv": 10.2},
            "thermal": {"oil_temp_c": 62},
            "oil_gas": {"hydrogen_ppm": 4},
            "alarms": {"overload": False},
        }

        normalized = normalize_sensor_payload(payload)

        self.assertIsInstance(normalized["timestamp"], datetime)
        self.assertEqual(normalized["station_id"], "TS-0042")
        self.assertEqual(normalized["electrical"]["voltage_kv"], 10.2)

    def test_fills_optional_objects(self):
        normalized = normalize_sensor_payload({"station_id": "TS-0001"})

        self.assertEqual(normalized["station_name"], "TS-0001")
        self.assertEqual(normalized["thermal"], {})
        self.assertEqual(normalized["alarms"], {})

    def test_rejects_payload_without_station_id(self):
        with self.assertRaisesRegex(ValueError, "station_id"):
            normalize_sensor_payload({"electrical": {}})

    def test_rejects_non_object_payload(self):
        with self.assertRaisesRegex(ValueError, "object"):
            normalize_sensor_payload([])

    def test_iso_timestamp_is_normalized_to_an_aware_datetime(self):
        normalized = normalize_sensor_payload({
            "station_id": "TS-0001",
            "timestamp": "2026-09-30T12:30:00Z",
        })

        self.assertEqual(normalized["timestamp"].tzinfo, timezone.utc)
        self.assertEqual(normalized["timestamp"].isoformat(), "2026-09-30T12:30:00+00:00")

    def test_non_object_sensor_groups_are_replaced_with_empty_objects(self):
        normalized = normalize_sensor_payload({
            "station_id": "TS-0001",
            "electrical": [],
            "thermal": "invalid",
            "oil_gas": None,
            "alarms": False,
        })

        self.assertEqual(normalized["electrical"], {})
        self.assertEqual(normalized["thermal"], {})
        self.assertEqual(normalized["oil_gas"], {})
        self.assertEqual(normalized["alarms"], {})


if __name__ == "__main__":
    unittest.main()
