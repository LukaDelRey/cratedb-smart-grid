import unittest

from app.services.blackout_prediction import calculate_blackout_probability


class BlackoutPredictionTests(unittest.TestCase):
    def test_empty_grid_has_zero_probability(self):
        self.assertEqual(calculate_blackout_probability([]), 0)

    def test_probability_reflects_fraction_of_critical_stations(self):
        stations = [
            {"thermal": {"oil_temp_c": 91}, "electrical": {"current_a": 100}},
            {"thermal": {"oil_temp_c": 40}, "electrical": {"current_a": 501}},
            {"thermal": {"oil_temp_c": 40}, "electrical": {"current_a": 100}},
        ]
        self.assertEqual(calculate_blackout_probability(stations), 66.7)

    def test_thresholds_are_strict_and_missing_groups_are_safe(self):
        stations = [
            {"thermal": {"oil_temp_c": 90}, "electrical": {"current_a": 500}},
            {},
        ]
        self.assertEqual(calculate_blackout_probability(stations), 0.0)


if __name__ == "__main__":
    unittest.main()
