import unittest

from app.services.alarm_repository import is_valid_transition


class AlarmLifecycleTests(unittest.TestCase):
    def test_active_alarm_can_follow_supported_paths(self):
        self.assertTrue(is_valid_transition("ACTIVE", "ACK"))
        self.assertTrue(is_valid_transition("ACTIVE", "WORK_ORDER"))
        self.assertTrue(is_valid_transition("ACTIVE", "RESOLVED"))

    def test_acknowledged_alarm_cannot_return_to_active(self):
        self.assertFalse(is_valid_transition("ACK", "ACTIVE"))
        self.assertTrue(is_valid_transition("ACK", "WORK_ORDER"))

    def test_resolved_alarm_is_terminal(self):
        self.assertFalse(is_valid_transition("RESOLVED", "ACK"))
        self.assertTrue(is_valid_transition("RESOLVED", "RESOLVED"))


if __name__ == "__main__":
    unittest.main()
