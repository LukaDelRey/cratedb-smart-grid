import unittest

from app.services.grid_physics import simulate_grid_physics


def station(station_id, current=300, voltage=10, alarms=None):
    return {
        "station_id": station_id,
        "electrical": {
            "voltage_kv": voltage,
            "current_a": current,
            "active_power_kw": 1800,
            "harmonics_thd": 2,
        },
        "thermal": {"oil_temp_c": 60, "winding_temp_c": 72, "ambient_temp_c": 22},
        "oil_gas": {},
        "alarms": alarms or {},
    }


class GridPhysicsExtendedTests(unittest.TestCase):
    def test_empty_grid_returns_zeroed_summary(self):
        result = simulate_grid_physics([], [])

        self.assertEqual(result["summary"]["nodes"], 0)
        self.assertEqual(result["summary"]["lines"], 0)
        self.assertEqual(result["summary"]["cascadeRisk"], 0.0)
        self.assertEqual(result["nodes"], [])
        self.assertEqual(result["edges"], [])

    def test_accepts_frontend_line_field_names(self):
        stations = [station("A"), station("B")]
        lines = [{"id": "L1", "fromStation": "A", "toStation": "B", "capacityMW": 5}]
        result = simulate_grid_physics(stations, lines)

        self.assertEqual(result["summary"]["lines"], 1)
        self.assertEqual(result["edges"][0]["id"], "L1")
        self.assertEqual(result["edges"][0]["capacityMW"], 5.0)

    def test_offline_alarm_marks_node_failed_and_voltage_zero(self):
        result = simulate_grid_physics(
            [station("A", alarms={"offline": True}), station("B")],
            [{"from": "A", "to": "B"}],
        )
        nodes = {node["id"]: node for node in result["nodes"]}

        self.assertTrue(nodes["A"]["failed"])
        self.assertEqual(nodes["A"]["voltagePu"], 0)
        self.assertEqual(nodes["A"]["stress"], "FAILED")
        self.assertGreater(result["summary"]["cascadeRisk"], 0)

    def test_lines_with_unknown_nodes_are_ignored(self):
        result = simulate_grid_physics(
            [station("A")],
            [{"id": "invalid", "from": "A", "to": "MISSING"}],
        )
        self.assertEqual(result["summary"]["lines"], 0)


if __name__ == "__main__":
    unittest.main()
