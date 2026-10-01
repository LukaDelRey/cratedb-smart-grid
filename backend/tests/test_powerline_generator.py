import unittest

from app.services.powerline_generator import (
    UnionFind,
    distance,
    generate_power_lines,
    get_line_status,
    normalize_station,
    parse_location,
)


class PowerlineGeneratorTests(unittest.TestCase):
    def test_parses_cratedb_location_as_lat_lon(self):
        self.assertEqual(parse_location("(16.43,46.38)"), (46.38, 16.43))
        self.assertEqual(
            normalize_station({
                "station_id": "TS-1",
                "location": "(16.43,46.38)",
            }),
            {"id": "TS-1", "lat": 46.38, "lon": 16.43},
        )

    def test_distance_and_status_boundaries(self):
        self.assertEqual(distance({"lat": 0, "lon": 0}, {"lat": 3, "lon": 4}), 5)
        self.assertEqual(get_line_status(74.9), "ONLINE")
        self.assertEqual(get_line_status(75), "WARNING")
        self.assertEqual(get_line_status(90), "CRITICAL")

    def test_union_find_rejects_cycles(self):
        groups = UnionFind(["A", "B", "C"])
        self.assertTrue(groups.union("A", "B"))
        self.assertTrue(groups.union("B", "C"))
        self.assertFalse(groups.union("A", "C"))

    def test_generated_lines_connect_all_stations_without_duplicates(self):
        stations = [
            {"id": "A", "lat": 45, "lon": 15},
            {"id": "B", "lat": 45, "lon": 16},
            {"id": "C", "lat": 46, "lon": 16},
            {"id": "D", "lat": 46, "lon": 15},
        ]
        lines = generate_power_lines(stations)
        pairs = {
            tuple(sorted((line["from_station"], line["to_station"])))
            for line in lines
        }

        self.assertGreaterEqual(len(lines), len(stations) - 1)
        self.assertEqual(len(pairs), len(lines))
        self.assertEqual({line["line_id"] for line in lines}, {
            f"LINE-{index:04}" for index in range(1, len(lines) + 1)
        })

    def test_zero_latitude_is_a_valid_coordinate(self):
        lines = generate_power_lines([
            {"id": "EQUATOR-A", "lat": 0, "lon": 10},
            {"id": "EQUATOR-B", "lat": 0, "lon": 11},
        ])

        self.assertEqual(
            len(lines),
            1,
            "Stations on latitude 0 must not be removed as if coordinates were missing",
        )

    def test_less_than_two_valid_stations_returns_no_lines(self):
        self.assertEqual(generate_power_lines([]), [])
        self.assertEqual(generate_power_lines([{"id": "A", "lat": 1, "lon": 1}]), [])


if __name__ == "__main__":
    unittest.main()
