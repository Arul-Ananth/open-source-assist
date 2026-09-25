"""Scoring strategies for ranking open-source repositories.

This module uses the Strategy pattern to decouple repository ranking logic
from vector retrieval. New scoring heuristics can be added by implementing
the ScoringStrategy abstract base class.
"""

from abc import ABC, abstractmethod


class ScoringStrategy(ABC):
    """Abstract base class for repository ranking scoring strategies."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Return the unique name of the scoring strategy."""

    @abstractmethod
    def calculate_score(
        self,
        semantic_score: float,
        popularity_score: float,
        popularity_weight: float,
    ) -> float:
        """Calculate the blended final ranking score.

        Args:
            semantic_score: Cosine similarity score in range [0.0, 1.0].
            popularity_score: Normalized popularity metric in range [0.0, 1.0].
            popularity_weight: User preference weight in range [0.0, 1.0].

        Returns:
            Calculated final ranking score.
        """


class MultiplicativeGateStrategy(ScoringStrategy):
    """Multiplicative Gate scoring strategy.

    Formula: FinalScore = SemanticScore * (1.0 + Weight * PopularityScore)

    Semantic relevance acts as a gatekeeper: repositories with low semantic
    similarity cannot achieve a high score regardless of how popular they are.
    However, among semantically relevant candidates, proven and widely adopted
    projects receive a proportional boost.
    """

    @property
    def name(self) -> str:
        return "MultiplicativeGateStrategy"

    def calculate_score(
        self,
        semantic_score: float,
        popularity_score: float,
        popularity_weight: float,
    ) -> float:
        # Clamp inputs to valid ranges
        s = max(0.0, min(1.0, semantic_score))
        p = max(0.0, min(1.0, popularity_score))
        w = max(0.0, min(1.0, popularity_weight))
        return s * (1.0 + w * p)


class LinearHybridStrategy(ScoringStrategy):
    """Linear Hybrid scoring strategy.

    Formula: FinalScore = (1.0 - Weight) * SemanticScore + Weight * PopularityScore

    Computes a linear convex combination between semantic similarity and normalized
    popularity. Useful when user wants pure popularity dominance at weight = 1.0.
    """

    @property
    def name(self) -> str:
        return "LinearHybridStrategy"

    def calculate_score(
        self,
        semantic_score: float,
        popularity_score: float,
        popularity_weight: float,
    ) -> float:
        s = max(0.0, min(1.0, semantic_score))
        p = max(0.0, min(1.0, popularity_score))
        w = max(0.0, min(1.0, popularity_weight))
        return (1.0 - w) * s + w * p


STRATEGY_REGISTRY: dict[str, type[ScoringStrategy]] = {
    "multiplicative_gate": MultiplicativeGateStrategy,
    "linear_hybrid": LinearHybridStrategy,
}


def get_scoring_strategy(name: str = "multiplicative_gate") -> ScoringStrategy:
    """Factory function to resolve a scoring strategy instance by name.

    Args:
        name: Strategy identifier ('multiplicative_gate' or 'linear_hybrid').

    Returns:
        Instantiated ScoringStrategy.
    """
    strategy_class = STRATEGY_REGISTRY.get(name.lower(), MultiplicativeGateStrategy)
    return strategy_class()

