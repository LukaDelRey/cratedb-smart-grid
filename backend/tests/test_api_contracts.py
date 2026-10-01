"""Exercise FastAPI through ASGI without starting lifespan or external services."""
import asyncio
import json
import unittest
import test_bootstrap
from unittest.mock import AsyncMock, MagicMock, patch
from app import main


async def request(path, method='GET', body=None, query=''):
    messages = []
    received = False
    async def receive():
        nonlocal received
        if not received:
            received = True
            return {'type':'http.request', 'body':json.dumps(body).encode() if body is not None else b'', 'more_body':False}
        await asyncio.Future()
    async def send(message): messages.append(message)
    scope = dict(type='http', asgi={'version':'3.0'}, http_version='1.1', method=method,
                 scheme='http', path=path, raw_path=path.encode(), query_string=query.encode(),
                 root_path='', headers=[(b'content-type',b'application/json')], server=('test',80), client=('test',1))
    await main.app(scope, receive, send)
    status = next(m['status'] for m in messages if m['type']=='http.response.start')
    content = b''.join(m.get('body',b'') for m in messages if m['type']=='http.response.body')
    return status, json.loads(content)


class ApiContracts(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.station = {'station_id':'TS-1','station_name':'Station 1','location':'(16.4,46.4)',
                        'electrical':{'voltage_kv':10,'current_a':300,'active_power_kw':1800,'frequency_hz':50},
                        'thermal':{'oil_temp_c':60},'oil_gas':{},'alarms':{}}
        patcher = patch.object(main,'fetch_latest_station_states',return_value=[self.station])
        patcher.start()
        self.addCleanup(patcher.stop)
        # Fail immediately if a new test accidentally crosses an external boundary.
        for target in ['app.main.get_connection', 'crate.client.connect']:
            p = patch(target, side_effect=AssertionError('External DB access prohibited in unit tests'))
            p.start()
            self.addCleanup(p.stop)

    async def test_liveness(self):
        self.assertEqual(await request('/health'), (200, {'status':'healthy'}))

    async def test_latest_and_summary_share_station_scope(self):
        status, latest = await request('/latest-stations')
        self.assertEqual(status, 200)
        self.assertEqual(latest['data'][0]['station_id'], 'TS-1')
        status, summary = await request('/grid/summary')
        self.assertEqual(summary['stations'], len(latest['data']))
        self.assertEqual(summary['activeAlarms'], 0)

    async def test_history_forwards_filters(self):
        with patch.object(main,'station_history',return_value=[{'timestamp':1}]) as history:
            status, body = await request('/api/stations/TS-1/history', query='hours=48&limit=20')
            history.assert_called_once_with('TS-1',hours=48,limit=20)
        self.assertEqual((status,body['stationId'],body['hours']), (200,'TS-1',48))

    async def test_history_dependency_failure_returns_503(self):
        with patch.object(main,'station_history',side_effect=RuntimeError('offline')):
            status, body = await request('/api/stations/TS-1/history')
        self.assertEqual(status,503)
        self.assertIn('unavailable',body['detail'])

    async def test_invalid_query_returns_422(self):
        status, _ = await request('/api/stations/TS-1/history',query='hours=invalid')
        self.assertEqual(status,422)

    async def test_alarm_query_contract(self):
        with patch.object(main,'list_alarms',return_value=[]) as listing:
            self.assertEqual(await request('/api/alarms', query='status=ACTIVE,ACK&severity=CRITICAL&station_id=TS-1&limit=10'), (200,{'data':[]}))
            listing.assert_called_once_with(statuses=['ACTIVE','ACK'], severity='CRITICAL',station_id='TS-1',limit=10)

    async def test_alarm_action_success_actor_and_note(self):
        for route, target in [('acknowledge','ACK'),('work-order','WORK_ORDER'),('resolve','RESOLVED')]:
            with self.subTest(route=route), patch.object(main,'transition_alarm',return_value={'id':'a','status':target}) as transition:
                status, body = await request('/api/alarms/a/'+route,'POST',{'actor':'dispatcher','note':'checked'})
                self.assertEqual(status,200)
                self.assertEqual(body['status'],target)
                transition.assert_called_once_with('a',target,'dispatcher','checked')

    async def test_alarm_actions_missing_conflict_and_invalid_body(self):
        for route in ['acknowledge','work-order','resolve']:
            for result, expected in [(None,404),(ValueError('invalid transition'),409)]:
                with self.subTest(route=route,expected=expected), patch.object(main,'transition_alarm',**({'side_effect':result} if isinstance(result,Exception) else {'return_value':result})):
                    status, _ = await request('/api/alarms/missing/'+route,'POST',{})
                    self.assertEqual(status,expected)
            status, _ = await request('/api/alarms/a/'+route,'POST',{'actor':[]})
            self.assertEqual(status,422)

    async def test_scenario_validation_status_mapping(self):
        for error, expected in [(ValueError('unknown type'),400),(RuntimeError('no telemetry'),409)]:
            with patch.object(main,'start_scenario',new=AsyncMock(side_effect=error)):
                status, _ = await request('/api/scenarios/run','POST',{'scenario_type':'bad'})
                self.assertEqual(status,expected)
        status, _ = await request('/api/scenarios/run','POST',{})
        self.assertEqual(status,422)

    async def test_scenario_success_forwards_request(self):
        with patch.object(main,'start_scenario',new=AsyncMock(return_value={'id':'s','status':'RUNNING'})) as start:
            status, body = await request('/api/scenarios/run','POST',{'scenario_type':'overload','station_id':'TS-1','duration_seconds':20})
            self.assertEqual((status,body['status']), (200,'RUNNING'))
            self.assertEqual(start.call_args.kwargs['station_id'],'TS-1')

    async def test_stop_missing_scenario(self):
        with patch.object(main,'stop_scenario',new=AsyncMock(return_value=None)):
            status, _ = await request('/api/scenarios/missing/stop','POST')
            self.assertEqual(status,404)

    async def test_unknown_asset_never_returns_another_station(self):
        for path in ['/digital-twin/transformer/missing','/ai/stations/missing','/n-1/missing']:
            with self.subTest(path=path):
                status, _ = await request(path)
                self.assertEqual(status,404)

    async def test_digital_twin_identity_and_forecast_contract(self):
        status, body = await request('/digital-twin/substation/TS-1')
        self.assertEqual((status,body['assetId'],body['name']), (200,'TS-1','Station 1'))
        self.assertEqual(len(body['forecast']),8)
        self.assertIn('prediction',body)

    async def test_analytics_routes_have_expected_envelopes(self):
        for path, key in [('/grid/forecast','points'),('/ai/insights','insights'),('/regions','regions'),
                          ('/weather/grid-impact','temperatureC'),('/alarm-correlations','correlations'),('/blackout','probability')]:
            with self.subTest(path=path):
                status, body = await request(path)
                self.assertEqual(status,200)
                self.assertIn(key,body)

    async def test_database_health_failure_is_explicit(self):
        with patch.object(main,'is_mqtt_connected',return_value=False):
            status, body = await request('/api/health/cratedb')
        self.assertEqual(status,200)
        self.assertFalse(body['connected'])
        self.assertEqual(body['telemetryPersistence'],'unavailable')
