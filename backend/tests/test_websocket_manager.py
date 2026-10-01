import unittest

from app.services.websocket_manager import ConnectionManager


class FakeWebSocket:
    def __init__(self, fail=False):
        self.accepted = False
        self.messages = []
        self.fail = fail

    async def accept(self):
        self.accepted = True

    async def send_json(self, data):
        if self.fail:
            raise RuntimeError("socket closed")
        self.messages.append(data)


class ConnectionManagerTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.manager = ConnectionManager()

    async def test_connect_and_disconnect_track_connection_count(self):
        socket = FakeWebSocket()
        await self.manager.connect(socket)

        self.assertTrue(socket.accepted)
        self.assertEqual(self.manager.connection_count, 1)

        self.manager.disconnect(socket)
        self.manager.disconnect(socket)
        self.assertEqual(self.manager.connection_count, 0)

    async def test_broadcast_sends_to_every_healthy_connection(self):
        first = FakeWebSocket()
        second = FakeWebSocket()
        await self.manager.connect(first)
        await self.manager.connect(second)

        await self.manager.broadcast({"station_id": "TS-1"})

        self.assertEqual(first.messages, [{"station_id": "TS-1"}])
        self.assertEqual(second.messages, [{"station_id": "TS-1"}])
        self.assertEqual(self.manager.connection_count, 2)

    async def test_broadcast_removes_failed_connections(self):
        healthy = FakeWebSocket()
        failed = FakeWebSocket(fail=True)
        await self.manager.connect(healthy)
        await self.manager.connect(failed)

        await self.manager.broadcast({"status": "ok"})

        self.assertEqual(healthy.messages, [{"status": "ok"}])
        self.assertEqual(self.manager.active_connections, [healthy])

    async def test_broadcast_with_no_connections_is_a_noop(self):
        await self.manager.broadcast({"status": "ok"})
        self.assertEqual(self.manager.connection_count, 0)


if __name__ == "__main__":
    unittest.main()
