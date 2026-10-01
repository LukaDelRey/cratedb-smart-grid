import test_bootstrap
from datetime import datetime, timezone
import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest.mock import MagicMock, patch
from app.services import telemetry_repository as telemetry
from shared import generate_stations as catalog
import app.config as config

class DataQuality(unittest.TestCase):
    def test_epoch_seconds_and_milliseconds_represent_the_same_instant(self):
        seconds=1790856000
        self.assertEqual(telemetry.normalize_sensor_payload({'station_id':'TS-1','timestamp':seconds})['timestamp'],
                         telemetry.normalize_sensor_payload({'station_id':'TS-1','timestamp':seconds*1000})['timestamp'])
    def test_naive_datetime_is_assumed_utc_like_naive_iso_string(self):
        sample=telemetry.normalize_sensor_payload({'station_id':'TS-1','timestamp':datetime(2026,10,1,12)})
        self.assertEqual(sample['timestamp'].tzinfo,timezone.utc)

    def test_epoch_milliseconds_are_not_silently_replaced_with_current_time(self):
        milliseconds=1790856000000
        sample=telemetry.normalize_sensor_payload({'station_id':'TS-1','timestamp':milliseconds})
        self.assertEqual(sample['timestamp'],datetime.fromtimestamp(milliseconds/1000,timezone.utc))

    def test_iso_timezone_offset_preserves_absolute_time(self):
        sample=telemetry.normalize_sensor_payload({'station_id':'TS-1','timestamp':'2026-10-01T14:00:00+02:00'})
        self.assertEqual(sample['timestamp'].astimezone(timezone.utc),datetime(2026,10,1,12,tzinfo=timezone.utc))

    def test_missing_station_values_reject_false_or_empty_ids(self):
        for value in [None,'',False]:
            with self.subTest(value=value),self.assertRaises(ValueError):telemetry.normalize_sensor_payload({'station_id':value})

    def test_station_catalog_round_trip_through_in_memory_file_boundary(self):
        class Buffer(io.StringIO):
            def close(self):pass
        buffer=Buffer()
        file=MagicMock();file.exists.return_value=True
        with patch.object(catalog,'stations_file',file),patch('builtins.open',return_value=buffer):
            catalog.save_stations([{'id':'TS-test','lat':0,'lon':0}])
            buffer.seek(0)
            self.assertEqual(catalog.load_stations(),[{'id':'TS-test','lat':0,'lon':0}])

    def test_missing_catalog_generates_only_through_mocked_file_boundary(self):
        file=MagicMock();file.exists.return_value=False
        with patch.object(catalog,'stations_file',file),patch('builtins.open',return_value=MagicMock()),patch.object(catalog,'generate_stations',return_value=[{'id':'TS-test'}]):
            self.assertEqual(catalog.load_stations(),[{'id':'TS-test'}])

    def load_config(self,environment):
        with patch.dict('os.environ',environment):
            spec=importlib.util.spec_from_file_location('test_isolated_config',config.__file__)
            module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        return module

    def test_writer_flag_accepts_explicit_true_spellings(self):
        for value in ['true','1','yes','on','TRUE']:
            with self.subTest(value=value):self.assertTrue(self.load_config({'PERSIST_MQTT_TELEMETRY':value}).PERSIST_MQTT_TELEMETRY)

    def test_writer_flag_remains_off_for_false_values(self):
        for value in ['false','0','off','']:
            with self.subTest(value=value):self.assertFalse(self.load_config({'PERSIST_MQTT_TELEMETRY':value}).PERSIST_MQTT_TELEMETRY)

    def test_retention_is_at_least_one_day_and_ports_read_from_environment(self):
        module=self.load_config({'TELEMETRY_RETENTION_DAYS':'-4','MQTT_PORT':'1884'})
        self.assertEqual(module.TELEMETRY_RETENTION_DAYS,1);self.assertEqual(module.MQTT_PORT,1884)

    def test_duplicate_simulator_generator_writes_expected_fixture_only(self):
        source=Path(__file__).resolve().parents[2]/'locust-simulator/generate_stations.py'
        mocked_file=MagicMock()
        # This legacy script writes on import; redirect that file boundary, never the real station catalog.
        with patch('builtins.open',return_value=mocked_file),patch('random.uniform',return_value=0):
            spec=importlib.util.spec_from_file_location('test_legacy_generator',source)
            module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        self.assertEqual(len(module.stations),1000)
        self.assertEqual(len({s['id'] for s in module.stations}),1000)
        self.assertEqual(module.stations[0]['lat'],module.CENTER_LAT)
