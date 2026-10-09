"""Search service orchestrating vector retrieval, popularity scoring, and ranking."""

from collections.abc import Sequence
import logging
import math
import time

from typing import Any

logger = logging.getLogger(__name__)

from backend.core.config import settings
from backend.schemas.ingest import (
    BatchRepoIngestRequest,
    BatchRepoIngestResponse,
    RepoIngestItem,
)
from backend.schemas.search import (
    RepoItem,
    RepoScoreBreakdown,
    RepoSearchFilter,
    RepoSearchRequest,
    RepoSearchResponse,
)
from backend.services.github_client import GitHubClient
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

    @staticmethod
    def compute_cosine_similarity(
        vec_a: Sequence[float], vec_b: Sequence[float]
    ) -> float:
        """Calculate cosine similarity between two dense vectors."""
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
        sim = dot / (norm_a * norm_b)
        return round(max(0.0, min(1.0, float(sim))), 4)

    async def _safe_background_ingest(
        self,
        items: list[RepoIngestItem],
        precomputed_embeddings: list[list[float]] | None = None,
    ) -> None:
        """Asynchronously ingest newly discovered GitHub repositories into Qdrant."""
        try:
            if not items:
                return
            if precomputed_embeddings and len(precomputed_embeddings) == len(items):
                count = await self.qdrant.upsert_repositories(
                    repositories=items,
                    embeddings=precomputed_embeddings,
                )
                logger.info(
                    "Background upserted %d repositories with precomputed embeddings into Qdrant",
                    count,
                )
            else:
                await self.ingest_repositories(BatchRepoIngestRequest(repositories=items))
                logger.info("Background ingested %d discovered repositories into Qdrant", len(items))
        except Exception as exc:
            logger.warning("Background repository ingestion failed: %s", exc)

    async def search_repositories(
        self,
        request: RepoSearchRequest,
        github_access_token: str | None = None,
        background_tasks: Any | None = None,
    ) -> RepoSearchResponse:
        """Execute semantic search with popularity reranking and optional hybrid GitHub live discovery.

        Args:
            request: Validated search request parameters.
            github_access_token: Optional GitHub OAuth token of authenticated user.
            background_tasks: Optional FastAPI BackgroundTasks instance for async ingestion.

        Returns:
            RepoSearchResponse containing sorted repository results and metadata.
        """
        start_time = time.perf_counter()
        query_text = (request.query or "").strip()
        search_mode = "semantic"

        candidate_limit = max(
            settings.CANDIDATE_SEARCH_LIMIT,
            request.offset + request.limit + 20,
        )

        points: list[Any] = []
        query_vector: list[float] | None = None
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

        # If user is authenticated with GitHub OAuth and entered a query, fetch live candidates
        github_items: list[dict[str, Any]] = []
        if github_access_token and query_text:
            search_mode = "hybrid"
            try:
                lang = request.filters.language if request.filters else None
                min_stars = request.filters.min_stars if request.filters else 10
                async with GitHubClient(token=github_access_token) as gh:
                    github_items = await gh.search_repositories_query(
                        query=query_text,
                        language=lang,
                        min_stars=min_stars,
                        per_page=15,
                    )
            except Exception as exc:
                logger.warning("Live GitHub search failed or rate-limited: %s", exc)

        if request.strategy:
            strategy_instance = get_scoring_strategy(request.strategy)
        elif request.popularity_weight >= 0.7:
            strategy_instance = LinearHybridStrategy()
        else:
            strategy_instance = self.strategy

        # Step 3: Compute popularity score and apply scoring strategy
        scored_items: list[RepoItem] = []
        existing_items: dict[str, RepoItem] = {}

        for point in points:
            payload = point.payload or {}
            full_name = str(payload.get("full_name", ""))
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
                full_name=full_name,
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
            if full_name:
                existing_items[full_name.lower()] = item

        # Separate live GitHub results into existing items to patch vs new items to embed
        new_github_repos: list[RepoIngestItem] = []
        seen_new_names: set[str] = set()

        for gh_repo in github_items:
            full_name = gh_repo.get("full_name", "")
            if not full_name:
                continue
            name_lower = full_name.lower()

            # --- Live Metadata Patching for Existing Candidates ---
            if name_lower in existing_items:
                existing_item = existing_items[name_lower]
                live_stars = int(gh_repo.get("stargazers_count", existing_item.stars))
                live_forks = int(gh_repo.get("forks_count", existing_item.forks))
                live_issues = int(gh_repo.get("open_issues_count", existing_item.open_issues))
                live_pushed_at = gh_repo.get("pushed_at") or existing_item.pushed_at

                existing_item.stars = live_stars
                existing_item.forks = live_forks
                existing_item.open_issues = live_issues
                existing_item.pushed_at = live_pushed_at

                # Recalculate popularity score and final score with fresh live stats
                live_pop_score = self.normalize_popularity(live_stars, live_forks)
                existing_item.scores.popularity_score = live_pop_score
                existing_item.scores.final_score = round(
                    strategy_instance.calculate_score(
                        semantic_score=existing_item.scores.semantic_score,
                        popularity_score=live_pop_score,
                        popularity_weight=request.popularity_weight,
                    ),
                    4,
                )
                continue

            if name_lower in seen_new_names:
                continue
            seen_new_names.add(name_lower)

            license_val = (
                (gh_repo.get("license") or {}).get("spdx_id")
                if isinstance(gh_repo.get("license"), dict)
                else None
            )
            topics_val = list(gh_repo.get("topics") or [])
            new_github_repos.append(
                RepoIngestItem(
                    repo_id=int(gh_repo["id"]),
                    full_name=full_name,
                    html_url=str(gh_repo.get("html_url", "")),
                    description=gh_repo.get("description"),
                    language=gh_repo.get("language"),
                    stars=int(gh_repo.get("stargazers_count", 0)),
                    forks=int(gh_repo.get("forks_count", 0)),
                    open_issues=int(gh_repo.get("open_issues_count", 0)),
                    license=license_val,
                    topics=topics_val,
                    pushed_at=gh_repo.get("pushed_at"),
                )
            )

        # --- In-Flight Micro-Embedding for New Discovered Candidates ---
        new_embeddings: list[list[float]] = []
        if new_github_repos:
            try:
                representation_texts = [
                    EmbeddingService.build_repo_representation(item)
                    for item in new_github_repos
                ]
                new_embeddings = await self.embedder.embed_texts(representation_texts)
            except Exception as exc:
                logger.warning("In-flight embedding for discovered repositories failed: %s", exc)
                new_embeddings = []

        new_discovered_ingest: list[RepoIngestItem] = []
        for idx, ingest_item in enumerate(new_github_repos):
            stars = ingest_item.stars
            forks = ingest_item.forks

            # Calculate true cosine similarity if vectors are available; fallback to 0.85 safely
            if (
                query_vector
                and idx < len(new_embeddings)
                and new_embeddings[idx]
            ):
                semantic_score = self.compute_cosine_similarity(
                    query_vector, new_embeddings[idx]
                )
            else:
                semantic_score = 0.85

            popularity_score = self.normalize_popularity(stars, forks)
            final_score = round(
                strategy_instance.calculate_score(
                    semantic_score=semantic_score,
                    popularity_score=popularity_score,
                    popularity_weight=request.popularity_weight,
                ),
                4,
            )

            live_item = RepoItem(
                repo_id=ingest_item.repo_id,
                full_name=ingest_item.full_name,
                html_url=ingest_item.html_url,
                description=ingest_item.description,
                language=ingest_item.language,
                stars=stars,
                forks=forks,
                open_issues=ingest_item.open_issues,
                license=ingest_item.license,
                topics=ingest_item.topics,
                pushed_at=ingest_item.pushed_at,
                scores=RepoScoreBreakdown(
                    semantic_score=semantic_score,
                    popularity_score=popularity_score,
                    final_score=final_score,
                    strategy=strategy_instance.name,
                ),
            )
            scored_items.append(live_item)
            new_discovered_ingest.append(ingest_item)

        # Schedule background ingestion for discovered candidates with precomputed embeddings
        if new_discovered_ingest and background_tasks is not None:
            background_tasks.add_task(
                self._safe_background_ingest,
                new_discovered_ingest,
                new_embeddings if len(new_embeddings) == len(new_discovered_ingest) else None,
            )

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
            search_mode=search_mode,
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

