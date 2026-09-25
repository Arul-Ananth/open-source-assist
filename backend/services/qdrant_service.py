"""Qdrant service managing client connections, collection lifecycle, and vector search operations.

Strictly connects to a standalone Qdrant Server (Local Docker, Self-Hosted, or Qdrant Cloud).
"""

from typing import Any
from qdrant_client import AsyncQdrantClient, models
from backend.core.config import settings
from backend.schemas.ingest import RepoIngestItem
from backend.schemas.search import RepoSearchFilter


class QdrantService:
    """Service wrapping AsyncQdrantClient for repository vector search and storage."""

    def __init__(self) -> None:
        self._client: AsyncQdrantClient | None = None
        self._collection_name = settings.QDRANT_COLLECTION_NAME

    def get_client(self) -> AsyncQdrantClient:
        """Obtain or initialize the AsyncQdrantClient singleton connected to Qdrant Server."""
        if self._client is None:
            self._client = AsyncQdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY,
                prefer_grpc=settings.QDRANT_PREFER_GRPC,
            )
        return self._client

    async def check_health(self) -> bool:
        """Ping the Qdrant Server cluster to verify connectivity and readiness."""
        try:
            client = self.get_client()
            await client.get_collections()
            return True
        except Exception:
            return False

    async def close(self) -> None:
        """Cleanly close client connections."""
        if self._client is not None:
            await self._client.close()
            self._client = None

    async def ensure_collection_exists(self) -> None:
        """Create Qdrant collection and payload indexes if they do not exist."""
        client = self.get_client()
        exists = await client.collection_exists(collection_name=self._collection_name)
        if not exists:
            # Create collection with Cosine distance and HNSW config
            await client.create_collection(
                collection_name=self._collection_name,
                vectors_config=models.VectorParams(
                    size=settings.QDRANT_VECTOR_SIZE,
                    distance=models.Distance.COSINE,
                ),
                hnsw_config=models.HnswConfigDiff(
                    m=16,
                    ef_construct=100,
                ),
            )

            # Create payload indexes for fast filtered vector searches
            payload_fields: list[tuple[str, models.PayloadSchemaType]] = [
                ("language", models.PayloadSchemaType.KEYWORD),
                ("license", models.PayloadSchemaType.KEYWORD),
                ("topics", models.PayloadSchemaType.KEYWORD),
                ("stars", models.PayloadSchemaType.INTEGER),
                ("forks", models.PayloadSchemaType.INTEGER),
            ]
            for field_name, schema_type in payload_fields:
                try:
                    await client.create_payload_index(
                        collection_name=self._collection_name,
                        field_name=field_name,
                        field_schema=schema_type,
                    )
                except Exception:
                    # Some local/in-memory instances warn or skip payload index creation
                    pass

    async def upsert_repositories(
        self,
        repositories: list[RepoIngestItem],
        embeddings: list[list[float]],
        batch_size: int = 100,
    ) -> int:
        """Upsert a batch of repositories and their embeddings into Qdrant.

        Args:
            repositories: List of repository metadata items.
            embeddings: Corresponding list of dense vector embeddings.
            batch_size: Number of points to upsert per request.

        Returns:
            Number of points upserted.
        """
        if not repositories or not embeddings or len(repositories) != len(embeddings):
            return 0

        await self.ensure_collection_exists()
        client = self.get_client()
        total_upserted = 0

        points: list[models.PointStruct] = []
        for repo, vector in zip(repositories, embeddings):
            payload: dict[str, Any] = {
                "repo_id": repo.repo_id,
                "full_name": repo.full_name,
                "html_url": repo.html_url,
                "description": repo.description,
                "language": repo.language,
                "stars": repo.stars,
                "forks": repo.forks,
                "open_issues": repo.open_issues,
                "license": repo.license,
                "topics": repo.topics,
                "pushed_at": repo.pushed_at,
                "readme_summary": repo.readme_summary,
            }
            points.append(
                models.PointStruct(
                    id=repo.repo_id,
                    vector=vector,
                    payload=payload,
                )
            )

        # Batch upsert
        for i in range(0, len(points), batch_size):
            chunk = points[i : i + batch_size]
            await client.upsert(
                collection_name=self._collection_name,
                points=chunk,
                wait=True,
            )
            total_upserted += len(chunk)

        return total_upserted

    async def search_candidates(
        self,
        query_vector: list[float],
        limit: int,
        filters: RepoSearchFilter | None = None,
    ) -> list[models.ScoredPoint]:
        """Perform semantic candidate search in Qdrant with optional payload filters.

        Args:
            query_vector: Dense vector for the search query.
            limit: Maximum candidate points to retrieve.
            filters: Optional filtering criteria.

        Returns:
            List of matching ScoredPoint instances from Qdrant.
        """
        client = self.get_client()

        # Resilient auto-creation: if collection doesn't exist yet, bootstrap it and return empty
        exists = await client.collection_exists(collection_name=self._collection_name)
        if not exists:
            await self.ensure_collection_exists()
            return []

        must_conditions: list[models.Condition] = []

        if filters:
            if filters.language:
                must_conditions.append(
                    models.FieldCondition(
                        key="language",
                        match=models.MatchValue(value=filters.language),
                    )
                )
            if filters.min_stars is not None:
                must_conditions.append(
                    models.FieldCondition(
                        key="stars",
                        range=models.Range(gte=filters.min_stars),
                    )
                )
            if filters.license:
                must_conditions.append(
                    models.FieldCondition(
                        key="license",
                        match=models.MatchValue(value=filters.license),
                    )
                )
            if filters.topic:
                must_conditions.append(
                    models.FieldCondition(
                        key="topics",
                        match=models.MatchValue(value=filters.topic),
                    )
                )

        query_filter = models.Filter(must=must_conditions) if must_conditions else None

        response = await client.query_points(
            collection_name=self._collection_name,
            query=query_vector,
            query_filter=query_filter,
            limit=limit,
            with_payload=True,
        )
        return response.points


# Module singleton instance
qdrant_service = QdrantService()

