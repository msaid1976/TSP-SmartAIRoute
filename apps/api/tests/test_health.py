import pytest
from app.main import app
from app.services import health as health_service
from httpx import ASGITransport, AsyncClient


@pytest.mark.anyio
async def test_health_endpoint_returns_expected_payload(monkeypatch) -> None:
    monkeypatch.setattr(health_service, "check_database_connection", lambda: True)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "db": "connected", "version": "1.0.0"}
