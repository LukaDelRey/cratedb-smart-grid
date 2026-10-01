import asyncio
import json
import unittest
import test_bootstrap
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from app.services import mqtt_client as mqtt
from app.services import cleanup
from app.services import scenario_engine as scenarios
from app import main


class MqttTests(unittest.TestCase):
    def setUp(self):
        self.client = MagicMock()
        p = patch.object(mqtt,'mqtt_connection',self.client)
        p.start()
        self.addCleanup(p.stop)

    def test_publish_topic_json_and_qos(self):
        payload = {'station_id':'TS-42','electrical':{'current_a':300}}
        mqtt.publish_sensor_payload(payload)
        topic, data = self.client.publish.call_args.args
        self.assertEqual(topic,'trafostanice/TS-42/sensors')
        self.assertEqual(json.loads(data),payload)
        self.assertEqual(self.client.publish.call_args.kwargs,{'qos':1})

    def test_publish_disconnected_or_missing_id(self):
        with patch.object(mqtt,'mqtt_connection',None), self.assertRaises(RuntimeError):
            mqtt.publish_sensor_payload({'station_id':'TS-1'})
        with self.assertRaises(ValueError): mqtt.publish_sensor_payload({})
        self.client.publish.assert_not_called()

    def test_connection_status_and_stop(self):
        self.client.is_connected.return_value = False
        self.assertFalse(mqtt.is_mqtt_connected())
        self.client.is_connected.return_value = True
        self.assertTrue(mqtt.is_mqtt_connected())
        mqtt.stop_mqtt()
        mqtt.stop_mqtt()
        self.client.disconnect.assert_called_once()
        self.client.loop_stop.assert_called_once()

    def test_subscribe_only_on_successful_connection(self):
        mqtt.on_connect(self.client,None,None,0)
        self.client.subscribe.assert_called_once_with('trafostanice/+/sensors')
        self.client.reset_mock()
        mqtt.on_connect(self.client,None,None,5)
        self.client.subscribe.assert_not_called()

    def test_start_retries_then_starts_network_loop(self):
        self.client.connect.side_effect = [OSError('offline'),None]
        with patch.object(mqtt.mqtt,'Client',return_value=self.client), patch.object(mqtt.time,'sleep') as sleep:
            mqtt.start_mqtt('test-loop')
        self.assertEqual(self.client.connect.call_count,2)
        sleep.assert_called_once_with(5)
        self.client.loop_start.assert_called_once()


class AsyncInfrastructure(unittest.IsolatedAsyncioTestCase):
    async def test_mqtt_message_crosses_thread_boundary(self):
        payload = {'station_id':'TS-1'}
        submitted = []
        def submit(coro, loop):
            submitted.append(loop)
            coro.close()
        with patch.object(mqtt,'main_loop','loop'), patch.object(mqtt.asyncio,'run_coroutine_threadsafe',side_effect=submit):
            mqtt.on_message(None,None,SimpleNamespace(payload=json.dumps(payload).encode()))
        self.assertEqual(submitted,['loop'])

    async def test_malformed_mqtt_message_never_enqueues(self):
        with patch.object(mqtt.asyncio,'run_coroutine_threadsafe') as submit:
            mqtt.on_message(None,None,SimpleNamespace(payload=b'not-json'))
        submit.assert_not_called()

    async def test_cleanup_sql_and_cancellation(self):
        cursor = MagicMock()
        connection = MagicMock()
        connection.cursor.return_value=cursor
        with patch.object(cleanup.client,'connect',return_value=connection), patch.object(cleanup.asyncio,'sleep',new=AsyncMock(side_effect=asyncio.CancelledError)):
            with self.assertRaises(asyncio.CancelledError): await cleanup.cleanup_old_data()
        self.assertIn('DELETE FROM trafostanice_sensors',cursor.execute.call_args.args[0])
        self.assertIn(f"{cleanup.TELEMETRY_RETENTION_DAYS} days",cursor.execute.call_args.args[0])

    async def test_cleanup_failure_still_waits(self):
        with patch.object(cleanup.client,'connect',side_effect=RuntimeError('offline')), patch.object(cleanup.asyncio,'sleep',new=AsyncMock(side_effect=asyncio.CancelledError)) as sleep:
            with self.assertRaises(asyncio.CancelledError): await cleanup.cleanup_old_data()
        sleep.assert_awaited_once_with(3600)

    async def test_event_pipeline_continues_after_database_failures(self):
        queue = asyncio.Queue()
        payload={'station_id':'TS-1'}
        await queue.put(payload)
        delivered=asyncio.Event()
        async def broadcast(value):
            self.assertEqual(value,payload)
            delivered.set()
        with patch.object(main,'event_queue',queue), patch.object(main,'PERSIST_MQTT_TELEMETRY',True), \
             patch.object(main,'insert_sensor_payload',side_effect=RuntimeError('offline')), \
             patch.object(main,'reconcile_alarm_payload',side_effect=RuntimeError('offline')), \
             patch.object(main.manager,'broadcast',side_effect=broadcast):
            task=asyncio.create_task(main.event_loop())
            try:
                await asyncio.wait_for(delivered.wait(),1)
                await asyncio.wait_for(queue.join(),1)
            finally:
                task.cancel()
                await asyncio.gather(task,return_exceptions=True)

    async def test_scenario_validation_without_external_io(self):
        with self.assertRaises(ValueError): await scenarios.start_scenario('bad',[{}])
        with self.assertRaises(RuntimeError): await scenarios.start_scenario('overload',[])
        with self.assertRaises(ValueError):
            await scenarios.start_scenario('overload',[{'station_id':'TS-1'}],station_id='missing')

    async def test_scenario_completion_restores_baseline(self):
        run={'id':'test','scenario_type':'overload','duration_seconds':0,'baselines':[{'station_id':'TS-1','electrical':{},'thermal':{},'alarms':{}}], 'emitted_events':0}
        with patch.object(scenarios,'publish_sensor_payload') as publish, patch.object(scenarios,'_update_run') as update:
            await scenarios._execute_scenario(run)
        self.assertEqual(run['status'],'COMPLETED')
        self.assertEqual(run['progress'],1)
        self.assertEqual(publish.call_args.args[0]['station_id'],'TS-1')
        update.assert_called_once_with(run)

    async def test_scenario_publish_failure_records_failure_and_attempts_restore(self):
        run={'id':'test','scenario_type':'overload','duration_seconds':10,'baselines':[{'station_id':'TS-1','electrical':{},'thermal':{},'alarms':{}}], 'emitted_events':0}
        with patch.object(scenarios,'publish_sensor_payload',side_effect=RuntimeError('broker offline')) as publish, patch.object(scenarios,'_update_run'):
            await scenarios._execute_scenario(run)
        self.assertEqual(run['status'],'FAILED')
        self.assertEqual(run['error'],'broker offline')
        self.assertEqual(publish.call_count,2)

    async def test_stop_unknown_scenario(self):
        self.assertIsNone(await scenarios.stop_scenario('missing'))
