"""Load simulator business code; replace only Locust's external scheduling boundary."""
import test_bootstrap
import importlib.util
import json
from pathlib import Path
import types
import unittest
from unittest.mock import MagicMock, patch
from shared import generate_stations as catalog
from app.services.telemetry_repository import normalize_sensor_payload


def simulator_module():
    locust = types.ModuleType('locust')
    locust.User = object
    locust.task = lambda function: function
    locust.between = lambda low, high: None
    spec = importlib.util.spec_from_file_location('unit_simulator',Path(__file__).resolve().parents[2]/'locust-simulator/locustfile.py')
    module = importlib.util.module_from_spec(spec)
    with patch.dict('sys.modules',{'locust':locust}): spec.loader.exec_module(module)
    return module


class SimulatorContracts(unittest.TestCase):
    def setUp(self):
        self.module = simulator_module()
        self.user = self.module.TrafostanicaUser()
        self.user.mqtt_client = MagicMock()
        self.user.mqtt_client.publish.return_value.rc = 0
        for name, replacement in [('choice',lambda values:values[0]),('uniform',lambda low,high:(low+high)/2),
                                  ('randint',lambda low,high:(low+high)//2)]:
            p=patch.object(self.module.random,name,side_effect=replacement)
            p.start(); self.addCleanup(p.stop)
        p=patch.object(self.module.time,'strftime',return_value='2026-10-01 12:00:00')
        p.start(); self.addCleanup(p.stop)

    def emit(self, probability):
        with patch.object(self.module.random,'random',return_value=probability):
            self.user.send_sensor_data()
        return json.loads(self.user.mqtt_client.publish.call_args.args[1])

    def test_normal_simulator_payload_matches_ingestion_contract(self):
        payload=self.emit(1)
        normalized=normalize_sensor_payload(payload)
        self.assertEqual(normalized['station_id'],self.module.stations[0]['id'])
        self.assertFalse(any(payload['alarms'].values()))
        self.assertGreater(payload['electrical']['active_power_kw'],0)
        self.assertEqual(self.user.mqtt_client.publish.call_args.args[0],f"trafostanice/{normalized['station_id']}/sensors")

    def test_fault_payload_trip_zeroes_electrical_output(self):
        payload=self.emit(0)
        self.assertTrue(payload['alarms']['transformer_trip'])
        self.assertEqual(payload['electrical']['current_a'],0)
        self.assertEqual(payload['electrical']['active_power_kw'],0)
        self.assertEqual(payload['electrical']['voltage_kv'],0)

    def test_publish_error_is_not_silent(self):
        self.user.mqtt_client.publish.return_value.rc=5
        with self.assertRaisesRegex(RuntimeError,'code 5'): self.emit(1)

    def test_simulator_shutdown_stops_and_disconnects(self):
        self.user.on_stop()
        self.user.mqtt_client.loop_stop.assert_called_once()
        self.user.mqtt_client.disconnect.assert_called_once()

    def test_station_catalog_has_unique_ids_and_valid_geographic_coordinates(self):
        self.assertEqual(len({s['id'] for s in catalog.stations}),len(catalog.stations))
        self.assertTrue(all(-90<=s['lat']<=90 and -180<=s['lon']<=180 for s in catalog.stations))

    def test_station_generator_reproducible_with_controlled_random_boundary(self):
        with patch.object(catalog.random,'uniform',return_value=0): result=catalog.generate_stations(3)
        self.assertEqual([s['id'] for s in result],['TS-0001','TS-0002','TS-0003'])
        self.assertTrue(all(s['lat']==catalog.CENTER_LAT and s['lon']==catalog.CENTER_LON for s in result))
