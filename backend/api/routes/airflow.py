"""Routes for triggering Airflow DAGs."""

from uuid import uuid4

import httpx
from fastapi import APIRouter, HTTPException

from backend.core.config import settings

router = APIRouter(prefix="/airflow", tags=["Airflow"])


@router.post("/trigger")
async def trigger_github_sync_dag() -> dict[str, str]:
    """Create a manual run of the configured GitHub sync DAG in Airflow."""
    dag_run_id = f"manual__{uuid4().hex}"
    url = (
        f"{settings.AIRFLOW_API_URL.rstrip('/')}/api/v1/dags/"
        f"{settings.AIRFLOW_DAG_ID}/dagRuns"
    )
    auth = None
    if settings.AIRFLOW_API_USERNAME and settings.AIRFLOW_API_PASSWORD:
        auth = httpx.BasicAuth(
            settings.AIRFLOW_API_USERNAME,
            settings.AIRFLOW_API_PASSWORD,
        )

    try:
        async with httpx.AsyncClient(timeout=15, auth=auth) as client:
            response = await client.post(
                url,
                json={"dag_run_id": dag_run_id, "conf": {}},
            )
    except httpx.RequestError as error:
        raise HTTPException(
            status_code=502,
            detail="Could not connect to Airflow. Check AIRFLOW_API_URL and ensure Airflow is running.",
        ) from error

    if response.is_error:
        raise HTTPException(
            status_code=502,
            detail=f"Airflow rejected the DAG trigger ({response.status_code}): {response.text[:300]}",
        )

    result = response.json()
    return {
        "message": "DAG run triggered successfully.",
        "dag_id": settings.AIRFLOW_DAG_ID,
        "dag_run_id": result.get("dag_run_id", dag_run_id),
        "state": result.get("state", "queued"),
    }