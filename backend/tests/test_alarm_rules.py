import unittest

from app.services.alarm_repository import ALARM_DEFINITIONS, evaluate_alarm_conditions


def payload():
    return {
        "station_id": "TS-0001",
        "electrical": {
            "voltage_kv": 10.1,
            "current_a": 320,
            "frequency_hz": 50.0,
            "harmonics_thd": 2.5,
        },
        "thermal": {
            "oil_temp_c": 65,
            "winding_temp_c": 76,
            "ambient_temp_c": 24,
        },
        "oil_gas": {
            "oil_level_percent": 88,
            "hydrogen_ppm": 8,
            "methane_ppm": 3,
            "acetylene_ppm": 1,
        },
        "alarms": {},
    }


class AlarmRuleTests(unittest.TestCase):
    def test_normal_payload_does_not_raise_dynamic_alarms(self):
        result = evaluate_alarm_conditions(payload())
        self.assertFalse(any(result.values()))

    def test_measurements_raise_alarm_without_boolean_flag(self):
        sample = payload()
        sample["electrical"]["harmonics_thd"] = 11
        sample["oil_gas"]["acetylene_ppm"] = 9
        result = evaluate_alarm_conditions(sample)
        self.assertTrue(result["harmonics_spike"])
        self.assertTrue(result["arc_discharge"])

    def test_short_circuit_requires_combined_signature(self):
        sample = payload()
        sample["electrical"]["current_a"] = 1050
        sample["electrical"]["voltage_kv"] = 3.2
        self.assertTrue(evaluate_alarm_conditions(sample)["short_circuit"])

    def test_every_declared_alarm_can_be_raised_by_explicit_flag(self):
        for alarm_type in ALARM_DEFINITIONS:
            with self.subTest(alarm_type=alarm_type):
                sample = payload()
                sample["alarms"][alarm_type] = True
                self.assertTrue(evaluate_alarm_conditions(sample)[alarm_type])

    def test_primary_threshold_boundaries(self):
        cases = [
            ("overload", "electrical", "current_a", 499.9, 500),
            ("overheating", "thermal", "oil_temp_c", 89.9, 90),
            ("overvoltage", "electrical", "voltage_kv", 10.79, 10.8),
            ("harmonics_spike", "electrical", "harmonics_thd", 4.99, 5),
            ("arc_discharge", "oil_gas", "acetylene_ppm", 3.99, 4),
        ]

        for alarm_type, group, key, safe_value, alarm_value in cases:
            with self.subTest(alarm_type=alarm_type, state="safe"):
                sample = payload()
                sample[group][key] = safe_value
                self.assertFalse(evaluate_alarm_conditions(sample)[alarm_type])
            with self.subTest(alarm_type=alarm_type, state="alarm"):
                sample = payload()
                sample[group][key] = alarm_value
                self.assertTrue(evaluate_alarm_conditions(sample)[alarm_type])

    def test_voltage_drop_ignores_zero_but_detects_positive_undervoltage(self):
        sample = payload()
        sample["electrical"]["voltage_kv"] = 0
        self.assertFalse(evaluate_alarm_conditions(sample)["voltage_drop"])

        sample["electrical"]["voltage_kv"] = 9.19
        self.assertTrue(evaluate_alarm_conditions(sample)["voltage_drop"])

        sample["electrical"]["voltage_kv"] = 9.2
        self.assertFalse(evaluate_alarm_conditions(sample)["voltage_drop"])

    def test_frequency_deviation_is_symmetric(self):
        for frequency in (49.75, 50.25):
            with self.subTest(frequency=frequency):
                sample = payload()
                sample["electrical"]["frequency_hz"] = frequency
                self.assertTrue(evaluate_alarm_conditions(sample)["frequency_instability"])


if __name__ == "__main__":
    unittest.main()
