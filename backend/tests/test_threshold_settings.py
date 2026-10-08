import unittest
from unittest.mock import MagicMock, patch
from app.services import threshold_settings as settings


class ThresholdSettingsTests(unittest.TestCase):
    def tearDown(self):
        settings._values.clear()
        settings._values.update(settings.DEFAULTS)

    def test_forecast_order_and_miscellaneous_ranges(self):
        self.assertEqual(settings.validate(settings.DEFAULTS), settings.DEFAULTS)
        for changes in [
            {"forecast_load_warning": 95},
            {"forecast_load_warning": 96},
            {"forecast_load_critical": 101},
            {"compact_pin_zoom": -1},
            {"compact_pin_zoom": 23},
        ]:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                settings.validate({**settings.DEFAULTS, **changes})

    @patch.object(settings.client, "connect")
    def test_old_saved_settings_receive_new_defaults(self, connect):
        connection = MagicMock()
        connect.return_value = connection
        connection.cursor.return_value.fetchone.return_value = ('{"overload": 550}',)
        snapshot = settings.load_settings()
        self.assertEqual(snapshot["values"]["overload"], 550)
        self.assertEqual(snapshot["values"]["compact_pin_zoom"], 11)
        self.assertEqual(snapshot["values"]["forecast_load_warning"], 80)
        self.assertEqual(snapshot["values"]["forecast_load_critical"], 95)

    @patch.object(settings.client, "connect")
    def test_miscellaneous_saved_and_reset_with_all_thresholds(self, connect):
        saved = settings.save_settings({**settings.DEFAULTS, "compact_pin_zoom": 12.5, "forecast_load_warning": 60})
        self.assertEqual(saved["values"]["compact_pin_zoom"], 12.5)
        self.assertEqual(settings.threshold("forecast_load_warning"), 60)
        reset = settings.save_settings(settings.DEFAULTS)
        self.assertEqual(reset["values"], settings.DEFAULTS)


if __name__ == "__main__":
    unittest.main()
