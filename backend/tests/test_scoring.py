"""Unit tests for scoring strategies and popularity normalization."""

import pytest

from backend.services.scoring_strategy import (
    LinearHybridStrategy,
    MultiplicativeGateStrategy,
    get_scoring_strategy,
)
from backend.services.search_service import SearchService


def test_multiplicative_gate_semantic_gating() -> None:
    """Verify that a zero semantic similarity yields zero final score regardless of popularity."""
    strategy = MultiplicativeGateStrategy()
    # Semantic score 0, popularity 1.0 (100k stars), maximum weight 1.0
    score = strategy.calculate_score(semantic_score=0.0, popularity_score=1.0, popularity_weight=1.0)
    assert score == 0.0


def test_multiplicative_gate_boost() -> None:
    """Verify that popularity amplifies score proportionally when semantic relevance is present."""
    strategy = MultiplicativeGateStrategy()
    semantic = 0.8
    # With weight 0, popularity has no impact
    score_no_weight = strategy.calculate_score(semantic_score=semantic, popularity_score=1.0, popularity_weight=0.0)
    assert pytest.approx(score_no_weight, rel=1e-3) == 0.8

    # With weight 0.5 and popularity 1.0, score = 0.8 * (1 + 0.5 * 1.0) = 1.2
    score_half_weight = strategy.calculate_score(semantic_score=semantic, popularity_score=1.0, popularity_weight=0.5)
    assert pytest.approx(score_half_weight, rel=1e-3) == 1.2

    # With weight 1.0 and popularity 1.0, score = 0.8 * (1 + 1.0 * 1.0) = 1.6
    score_full_weight = strategy.calculate_score(semantic_score=semantic, popularity_score=1.0, popularity_weight=1.0)
    assert pytest.approx(score_full_weight, rel=1e-3) == 1.6


def test_linear_hybrid_strategy() -> None:
    """Verify linear convex combination behavior."""
    strategy = LinearHybridStrategy()
    # Weight 0 -> pure semantic
    score_pure_semantic = strategy.calculate_score(semantic_score=0.7, popularity_score=0.9, popularity_weight=0.0)
    assert pytest.approx(score_pure_semantic, rel=1e-3) == 0.7

    # Weight 1 -> pure popularity
    score_pure_pop = strategy.calculate_score(semantic_score=0.7, popularity_score=0.9, popularity_weight=1.0)
    assert pytest.approx(score_pure_pop, rel=1e-3) == 0.9

    # Weight 0.5 -> 0.5 * 0.7 + 0.5 * 0.9 = 0.8
    score_half = strategy.calculate_score(semantic_score=0.7, popularity_score=0.9, popularity_weight=0.5)
    assert pytest.approx(score_half, rel=1e-3) == 0.8


def test_strategy_factory() -> None:
    """Verify that the factory resolves strategies correctly."""
    assert isinstance(get_scoring_strategy("multiplicative_gate"), MultiplicativeGateStrategy)
    assert isinstance(get_scoring_strategy("linear_hybrid"), LinearHybridStrategy)
    # Default fallback
    assert isinstance(get_scoring_strategy("unknown_strategy"), MultiplicativeGateStrategy)


def test_popularity_normalization_bounds() -> None:
    """Verify normalization limits and monotonic properties."""
    # 0 stars, 0 forks should normalize to 0.0
    assert SearchService.normalize_popularity(0, 0) == 0.0

    # Negative inputs should clamp to 0.0
    assert SearchService.normalize_popularity(-5, -10) == 0.0

    # Large values close to or above max anchors should be bounded by 1.0
    high_pop = SearchService.normalize_popularity(100_000, 20_000)
    assert pytest.approx(high_pop, abs=0.01) == 1.0

    mega_pop = SearchService.normalize_popularity(500_000, 100_000)
    assert mega_pop == 1.0

    # Monotonicity: higher stars with equal forks yields higher score
    score_10 = SearchService.normalize_popularity(10, 0)
    score_100 = SearchService.normalize_popularity(100, 0)
    score_1000 = SearchService.normalize_popularity(1000, 0)
    assert 0.0 < score_10 < score_100 < score_1000 <= 1.0

