"""DB driver boundaries are mocked; SQL construction and lifecycle logic are real."""
import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from app.services import telemetry_repository as telemetry
from app.services import alarm_repository as alarms


class RepositoryTests(unittest.TestCase):
    def cursor(self, module, columns=(), rows=()):
        cursor = MagicMock()
        cursor.description = [(name,) for name in columns]
        cursor.fetchall.return_value = rows
        connection = MagicMock()
        connection.cursor.return_value = cursor
        patcher = patch.object(module, '_connection', return_value=connection)
        patcher.start()
        self.addCleanup(patcher.stop)
        return cursor

    def test_history_parameterizes_station_and_returns_chronological_rows(self):
        cursor = self.cursor(telemetry, ['timestamp', 'electrical'], [(2, {'current_a': 5}), (1, {})])
        result = telemetry.station_history("TS-1' OR 1=1 --", hours=9999, limit=9999)
        sql, params = cursor.execute.call_args.args
        self.assertIn('LIMIT 2000', sql)
        self.assertNotIn('OR 1=1', sql)
        self.assertEqual(params[0], "TS-1' OR 1=1 --")
        self.assertEqual([row['timestamp'] for row in result], [1, 2])

    def test_history_lower_bounds_and_empty_rows(self):
        cursor = self.cursor(telemetry)
        self.assertEqual(telemetry.station_history('TS-1', hours=-1, limit=0), [])
        self.assertIn('LIMIT 1', cursor.execute.call_args.args[0])

    def test_insert_uses_bound_objects_and_normalized_id(self):
        cursor = self.cursor(telemetry)
        row = telemetry.insert_sensor_payload({'station_id': ' TS-1 ', 'electrical': {'current_a': 10}})
        sql, params = cursor.execute.call_args.args
        self.assertEqual(sql.count('?'), 8)
        self.assertEqual(params[1], 'TS-1')
        self.assertEqual(params[4], {'current_a': 10})
        self.assertEqual(row['station_id'], 'TS-1')

    def test_invalid_insert_never_opens_connection(self):
        with patch.object(telemetry, '_connection') as connect:
            with self.assertRaises(ValueError): telemetry.insert_sensor_payload({})
            connect.assert_not_called()

    def test_recent_rows_keep_newest_first_and_limit(self):
        cursor = self.cursor(telemetry, ['timestamp'], [(2,), (1,)])
        self.assertEqual(telemetry.recent_telemetry(99999), [{'timestamp': 2}, {'timestamp': 1}])
        self.assertIn('LIMIT 5000', cursor.execute.call_args.args[0])

    def test_database_errors_propagate(self):
        cursor = self.cursor(telemetry)
        cursor.execute.side_effect = RuntimeError('offline')
        for action in [lambda: telemetry.station_history('TS-1'), telemetry.recent_telemetry,
                       lambda: telemetry.insert_sensor_payload({'station_id': 'TS-1'})]:
            with self.subTest(action=action), self.assertRaisesRegex(RuntimeError, 'offline'): action()

    def test_alarm_filters_parameterized_and_normalized(self):
        cursor = self.cursor(alarms, ['id'], [('alarm-1',)])
        result = alarms.list_alarms(['active', 'ack'], 'critical', "TS-1'", 5000)
        sql, params = cursor.execute.call_args.args
        self.assertIn('LIMIT 1000', sql)
        self.assertIn('status IN (?, ?)', sql)
        self.assertEqual(params, ('ACTIVE', 'ACK', 'CRITICAL', "TS-1'"))
        self.assertEqual(result, [{'id': 'alarm-1'}])

    def test_alarm_stats_exclude_resolved_from_open_severity_counts(self):
        self.cursor(alarms, rows=[('ACTIVE','CRITICAL',2), ('ACK','EMERGENCY',3),
                                  ('WORK_ORDER','WARNING',4), ('RESOLVED','CRITICAL',9)])
        self.assertEqual(alarms.alarm_stats(), dict(active=2, acknowledged=3, workOrders=4,
                                                   resolved=9, critical=5, warning=4))

    def test_transition_ack_records_actor_and_audit(self):
        cursor = self.cursor(alarms)
        with patch.object(alarms, 'get_alarm', side_effect=[{'id':'a', 'status':'ACTIVE'}, {'id':'a','status':'ACK'}]):
            self.assertEqual(alarms.transition_alarm('a','ack','dispatcher','checked')['status'], 'ACK')
        update = cursor.execute.call_args_list[0].args[1]
        self.assertEqual(update[0], 'ACK')
        self.assertEqual(update[2], 'dispatcher')
        audit = cursor.execute.call_args_list[1].args[1]
        self.assertEqual(audit[1:5], ('a', 'ACK', 'dispatcher', 'checked'))

    def test_idempotent_transition_does_not_write(self):
        cursor = self.cursor(alarms)
        with patch.object(alarms, 'get_alarm', return_value={'id':'a','status':'ACK'}):
            alarms.transition_alarm('a', 'ACK')
        cursor.execute.assert_not_called()

    def test_invalid_transition_does_not_write(self):
        cursor = self.cursor(alarms)
        with patch.object(alarms, 'get_alarm', return_value={'id':'a','status':'RESOLVED'}):
            with self.assertRaises(ValueError): alarms.transition_alarm('a','ACK')
        cursor.execute.assert_not_called()

    def test_unknown_alarm_returns_none(self):
        self.cursor(alarms)
        with patch.object(alarms,'get_alarm',return_value=None):
            self.assertIsNone(alarms.transition_alarm('missing','ACK'))

    def test_work_order_created_once(self):
        cursor = self.cursor(alarms)
        with patch.object(alarms, 'get_alarm', side_effect=[{'id':'a','status':'ACK','work_order_id':'WO-existing'}, {}]):
            alarms.transition_alarm('a','WORK_ORDER')
        self.assertEqual(cursor.execute.call_args_list[0].args[1][3], 'WO-existing')

    def test_reconcile_creates_alarm_and_audit(self):
        cursor = self.cursor(alarms)
        with patch.object(alarms,'_open_alarms', return_value={}):
            changed = alarms.reconcile_alarm_payload({'station_id':'TS-1','alarms':{'offline': True}})
        self.assertEqual([item['action'] for item in changed], ['CREATED'])
        self.assertEqual(cursor.execute.call_count, 2)
        self.assertIn('INSERT INTO alarm_events', cursor.execute.call_args_list[0].args[0])

    def test_reconcile_repeated_signal_updates_without_duplicate_insert(self):
        cursor = self.cursor(alarms)
        with patch.object(alarms,'_open_alarms', return_value={'offline':{'id':'a','occurrence_count':2}}):
            self.assertEqual(alarms.reconcile_alarm_payload({'station_id':'TS-1','alarms':{'offline': True}}), [])
        self.assertEqual(cursor.execute.call_count, 1)
        self.assertEqual(cursor.execute.call_args.args[1][1], 3)

    def test_reconcile_cleared_signal_resolves_and_audits(self):
        cursor = self.cursor(alarms)
        with patch.object(alarms,'_open_alarms', return_value={'offline':{'id':'a'}}):
            self.assertEqual(alarms.reconcile_alarm_payload({'station_id':'TS-1'}), [{'id':'a','action':'RESOLVED'}])
        self.assertEqual(cursor.execute.call_count, 2)

    def test_audit_scope_is_bound(self):
        cursor = self.cursor(alarms)
        self.assertEqual(alarms.list_alarm_audit("a'"), [])
        self.assertEqual(cursor.execute.call_args.args[1], ("a'",))
