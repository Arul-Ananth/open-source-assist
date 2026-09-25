"""API router handling open-source repository semantic search and ingestion endpoints.

Adheres strictly to the backend architecture mandate: routers only handle HTTP
dispatching, Pydantic validation, and dependency injection. Zero business logic is
contained in this file.
"""

from typing import Any

from fastapi import APIRouter, Depends, status

from backend.api.dependencies import get_optional_current_user, get_search_service
from backend.schemas.ingest import BatchRepoIngestRequest, BatchRepoIngestResponse
from backend.schemas.search import RepoSearchRequest, RepoSearchResponse
from backend.services.search_service import SearchService

router = APIRouter(prefix="", tags=["Search"])


@router.post(
    "/search",
    response_model=RepoSearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Semantic Repository Search",
    description=(
        "Performs high-performance semantic search over indexed open-source repositories "
        "using Qdrant vector database. Combines dense semantic similarity with "
        "logarithmically normalized popularity scores using the Multiplicative Gate strategy. "
        "Supports filtering by language, minimum stars, license, and topic tags."
    ),
)
async def search_repositories(
    payload: RepoSearchRequest,
    service: SearchService = Depends(get_search_service),
    current_user: dict[str, Any] | None = Depends(get_optional_current_user),
) -> RepoSearchResponse:
    """Execute semantic search against open-source repositories."""
    return await service.search_repositories(request=payload)


@router.post(
    "/internal/ingest",
    response_model=BatchRepoIngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Batch Repository Ingestion",
    description=(
        "Contract endpoint for the data sourcing and ingestion module. "
        "Receives a batch of repository metadata objects, generates dense embeddings, "
        "and upserts points into the Qdrant vector collection."
    ),
)
async def ingest_repositories(
    payload: BatchRepoIngestRequest,
    service: SearchService = Depends(get_search_service),
) -> BatchRepoIngestResponse:
    """Batch ingest repositories into the Qdrant vector collection."""
    return await service.ingest_repositories(request=payload)

