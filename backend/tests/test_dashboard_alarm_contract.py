import test_bootstrap
import json
from pathlib import Path
import unittest
from app.services.alarm_repository import ALARM_DEFINITIONS,evaluate_alarm_conditions

class DashboardAlarmContract(unittest.TestCase):
    def test_shared_alarm_snapshot_matches_backend_rules(self):
        fixtures=json.loads((Path(__file__).resolve().parents[2]/'shared/alarm_rule_fixtures.json').read_text())
        for case in fixtures:
            with self.subTest(case=case['name']):
                actual=[{'type':key,'severity':ALARM_DEFINITIONS[key]['severity']}
                        for key,active in evaluate_alarm_conditions(case['station']).items() if active]
                self.assertEqual(actual,case['expected'])
