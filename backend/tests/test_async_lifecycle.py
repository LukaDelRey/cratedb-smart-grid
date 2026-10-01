import test_bootstrap
import asyncio
from datetime import datetime, timezone
import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from app import main
from app.services import scenario_engine as scenarios
from app.services import alarm_repository as alarms
from test_complete_api import station

class AsyncLifecycle(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        for name in ['_runs','_tasks']:
            p=patch.object(scenarios,name,{});p.start();self.addCleanup(p.stop)

    async def test_shutdown_immediately_after_start_persists_stopped_state(self):
        with patch.object(scenarios,'_insert_run'),patch.object(scenarios,'_update_run') as update,patch.object(scenarios,'publish_sensor_payload'):
            result=await scenarios.start_scenario('overload',[station()])
            await scenarios.stop_all_scenarios()
        self.assertEqual(scenarios._runs[result['id']]['status'],'STOPPED')
        self.assertFalse(scenarios._tasks)
        self.assertTrue(update.called)

    async def test_scenario_start_persists_then_emits_and_stop_restores(self):
        published=asyncio.Event();payloads=[]
        def publish(payload):payloads.append(payload);published.set()
        with patch.object(scenarios,'_insert_run') as insert,patch.object(scenarios,'_update_run') as update,patch.object(scenarios,'publish_sensor_payload',side_effect=publish):
            result=await scenarios.start_scenario('overload',[station()],duration_seconds=10)
            await asyncio.wait_for(published.wait(),1)
            stopped=await scenarios.stop_scenario(result['id'])
        self.assertEqual(result['status'],'RUNNING');self.assertEqual(stopped['status'],'STOPPED')
        self.assertNotIn('baselines',result);insert.assert_called_once();update.assert_called_once()
        self.assertTrue(payloads[0]['alarms']['overload'])
        self.assertFalse(payloads[-1]['alarms'].get('overload',False))
        self.assertEqual(payloads[-1]['electrical']['current_a'],300)
        self.assertNotIn(result['id'],scenarios._tasks)

    async def test_scenario_start_selected_station_first_and_bounds(self):
        published=asyncio.Event()
        samples=[station('TS-'+str(i)) for i in range(25)]
        with patch.object(scenarios,'_insert_run'),patch.object(scenarios,'_update_run'),patch.object(scenarios,'publish_sensor_payload',side_effect=lambda payload:published.set()):
            result=await scenarios.start_scenario('blackout',samples,station_id='TS-7',duration_seconds=9999,target_count=9999)
            await asyncio.wait_for(published.wait(),1)
            await scenarios.stop_all_scenarios()
        self.assertEqual(result['target_station_ids'][0],'TS-7')
        self.assertEqual(len(result['target_station_ids']),20);self.assertEqual(result['duration_seconds'],300)

    async def test_single_asset_scenario_ignores_requested_multi_target_count(self):
        published=asyncio.Event()
        with patch.object(scenarios,'_insert_run'),patch.object(scenarios,'_update_run'),patch.object(scenarios,'publish_sensor_payload',side_effect=lambda payload:published.set()):
            result=await scenarios.start_scenario('overload',[station(),station('TS-2')],target_count=9,duration_seconds=1)
            await asyncio.wait_for(published.wait(),1);await scenarios.stop_all_scenarios()
        self.assertEqual(len(result['target_station_ids']),1);self.assertEqual(result['duration_seconds'],10)

    async def test_scenario_persistence_failure_never_registers_a_task(self):
        with patch.object(scenarios,'_insert_run',side_effect=RuntimeError('offline')):
            with self.assertRaises(RuntimeError):await scenarios.start_scenario('overload',[station()])
        self.assertEqual(scenarios._tasks,{});self.assertEqual(scenarios._runs,{})

    async def test_scenario_list_live_state_overrides_persisted_snapshot(self):
        now=datetime(2026,10,1,tzinfo=timezone.utc)
        scenarios._runs['s']={'id':'s','status':'RUNNING','started_at':now,'baselines':[station()]}
        with patch.object(scenarios,'_database_runs',return_value=[{'id':'s','status':'COMPLETED','started_at':now}]):
            result=await scenarios.list_scenario_runs(1)
        self.assertEqual(result[0]['status'],'RUNNING');self.assertNotIn('baselines',result[0])

    async def test_stop_completed_task_returns_public_state(self):
        scenarios._runs['s']={'id':'s','status':'COMPLETED','baselines':[]}
        task=asyncio.create_task(asyncio.sleep(0));await task
        scenarios._tasks['s']=task
        self.assertEqual((await scenarios.stop_scenario('s'))['status'],'COMPLETED')

    async def test_immediate_scenario_stop_does_not_escape_cancellation(self):
        with patch.object(scenarios,'_insert_run'),patch.object(scenarios,'_update_run'),patch.object(scenarios,'publish_sensor_payload'):
            result=await scenarios.start_scenario('overload',[station()])
            try:stopped=await scenarios.stop_scenario(result['id'])
            except asyncio.CancelledError:self.fail('Stopping a task before its first scheduling escapes CancelledError and leaves RUNNING state')
        self.assertEqual(stopped['status'],'STOPPED')

    async def test_lifespan_initializes_and_closes_dependencies(self):
        with patch.object(main,'init_db') as initialize,patch.object(main,'start_mqtt') as start,patch.object(main,'stop_mqtt') as stop,patch.object(main,'stop_all_scenarios',new=AsyncMock()) as stop_scenarios:
            async with main.lifespan(main.app):
                initialize.assert_called_once();start.assert_called_once()
            stop.assert_called_once();stop_scenarios.assert_awaited_once()

    async def test_bootstrap_alarm_register_processes_only_faulted_stations(self):
        with patch.object(main.asyncio,'sleep',new=AsyncMock()),patch.object(main,'fetch_latest_station_states',return_value=[station(),station('TS-2',alarms={'offline':True})]),patch.object(main,'reconcile_alarm_payload') as reconcile:
            await main.bootstrap_alarm_register()
        reconcile.assert_called_once();self.assertEqual(reconcile.call_args.args[0]['station_id'],'TS-2')

    async def test_event_pipeline_without_backend_writer_still_reconciles_and_broadcasts(self):
        queue=asyncio.Queue();await queue.put(station());delivered=asyncio.Event()
        with patch.object(main,'event_queue',queue),patch.object(main,'PERSIST_MQTT_TELEMETRY',False),patch.object(main,'insert_sensor_payload') as insert,patch.object(main,'reconcile_alarm_payload') as reconcile,patch.object(main.manager,'broadcast',new=AsyncMock(side_effect=lambda payload:delivered.set())):
            task=asyncio.create_task(main.event_loop())
            try:await asyncio.wait_for(delivered.wait(),1);await asyncio.wait_for(queue.join(),1)
            finally:task.cancel();await asyncio.gather(task,return_exceptions=True)
        insert.assert_not_called();reconcile.assert_called_once()

class AlarmAdditionalPaths(unittest.TestCase):
    def setUp(self):
        self.cursor=MagicMock()
        p=patch.object(alarms,'_connection');connection=p.start();self.addCleanup(p.stop)
        connection.return_value.cursor.return_value=self.cursor

    def test_resolve_sets_timestamp_and_audit_actor(self):
        with patch.object(alarms,'get_alarm',side_effect=[{'id':'a','status':'WORK_ORDER'}, {'id':'a','status':'RESOLVED'}]):
            alarms.transition_alarm('a','RESOLVED','dispatcher','done')
        args=self.cursor.execute.call_args_list[0].args[1]
        self.assertIsInstance(args[5],datetime)
        self.assertEqual(self.cursor.execute.call_args_list[1].args[1][2:5],('RESOLVED','dispatcher','done'))

    def test_new_work_order_has_id_and_created_timestamp(self):
        with patch.object(alarms,'get_alarm',side_effect=[{'id':'a','status':'ACTIVE'},{}]):alarms.transition_alarm('a','WORK_ORDER')
        args=self.cursor.execute.call_args_list[0].args[1]
        self.assertTrue(args[3].startswith('WO-'));self.assertIsInstance(args[4],datetime)

    def test_unsupported_transition_never_queries_database(self):
        with self.assertRaises(ValueError):alarms.transition_alarm('a','ACTIVE')
        self.cursor.execute.assert_not_called()

    def test_missing_station_reconcile_does_not_write(self):
        self.assertEqual(alarms.reconcile_alarm_payload({}),[])
        self.cursor.execute.assert_not_called()

    def test_alarm_reconcile_malformed_groups_never_crashes(self):
        with patch.object(alarms,'_open_alarms',return_value={}):
            try:result=alarms.reconcile_alarm_payload(station(electrical=['bad']))
            except (AttributeError,TypeError) as exc:self.fail(f'Malformed telemetry crashes alarm processing: {exc}')
            self.assertIsInstance(result,list)

    def test_database_scenario_run_mapping_and_bound(self):
        cursor=MagicMock();cursor.description=[('id',),('target_station_ids',),('status',)]
        cursor.fetchall.return_value=[('s','TS-1,TS-2','COMPLETED')]
        with patch.object(scenarios,'_connection') as connect:
            connect.return_value.cursor.return_value=cursor
            rows=scenarios._database_runs(9999)
        self.assertEqual(rows[0]['target_station_ids'],['TS-1','TS-2']);self.assertEqual(rows[0]['progress'],1)
        self.assertIn('LIMIT 500',cursor.execute.call_args.args[0])
