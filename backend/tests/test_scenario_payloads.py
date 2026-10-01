import unittest

from app.services.scenario_engine import _fault_payload, _restored_payload, scenario_definitions


def station():
    return {
        "station_id": "TS-0001",
        "station_name": "Station 1",
        "electrical": {
            "voltage_kv": 10.1,
            "current_a": 300,
            "active_power_kw": 1800,
            "frequency_hz": 50,
            "harmonics_thd": 2.2,
        },
        "thermal": {
            "oil_temp_c": 62,
            "winding_temp_c": 73,
            "ambient_temp_c": 22,
            "busbar_temp_c": 60,
        },
        "oil_gas": {
            "oil_level_percent": 88,
            "oil_pressure_bar": 1.5,
            "hydrogen_ppm": 7,
            "methane_ppm": 2,
            "acetylene_ppm": 1,
        },
        "alarms": {"overload": False},
    }


class ScenarioPayloadTests(unittest.TestCase):
    def test_scenario_definitions_are_unique_and_have_valid_defaults(self):
        definitions = scenario_definitions()
        scenario_types = [item["type"] for item in definitions]

        self.assertEqual(len(scenario_types), len(set(scenario_types)))
        self.assertTrue(all(item["label"] for item in definitions))
        self.assertTrue(all(10 <= item["defaultDuration"] <= 300 for item in definitions))

    def test_fault_generation_does_not_mutate_baseline(self):
        baseline = station()
        fault = _fault_payload(baseline, "overload", 0)

        self.assertEqual(baseline["electrical"]["current_a"], 300)
        self.assertFalse(baseline["alarms"]["overload"])
        self.assertGreaterEqual(fault["electrical"]["current_a"], 650)
        self.assertTrue(fault["alarms"]["overload"])

    def test_each_single_asset_scenario_emits_its_primary_failure_signature(self):
        expectations = {
            "overheating": lambda item: item["thermal"]["oil_temp_c"] >= 112,
            "voltage_drop": lambda item: item["electrical"]["voltage_kv"] <= 7.8,
            "sensor_failure": lambda item: item["alarms"]["sensor_failure"],
            "short_circuit": lambda item: item["electrical"]["current_a"] >= 1100,
            "voltage_instability": lambda item: item["alarms"]["frequency_instability"],
            "harmonics_spike": lambda item: item["electrical"]["harmonics_thd"] >= 12,
            "cooling_failure": lambda item: item["alarms"]["cooling_failure"],
            "insulation_degradation": lambda item: item["oil_gas"]["hydrogen_ppm"] >= 85,
            "oil_leak": lambda item: item["oil_gas"]["oil_level_percent"] <= 48,
            "arc_discharge": lambda item: item["oil_gas"]["acetylene_ppm"] >= 18,
            "feeder_failure": lambda item: item["electrical"]["active_power_kw"] == 0,
            "transformer_trip": lambda item: item["alarms"]["offline"],
            "offline": lambda item: item["electrical"]["voltage_kv"] == 0,
        }

        for scenario_type, assertion in expectations.items():
            with self.subTest(scenario_type=scenario_type):
                self.assertTrue(assertion(_fault_payload(station(), scenario_type, 0)))

    def test_cascade_rotates_fault_type_by_target_index(self):
        expected_alarm = ["overload", "voltage_drop", "overheating", "offline"]

        for index, alarm_name in enumerate(expected_alarm):
            with self.subTest(index=index):
                fault = _fault_payload(station(), "cascade", index)
                self.assertTrue(fault["alarms"][alarm_name])

    def test_restore_returns_an_independent_copy_of_the_baseline(self):
        baseline = station()
        restored = _restored_payload(baseline, "overload", 0)
        restored["electrical"]["current_a"] = 999

        self.assertEqual(baseline["electrical"]["current_a"], 300)
        self.assertIn("timestamp", restored)


if __name__ == "__main__":
    unittest.main()
