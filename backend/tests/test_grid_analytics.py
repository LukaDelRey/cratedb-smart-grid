import unittest

from app.services.grid_analytics import (
    calculate_station_health,
    calculate_station_risk,
    nominal_voltage_kv,
    voltage_health_penalty,
)


def station(voltage=10.1, current=280, oil_temp=58, alarms=None):
    return {
        "electrical": {
            "voltage_kv": voltage,
            "current_a": current,
            "active_power_kw": 2200,
            "harmonics_thd": 2.1,
        },
        "thermal": {"oil_temp_c": oil_temp},
        "alarms": alarms or {},
    }


class GridAnalyticsTests(unittest.TestCase):
    def test_nominal_voltage_supports_distribution_and_transmission_levels(self):
        self.assertEqual(nominal_voltage_kv(10.2), 10)
        self.assertEqual(nominal_voltage_kv(108.5), 110)
        self.assertEqual(nominal_voltage_kv(397), 400)

    def test_normal_distribution_voltage_has_no_penalty(self):
        self.assertEqual(voltage_health_penalty(10.2), 0)
        self.assertGreater(voltage_health_penalty(8.0), 0)

    def test_faults_reduce_health_and_raise_risk(self):
        healthy = station()
        faulted = station(
            voltage=8.0,
            current=650,
            oil_temp=112,
            alarms={"overload": True, "overheating": True, "voltage_drop": True},
        )

        self.assertGreater(calculate_station_health(healthy), calculate_station_health(faulted))
        self.assertLess(calculate_station_risk(healthy), calculate_station_risk(faulted))

    def test_offline_station_scores_are_bounded(self):
        offline = station(voltage=0, current=0, alarms={"offline": True})
        self.assertGreaterEqual(calculate_station_health(offline), 0)
        self.assertLessEqual(calculate_station_risk(offline), 100)


if __name__ == "__main__":
    unittest.main()
