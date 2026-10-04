"""Tests for the manual Airflow DAG trigger endpoint."""

from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from backend.api.routes import airflow
from backend.main import app


class FakeAirflowResponse:
    is_error = False
    status_code = 200
    text = ""

    def json(self) -> dict[str, str]:
        return {"dag_run_id": "manual__test-run", "state": "queued"}


class FakeAirflowClient:
    def __init__(self, **_: Any) -> None:
        pass

    async def __aenter__(self) -> "FakeAirflowClient":
        return self

    async def __aexit__(self, *_: Any) -> None:
        pass

    async def post(self, url: str, json: dict[str, Any]) -> FakeAirflowResponse:
        assert url == "http://airflow.test/api/v1/dags/github_sync_weekly/dagRuns"
        assert json["dag_run_id"].startswith("manual__")
        assert json["conf"] == {}
        return FakeAirflowResponse()


@pytest.mark.asyncio
async def test_trigger_github_sync_dag(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(airflow.settings, "AIRFLOW_API_URL", "http://airflow.test")
    monkeypatch.setattr(airflow.httpx, "AsyncClient", FakeAirflowClient)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/airflow/trigger")

    assert response.status_code == 200
    assert response.json() == {
        "message": "DAG run triggered successfully.",
        "dag_id": "github_sync_weekly",
        "dag_run_id": "manual__test-run",
        "state": "queued",
    }