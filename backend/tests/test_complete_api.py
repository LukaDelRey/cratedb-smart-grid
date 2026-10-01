"""All HTTP/WebSocket paths, external boundary failures and data consistency."""
import test_bootstrap
import asyncio
import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import WebSocketDisconnect
from app import main
from test_api_contracts import request

def station(id='TS-1', location='(16.4,46.4)', **changes):
    return {'station_id':id,'station_name':id,'location':location,
            'electrical':{'current_a':300,'voltage_kv':10.1,'active_power_kw':1800,'frequency_hz':50,'harmonics_thd':2},
            'thermal':{'oil_temp_c':60,'winding_temp_c':70,'ambient_temp_c':20},'oil_gas':{},'alarms':{},**changes}

class CompleteApi(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        p=patch.object(main,'fetch_latest_station_states',return_value=[station()]);p.start();self.addCleanup(p.stop)
        p=patch('crate.client.connect',side_effect=AssertionError('DB access prohibited'));p.start();self.addCleanup(p.stop)

    async def test_root_and_reference_station_catalog(self):
        self.assertEqual((await request('/'))[0],200)
        status,body=await request('/stations')
        self.assertEqual(status,200);self.assertEqual(len({s['id'] for s in body}),len(body))

    async def test_sensor_envelope_maps_database_rows(self):
        cursor=MagicMock();cursor.description=[('station_id',),('timestamp',)];cursor.fetchall.return_value=[('TS-1',1)]
        with patch.object(main,'get_connection') as connect:
            connect.return_value.cursor.return_value=cursor
            self.assertEqual(await request('/sensors'),(200,{'data':[{'station_id':'TS-1','timestamp':1}]}))
        self.assertIn('LIMIT 50',cursor.execute.call_args.args[0])

    async def test_nearby_filters_location_and_ignores_invalid_coordinate(self):
        rows=[station(),station('TS-2','(20,50)'),station('bad','invalid')]
        with patch.object(main,'fetch_latest_station_states',return_value=rows):
            status,body=await request('/nearby',query='lat=46.4&lon=16.4')
        self.assertEqual(status,200);self.assertEqual([s['station_id'] for s in body['data']],['TS-1'])

    async def test_regions_count_disjoint_north_and_south_groups(self):
        with patch.object(main,'fetch_latest_station_states',return_value=[station(),station('TS-2','(16.4,46.2)')]):
            status,body=await request('/regions')
        self.assertEqual(status,200);self.assertEqual([r['stations'] for r in body['regions']],[1,1])

    async def test_legacy_alarms_and_correlation_select_same_faulted_station(self):
        with patch.object(main,'fetch_latest_station_states',return_value=[station(alarms={'overload':True}),station('TS-2')]):
            _,body=await request('/alarms')
            _,correlations=await request('/alarm-correlations')
        self.assertEqual(body['data'][0]['station_id'],'TS-1')
        self.assertEqual(correlations['correlations'][0]['affectedAssets'],['TS-1'])

    async def test_root_cause_existing_and_missing(self):
        with patch.object(main,'fetch_latest_station_states',return_value=[station(alarms={'overload':True})]):
            status,body=await request('/root-cause/corr-overload')
            self.assertEqual(status,200);self.assertEqual(body['affectedAssets'],['TS-1'])
            self.assertEqual(len(body['chain']),4)
            self.assertEqual((await request('/root-cause/missing'))[0],404)

    async def test_powerline_endpoint_uses_selected_station_scope(self):
        with patch.object(main,'current_power_lines',return_value=[{'line_id':'LINE-1'}]) as lines:
            self.assertEqual(await request('/power-lines'),(200,{'data':[{'line_id':'LINE-1'}]}))
            self.assertEqual(lines.call_args.args[0][0]['station_id'],'TS-1')

    async def test_physics_detail_flag_removes_node_details_only(self):
        _,full=await request('/physics/grid')
        _,summary=await request('/physics/grid',query='details=false')
        self.assertIn('nodes',full);self.assertNotIn('nodes',summary)
        self.assertEqual(summary['summary'],full['summary'])
        self.assertEqual(summary['model'],full['model'])

    async def test_contingency_preserves_failed_asset_identity(self):
        status,body=await request('/n-1/TS-1')
        self.assertEqual(status,200);self.assertEqual(body['assetId'],'TS-1')
        self.assertIn('TS-1',body['affectedAssets'])

    async def test_training_records_count_matches_state_histogram(self):
        with patch.object(main,'recent_telemetry',return_value=[station(),station('TS-2',alarms={'offline':True})]):
            status,body=await request('/ai/training-dataset',query='limit=2')
        self.assertEqual(status,200);self.assertEqual(body['count'],2)
        self.assertEqual(sum(body['stateCounts'].values()),2)
        self.assertEqual({r['label'] for r in body['records']},{'NORMAL','FAILURE'})

    async def test_station_prediction_is_scoped_to_requested_station(self):
        _,body=await request('/ai/stations/TS-1')
        self.assertEqual(body['stationId'],'TS-1');self.assertIn('features',body)

    async def test_alarm_stats_and_audit_envelopes(self):
        with patch.object(main,'alarm_stats',return_value={'active':3}),patch.object(main,'list_alarm_audit',return_value=[{'action':'ACK'}]):
            self.assertEqual(await request('/api/alarms/stats'),(200,{'active':3}))
            self.assertEqual(await request('/api/alarms/a/audit'),(200,{'data':[{'action':'ACK'}]}))

    async def test_scenario_definitions_and_run_list(self):
        status,body=await request('/api/scenarios/definitions')
        self.assertEqual(status,200);self.assertGreater(len(body['data']),0)
        with patch.object(main,'list_scenario_runs',new=AsyncMock(return_value=[])) as listing:
            self.assertEqual(await request('/api/scenarios',query='limit=5'),(200,{'data':[]}))
            listing.assert_awaited_once_with(5)

    async def test_stop_scenario_success(self):
        with patch.object(main,'stop_scenario',new=AsyncMock(return_value={'id':'s','status':'STOPPED'})):
            self.assertEqual(await request('/api/scenarios/s/stop','POST'),(200,{'id':'s','status':'STOPPED'}))

    async def test_topology_reflects_mqtt_and_database_outage(self):
        with patch.object(main,'is_mqtt_connected',return_value=False):
            status,body=await request('/system/topology')
        self.assertEqual(status,200)
        nodes={node['id']:node['status'] for node in body['nodes']}
        self.assertEqual(nodes['emqx'],'offline');self.assertEqual(nodes['cratedb'],'offline')
        self.assertLess(body['platformHealth'],100)

    async def test_cratedb_health_success_has_measured_latency(self):
        with patch.object(main,'get_connection'),patch.object(main,'is_mqtt_connected',return_value=True):
            status,body=await request('/api/health/cratedb')
        self.assertEqual(status,200);self.assertTrue(body['connected']);self.assertTrue(body['mqttConnected'])
        self.assertGreaterEqual(body['latencyMs'],0)

    async def test_websocket_disconnect_releases_client(self):
        ws=MagicMock();ws.receive_text=AsyncMock(side_effect=WebSocketDisconnect)
        with patch.object(main.manager,'connect',new=AsyncMock()) as connect,patch.object(main.manager,'disconnect') as disconnect:
            await main.websocket_endpoint(ws)
        connect.assert_awaited_once_with(ws);disconnect.assert_called_once_with(ws)

    async def test_invalid_path_and_method_are_not_success(self):
        self.assertEqual((await request('/missing'))[0],404)
        self.assertEqual((await request('/health','POST'))[0],405)

    async def test_empty_api_state_has_no_assets_or_alarms(self):
        with patch.object(main,'fetch_latest_station_states',return_value=[]):
            self.assertEqual((await request('/latest-stations'))[1]['data'],[])
            self.assertEqual((await request('/alarms'))[1]['data'],[])
            self.assertEqual((await request('/grid/summary'))[1]['stations'],0)
            self.assertEqual((await request('/ai/insights'))[1]['insights'],[])

class RequirementsAcceptance(unittest.IsolatedAsyncioTestCase):
    """Behavioral requirements beyond the current implementation. These may fail."""
    def test_threshold_insights_are_scoped_and_do_not_claim_calibrated_confidence(self):
        samples=[station(),station('TS-2',electrical={'current_a':650},thermal={'oil_temp_c':90})]
        insights=main.build_ai_insights(samples)
        self.assertTrue(insights)
        self.assertTrue(all(item['assetId']=='TS-2' for item in insights))
        self.assertTrue(all(item['method']=='heuristic' and item['confidence'] is None for item in insights))
        self.assertTrue(any(item['type']=='overload' for item in insights))
        self.assertTrue(any(item['type']=='cooling' for item in insights))

    def test_forecast_zero_load_is_preserved_and_confidence_is_unavailable(self):
        points=main.build_forecast_points([station(electrical={'active_power_kw':0})])
        self.assertEqual(len(points),12)
        self.assertTrue(all(point['loadMW']==0 and point['confidence'] is None and point['method']=='heuristic' for point in points))

    async def test_normal_telemetry_does_not_claim_detected_cooling_failure(self):
        insights=main.build_ai_insights([station()])
        self.assertFalse(any('Cooling degradation detected' in item['title'] for item in insights),
                         'A normal sample cannot establish detected cooling degradation')

    async def test_empty_grid_does_not_produce_confident_forecast(self):
        self.assertEqual(main.build_forecast_points([]),[],
                         'Missing telemetry must not be shown as 12 forecasts with invented confidence')

    async def test_heuristic_predictions_disclose_their_method(self):
        prediction=main.station_prediction(station())
        self.assertTrue(prediction.get('method')=='heuristic' or prediction.get('modelVersion'),
                        'Prediction needs heuristic disclosure or model provenance; proposed metadata contract')

    async def test_insight_confidence_has_evidence_or_is_unavailable(self):
        insights=main.build_ai_insights([station()])
        self.assertTrue(all(item.get('confidence') is None or item.get('confidenceEvidence') for item in insights),
                        'Hardcoded confidence percentages have no calibration/evidence; proposed metadata contract')

    async def test_weather_without_weather_source_is_explicitly_estimated(self):
        result=main.build_weather_payload([station()])
        self.assertTrue(result.get('estimated') or result.get('source') or result.get('method'),
                        'Wind/lightning/storm values derived from station risk need source/estimation disclosure')

    async def test_malformed_sensor_objects_do_not_crash_analytics(self):
        sample=station(electrical=[],thermal='invalid',oil_gas=None)
        self.assertIsInstance(main.station_prediction(sample),dict)

    async def test_unknown_twin_type_is_rejected(self):
        with patch.object(main,'fetch_latest_station_states',return_value=[station()]):
            status,_=await request('/digital-twin/unknown/TS-1')
        self.assertIn(status,[400,404,422])

    async def test_alarm_list_database_failure_returns_service_unavailable(self):
        with patch.object(main,'list_alarms',side_effect=RuntimeError('offline')):
            try:status,_=await request('/api/alarms')
            except RuntimeError:self.fail('DB failure is unhandled; endpoint emits 500 instead of an explicit unavailable response')
        self.assertEqual(status,503)
