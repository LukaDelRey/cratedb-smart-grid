import test_bootstrap
import unittest
from unittest.mock import MagicMock, patch
from app import main, config
from app.db import init_db as schema


class CacheAndSchema(unittest.TestCase):
    def setUp(self):
        for name, value in [('_latest_station_cache',[]),('_latest_station_cache_at',0),
                            ('_power_line_cache',[]),('_power_line_cache_key',())]:
            p=patch.object(main,name,value)
            p.start(); self.addCleanup(p.stop)

    def test_latest_query_deduplicates_station_and_keeps_newest(self):
        cursor=MagicMock()
        cursor.description=[('station_id',),('timestamp',)]
        cursor.fetchall.return_value=[('TS-1',3),('TS-2',2),('TS-1',1),(None,0)]
        with patch.object(main,'get_connection') as connect:
            connect.return_value.cursor.return_value=cursor
            self.assertEqual(main.fetch_latest_station_states(),[{'station_id':'TS-1','timestamp':3},{'station_id':'TS-2','timestamp':2}])
            main.fetch_latest_station_states()
            connect.assert_called_once()

    def test_force_refresh_bypasses_cache(self):
        main._latest_station_cache=[{'station_id':'TS-1'}]
        with patch.object(main,'monotonic',return_value=1), patch.object(main,'get_connection') as connect:
            cursor=connect.return_value.cursor.return_value
            cursor.description=[('station_id',)]
            cursor.fetchall.return_value=[('TS-2',)]
            main.fetch_latest_station_states(force_refresh=True)
            connect.assert_called_once()
            self.assertEqual(main._latest_station_cache,[{'station_id':'TS-2'}])

    def test_database_outage_keeps_cached_rows(self):
        main._latest_station_cache=[{'station_id':'TS-1'}]
        with patch.object(main,'get_connection',side_effect=RuntimeError('offline')):
            self.assertEqual(main.fetch_latest_station_states(force_refresh=True),[{'station_id':'TS-1'}])

    def test_live_cache_update_replaces_same_station_without_duplicate(self):
        main._latest_station_cache=[{'station_id':'TS-1','timestamp':1}]
        main.cache_latest_station_payload({'station_id':'TS-1','timestamp':2})
        self.assertEqual(main._latest_station_cache,[{'station_id':'TS-1','timestamp':2}])

    def test_live_cache_ignores_missing_id(self):
        main._latest_station_cache=[{'station_id':'TS-1'}]
        main.cache_latest_station_payload({})
        self.assertEqual(len(main._latest_station_cache),1)

    def test_powerline_cache_invalidates_when_station_moves(self):
        first=[{'station_id':'TS-1','location':'(16,46)'}]
        second=[{'station_id':'TS-1','location':'(17,47)'}]
        with patch.object(main,'generate_power_lines',side_effect=[[{'id':'line-old'}],[{'id':'line-new'}]]) as generate:
            main.current_power_lines(first)
            self.assertEqual(main.current_power_lines(second),[{'id':'line-new'}])
            self.assertEqual(generate.call_count,2)

    def test_cors_splits_and_trims_configured_origins(self):
        with patch.dict('os.environ',{'CORS_ORIGINS':' https://one.test, ,https://two.test '}):
            self.assertEqual(config.cors_origins(),['https://one.test','https://two.test'])

    def test_powerline_cache_reuses_unchanged_coordinates(self):
        stations=[{'station_id':'TS-1','location':'(16,46)'}]
        with patch.object(main,'generate_power_lines',return_value=[{'id':'line'}]) as generate:
            main.current_power_lines(stations)
            main.current_power_lines(stations)
            generate.assert_called_once()

    def test_powerline_cache_invalidates_numeric_coordinates(self):
        with patch.object(main,'generate_power_lines',side_effect=[[{'id':'old'}],[{'id':'new'}]]):
            main.current_power_lines([{'id':'TS-1','lat':46,'lon':16}])
            self.assertEqual(main.current_power_lines([{'id':'TS-1','lat':47,'lon':16}]),[{'id':'new'}])

    def test_schema_initialization_is_idempotent_ddl(self):
        with patch.object(schema,'wait_for_cratedb') as connection:
            cursor=connection.return_value.cursor.return_value
            schema.init_db()
        sql=[call.args[0] for call in cursor.execute.call_args_list]
        self.assertTrue(any('trafostanice_sensors' in query for query in sql))
        self.assertTrue(any('alarm_events' in query for query in sql))
        self.assertTrue(any('alarm_audit' in query for query in sql))
        self.assertTrue(any('scenario_runs' in query for query in sql))
        self.assertFalse(any('DROP TABLE' in query.upper() for query in sql))

    def test_schema_connection_retry(self):
        with patch.object(schema.client,'connect',side_effect=[RuntimeError('offline'),MagicMock()]) as connect, patch.object(schema.time,'sleep') as sleep:
            schema.wait_for_cratedb()
        self.assertEqual(connect.call_count,2)
        sleep.assert_called_once_with(5)
