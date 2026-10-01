import unittest

from app.services.asset_intelligence import classify_operating_state, station_prediction
from app.services.grid_physics import simulate_grid_physics
from app.services.scenario_engine import _fault_payload, _restored_payload


def station(station_id="TS-0001"):
    return {
        "station_id": station_id,
        "station_name": station_id,
        "location": "(16.43,46.38)",
        "electrical": {
            "voltage_kv": 10.1,
            "current_a": 300,
            "frequency_hz": 50,
            "active_power_kw": 1800,
            "harmonics_thd": 2.2,
        },
        "thermal": {
            "oil_temp_c": 62,
            "winding_temp_c": 73,
            "ambient_temp_c": 22,
        },
        "oil_gas": {
            "hydrogen_ppm": 7,
            "methane_ppm": 2,
            "acetylene_ppm": 1,
        },
        "alarms": {},
    }


class AssetIntelligenceTests(unittest.TestCase):
    def test_prediction_contains_training_features(self):
        prediction = station_prediction(station())
        self.assertEqual(prediction["operatingState"], "NORMAL")
        self.assertGreater(prediction["remainingLifeDays"], 0)
        self.assertIn("gasIndex", prediction["features"])

    def test_trip_is_failure_state(self):
        sample = station()
        sample["alarms"]["transformer_trip"] = True
        self.assertEqual(classify_operating_state(sample), "FAILURE")

    def test_scenario_restore_preserves_original_alarm_state(self):
        sample = station()
        sample["alarms"]["overload"] = True
        fault = _fault_payload(sample, "cooling_failure", 0)
        restored = _restored_payload(sample, "cooling_failure", 0)
        self.assertTrue(fault["alarms"]["cooling_failure"])
        self.assertTrue(restored["alarms"]["overload"])
        self.assertNotIn("cooling_failure", restored["alarms"])

    def test_physics_propagates_failed_node(self):
        stations = [station("TS-0001"), station("TS-0002"), station("TS-0003")]
        lines = [
            {"line_id": "L1", "from_station": "TS-0001", "to_station": "TS-0002"},
            {"line_id": "L2", "from_station": "TS-0002", "to_station": "TS-0003"},
        ]
        result = simulate_grid_physics(stations, lines, failed_asset_id="TS-0001")
        depths = {node["id"]: node["cascadeDepth"] for node in result["nodes"]}
        self.assertEqual(depths["TS-0001"], 0)
        self.assertEqual(depths["TS-0002"], 1)
        self.assertEqual(depths["TS-0003"], 2)


if __name__ == "__main__":
    unittest.main()
