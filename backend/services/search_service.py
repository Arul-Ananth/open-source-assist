"""Search service orchestrating vector retrieval, popularity scoring, and ranking."""

import logging
import math
import time

from typing import Any

logger = logging.getLogger(__name__)

from backend.core.config import settings
from backend.schemas.ingest import (
    BatchRepoIngestRequest,
    BatchRepoIngestResponse,
)
from backend.schemas.search import (
    RepoItem,
    RepoScoreBreakdown,
    RepoSearchFilter,
    RepoSearchRequest,
    RepoSearchResponse,
)
from backend.services.embedding_service import EmbeddingService, embedding_service
from backend.services.qdrant_service import QdrantService, qdrant_service
from backend.services.scoring_strategy import (
    LinearHybridStrategy,
    MultiplicativeGateStrategy,
    ScoringStrategy,
    get_scoring_strategy,
)


class SearchService:
    """Service handling repository search, popularity normalization, and batch ingestion."""

    def __init__(
        self,
        qdrant_svc: QdrantService | None = None,
        embedding_svc: EmbeddingService | None = None,
        scoring_strategy: ScoringStrategy | None = None,
    ) -> None:
        self.qdrant = qdrant_svc or qdrant_service
        self.embedder = embedding_svc or embedding_service
        self.strategy = scoring_strategy or MultiplicativeGateStrategy()

    @staticmethod
    def normalize_popularity(stars: int, forks: int) -> float:
        """Calculate a normalized popularity score [0.0, 1.0] using logarithmic scaling.

        Avoids power-law distortion where mega-repositories completely swamp
        emerging or moderately popular repositories.

        Args:
            stars: Repository star count.
            forks: Repository fork count.

        Returns:
            Normalized popularity float between 0.0 and 1.0.
        """
        # Baseline max anchors: 100,000 stars and 20,000 forks
        max_stars = 100_000
        max_forks = 20_000
        denominator = math.log10(max_stars + 1) + 0.5 * math.log10(max_forks + 1)

        safe_stars = max(0, stars)
        safe_forks = max(0, forks)
        numerator = math.log10(safe_stars + 1) + 0.5 * math.log10(safe_forks + 1)

        raw_score = numerator / denominator if denominator > 0 else 0.0
        return round(max(0.0, min(1.0, raw_score)), 4)

    async def search_repositories(
        self, request: RepoSearchRequest
    ) -> RepoSearchResponse:
        """Execute semantic search with popularity reranking.

        Args:
            request: Validated search request parameters.

        Returns:
            RepoSearchResponse containing sorted repository results and metadata.
        """
        start_time = time.perf_counter()
        query_text = (request.query or "").strip()

        candidate_limit = max(
            settings.CANDIDATE_SEARCH_LIMIT,
            request.offset + request.limit + 20,
        )

        points: list[Any] = []
        try:
            if not query_text:
                # Empty query browse mode: retrieve candidates matching filters
                points = await self.qdrant.get_all_candidates(
                    limit=candidate_limit,
                    filters=request.filters,
                )
            else:
                # Semantic vector search mode
                query_vector = await self.embedder.embed_query(query_text)
                points = await self.qdrant.search_candidates(
                    query_vector=query_vector,
                    limit=candidate_limit,
                    filters=request.filters,
                )
        except Exception as exc:
            logger.warning("Qdrant search unavailable or offline: %s", exc)
            points = []

        if request.strategy:
            strategy_instance = get_scoring_strategy(request.strategy)
        elif request.popularity_weight >= 0.7:
            strategy_instance = LinearHybridStrategy()
        else:
            strategy_instance = self.strategy

        # Step 3: Compute popularity score and apply scoring strategy
        scored_items: list[RepoItem] = []
        for point in points:
            payload = point.payload or {}
            stars = int(payload.get("stars", 0))
            forks = int(payload.get("forks", 0))

            semantic_score = round(float(point.score), 4)
            popularity_score = self.normalize_popularity(stars, forks)
            final_score = round(
                strategy_instance.calculate_score(
                    semantic_score=semantic_score,
                    popularity_score=popularity_score,
                    popularity_weight=request.popularity_weight,
                ),
                4,
            )

            item = RepoItem(
                repo_id=int(payload.get("repo_id", point.id)),
                full_name=str(payload.get("full_name", "")),
                html_url=str(payload.get("html_url", "")),
                description=payload.get("description"),
                language=payload.get("language"),
                stars=stars,
                forks=forks,
                open_issues=int(payload.get("open_issues", 0)),
                license=payload.get("license"),
                topics=list(payload.get("topics") or []),
                pushed_at=payload.get("pushed_at"),
                scores=RepoScoreBreakdown(
                    semantic_score=semantic_score,
                    popularity_score=popularity_score,
                    final_score=final_score,
                    strategy=strategy_instance.name,
                ),
            )
            scored_items.append(item)

        # Step 4: Re-rank candidates by final_score descending, tie-breaking by stars and forks
        scored_items.sort(
            key=lambda item: (item.scores.final_score, item.stars, item.forks),
            reverse=True,
        )

        # Step 5: Paginate results
        paginated_items = scored_items[request.offset : request.offset + request.limit]
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return RepoSearchResponse(
            query=request.query,
            total=len(scored_items),
            limit=request.limit,
            offset=request.offset,
            items=paginated_items,
            strategy=strategy_instance.name,
            duration_ms=duration_ms,
        )

    async def ingest_repositories(
        self, request: BatchRepoIngestRequest
    ) -> BatchRepoIngestResponse:
        """Batch vectorize and upsert repositories into Qdrant.

        Args:
            request: Batch ingestion payload containing list of repositories.

        Returns:
            BatchRepoIngestResponse summarizing the ingestion outcome.
        """
        start_time = time.perf_counter()

        # Step 1: Build semantic representation texts
        texts = [
            EmbeddingService.build_repo_representation(repo)
            for repo in request.repositories
        ]

        # Step 2: Generate dense embeddings
        embeddings = await self.embedder.embed_texts(texts)

        # Step 3: Upsert into Qdrant
        count = await self.qdrant.upsert_repositories(
            repositories=request.repositories,
            embeddings=embeddings,
        )

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return BatchRepoIngestResponse(
            inserted_count=count,
            collection_name=settings.QDRANT_COLLECTION_NAME,
            duration_ms=duration_ms,
        )


# Module singleton instance
search_service = SearchService()

