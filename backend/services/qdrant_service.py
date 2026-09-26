"""Qdrant service managing client connections, collection lifecycle, and vector search operations.

Supports connecting to a standalone Qdrant Server (Local Docker, Self-Hosted, or Qdrant Cloud),
with resilient fallback to embedded in-memory vector storage for seamless local development.
"""

import logging
from typing import Any

from qdrant_client import AsyncQdrantClient, models

from backend.core.config import settings
from backend.schemas.ingest import RepoIngestItem
from backend.schemas.search import RepoSearchFilter

logger = logging.getLogger(__name__)

# Canonical language casing map for consistent filter matching
LANGUAGE_CANONICAL_MAP: dict[str, str] = {
    "python": "Python",
    "typescript": "TypeScript",
    "javascript": "JavaScript",
    "rust": "Rust",
    "go": "Go",
    "golang": "Go",
    "c": "C",
    "c++": "C++",
    "cpp": "C++",
    "c#": "C#",
    "csharp": "C#",
    "java": "Java",
    "zig": "Zig",
    "elixir": "Elixir",
    "ruby": "Ruby",
    "php": "PHP",
    "html": "HTML",
    "css": "CSS",
    "shell": "Shell",
    "bash": "Shell",
}


class QdrantService:
    """Service wrapping AsyncQdrantClient for repository vector search and storage."""

    def __init__(self) -> None:
        self._client: AsyncQdrantClient | None = None
        self._collection_name = settings.QDRANT_COLLECTION_NAME
        self._is_in_memory: bool = False

    def get_client(self) -> AsyncQdrantClient:
        """Obtain the cached client or create a synchronous fallback client."""
        if self._client is None:
            self._client = AsyncQdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY,
                prefer_grpc=settings.QDRANT_PREFER_GRPC,
            )
        return self._client

    @staticmethod
    def _is_server_reachable(url_str: str) -> bool:
        """Fast socket test to check if Qdrant server port is reachable without HTTP retry delays."""
        try:
            from urllib.parse import urlparse
            import socket

            parsed = urlparse(url_str)
            host = parsed.hostname or "127.0.0.1"
            port = parsed.port or (6333 if parsed.scheme == "http" else 443)
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.2)
                return s.connect_ex((host, port)) == 0
        except Exception:
            return False

    async def get_client_async(self) -> AsyncQdrantClient:
        """Obtain or initialize the AsyncQdrantClient with resilient fallback.

        Attempts connection to the configured Qdrant Server. If unreachable,
        transparently falls back to an embedded in-memory client so that
        semantic vector search, filtering, and exploration continue without error.
        """
        if self._client is not None:
            return self._client

        # Fast check if server is listening
        if not self._is_server_reachable(settings.QDRANT_URL):
            logger.info(
                "Qdrant server at %s unavailable. Falling back to embedded in-memory vector storage.",
                settings.QDRANT_URL,
            )
            self._client = AsyncQdrantClient(location=":memory:")
            self._is_in_memory = True
            return self._client

        # Connect to configured Qdrant Server
        try:
            client = AsyncQdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY,
                prefer_grpc=settings.QDRANT_PREFER_GRPC,
            )
            self._client = client
            self._is_in_memory = False
            return self._client
        except Exception:
            self._client = AsyncQdrantClient(location=":memory:")
            self._is_in_memory = True
            return self._client

    async def check_health(self) -> bool:
        """Ping the Qdrant cluster to verify connectivity and readiness."""
        try:
            client = await self.get_client_async()
            await client.get_collections()
            return True
        except Exception:  # noqa: BLE001
            return False

    async def close(self) -> None:
        """Cleanly close client connections."""
        if self._client is not None:
            await self._client.close()
            self._client = None

    async def ensure_collection_exists(self) -> None:
        """Create Qdrant collection, payload indexes, and seed curated data if empty."""
        client = await self.get_client_async()
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
                except Exception:  # noqa: BLE001, S110
                    pass

        # Check if collection is empty; if so, trigger background seeding
        try:
            info = await client.get_collection(collection_name=self._collection_name)
            points_count = getattr(info, "points_count", 0) or 0
            if points_count == 0:
                await self._seed_curated_catalog()
        except Exception as exc:
            logger.debug("Notice on collection count check: %s", exc)

    async def _seed_curated_catalog(self) -> None:
        """Automatically seed the curated repository catalog with dense embeddings."""
        try:
            from backend.services.curated_data import CURATED_REPOSITORIES
            from backend.services.embedding_service import EmbeddingService, embedding_service

            logger.info("Auto-seeding %d curated repositories into Qdrant...", len(CURATED_REPOSITORIES))
            texts = [
                EmbeddingService.build_repo_representation(repo)
                for repo in CURATED_REPOSITORIES
            ]
            embeddings = await embedding_service.embed_texts(texts)
            await self.upsert_repositories(
                repositories=CURATED_REPOSITORIES,
                embeddings=embeddings,
            )
            logger.info("Successfully seeded curated repositories into Qdrant collection '%s'.", self._collection_name)
        except Exception as exc:
            logger.warning("Could not auto-seed curated repositories: %s", exc)

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

        client = await self.get_client_async()
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

    def _build_filter(self, filters: RepoSearchFilter | None) -> models.Filter | None:
        """Build a Qdrant Filter from RepoSearchFilter criteria."""
        if not filters:
            return None

        must_conditions: list[models.Condition] = []

        if filters.language:
            raw_lang = filters.language.strip()
            # Normalize casing if recognized
            matched_lang = LANGUAGE_CANONICAL_MAP.get(raw_lang.lower(), raw_lang)
            must_conditions.append(
                models.FieldCondition(
                    key="language",
                    match=models.MatchValue(value=matched_lang),
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

        return models.Filter(must=must_conditions) if must_conditions else None

    async def get_all_candidates(
        self,
        limit: int,
        filters: RepoSearchFilter | None = None,
    ) -> list[models.ScoredPoint]:
        """Retrieve candidate repositories matching filters without vector similarity requirement.

        Used when search query is empty ("") to allow browsing by language, popularity, or topic.
        """
        client = await self.get_client_async()
        exists = await client.collection_exists(collection_name=self._collection_name)
        if not exists:
            await self.ensure_collection_exists()

        query_filter = self._build_filter(filters)

        records, _ = await client.scroll(
            collection_name=self._collection_name,
            scroll_filter=query_filter,
            limit=limit,
            with_payload=True,
        )

        return [
            models.ScoredPoint(
                id=rec.id,
                version=0,
                score=1.0,
                payload=rec.payload,
                vector=None,
            )
            for rec in records
        ]

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
        client = await self.get_client_async()

        exists = await client.collection_exists(collection_name=self._collection_name)
        if not exists:
            await self.ensure_collection_exists()

        query_filter = self._build_filter(filters)

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


