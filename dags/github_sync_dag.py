"""Airflow DAG — weekly GitHub repository and contributor sync.

Runs: create_tables >> full_sync >> contributor_refresh
"""

import asyncio
import sys
from datetime import datetime, timedelta
from pathlib import Path

from airflow import DAG
from airflow.operators.python import PythonOperator

# Make the project root importable so `backend.*` resolves.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def create_tables() -> None:
    from backend.core.database import init_db

    asyncio.run(init_db())


def run_full_sync() -> dict[str, int]:
    from backend.core.database import async_session_factory
    from backend.services.github_client import GitHubClient
    from backend.services.github_sync_service import sync_github

    async def _sync() -> dict[str, int]:
        async with async_session_factory() as session:
            async with GitHubClient() as client:
                return await sync_github(session, client)

    return asyncio.run(_sync())


def run_contributor_sync() -> int:
    from backend.core.database import async_session_factory
    from backend.services.github_client import GitHubClient
    from backend.services.github_sync_service import sync_contributors

    async def _sync() -> int:
        async with async_session_factory() as session:
            async with GitHubClient() as client:
                return await sync_contributors(session, client)

    return asyncio.run(_sync())


default_args = {
    "owner": "airflow",
    "retries": 2,
    "retry_delay": timedelta(minutes=10),
}

with DAG(
    dag_id="github_sync_weekly",
    default_args=default_args,
    description="Sync GitHub repos, contributors, and their contact details every 7 days",
    schedule=timedelta(days=7),
    start_date=datetime(2026, 9, 1),
    catchup=False,
    tags=["github", "open-source-compass"],
) as dag:
    ensure_tables = PythonOperator(
        task_id="create_tables",
        python_callable=create_tables,
    )

    full_sync = PythonOperator(
        task_id="full_sync",
        python_callable=run_full_sync,
    )

    contributor_refresh = PythonOperator(
        task_id="contributor_refresh",
        python_callable=run_contributor_sync,
    )

    ensure_tables >> full_sync >> contributor_refresh
