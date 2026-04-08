from worker_app.tasks import ping


def test_ping_task_returns_expected_payload() -> None:
    assert ping.run() == {"status": "ok", "message": "pong"}
