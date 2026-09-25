"""Embedding service for generating dense vector representations.

Uses FastEmbed (ONNX Runtime) to generate high-efficiency 384-dimensional
vector embeddings locally without requiring an external GPU or external API keys.
"""

import asyncio
from collections.abc import Sequence

from fastembed import TextEmbedding

from backend.core.config import settings
from backend.schemas.ingest import RepoIngestItem


class EmbeddingService:
    """Service for computing dense text embeddings asynchronously."""

    def __init__(self, model_name: str | None = None) -> None:
        self._model_name = model_name or settings.EMBEDDING_MODEL_NAME
        self._model: TextEmbedding | None = None

    def _get_model(self) -> TextEmbedding:
        """Lazy-load the FastEmbed model singleton."""
        if self._model is None:
            self._model = TextEmbedding(model_name=self._model_name)
        return self._model

    def _embed_sync(self, texts: Sequence[str]) -> list[list[float]]:
        """Synchronous embedding computation inside thread worker."""
        model = self._get_model()
        # fastembed returns an iterator of numpy ndarrays
        embeddings_iter = model.embed(texts)
        return [arr.tolist() for arr in embeddings_iter]

    async def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        """Generate dense embeddings for a list of texts asynchronously.

        Args:
            texts: Sequence of string documents to embed.

        Returns:
            List of float vectors, each of dimension matching the model (e.g. 384).
        """
        if not texts:
            return []
        return await asyncio.to_thread(self._embed_sync, texts)

    async def embed_query(self, query: str) -> list[float]:
        """Generate dense embedding for a single search query.

        Args:
            query: Natural language query string.

        Returns:
            Float vector embedding.
        """
        results = await self.embed_texts([query])
        return results[0]

    @staticmethod
    def build_repo_representation(repo: RepoIngestItem) -> str:
        """Construct a structured semantic document from repository metadata.

        Synthesizes repository name, language, topics, description, and
        optional readme summary for optimal vector space placement.

        Args:
            repo: Ingestion item containing repository metadata.

        Returns:
            Unified text representation.
        """
        parts: list[str] = [f"Repository: {repo.full_name}"]
        if repo.language:
            parts.append(f"Language: {repo.language}")
        if repo.topics:
            parts.append(f"Topics: {', '.join(repo.topics)}")
        if repo.description:
            parts.append(f"Description: {repo.description}")
        if repo.readme_summary:
            parts.append(f"Summary: {repo.readme_summary}")
        return " | ".join(parts)


# Module singleton instance
embedding_service = EmbeddingService()

