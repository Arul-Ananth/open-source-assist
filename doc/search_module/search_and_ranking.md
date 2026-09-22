# Search & Popularity Ranking Engine

This document describes the mathematical formulation of our semantic search engine and how popularity is dynamically factored into ranking.

---

## 1. Vector Document Representation

To capture a repository's semantic capabilities, we synthesize repository metadata into a unified document representation:

$$\text{Representation} = \text{Full Name} \;\Vert\; \text{Language} \;\Vert\; \text{Topics} \;\Vert\; \text{Description} \;\Vert\; \text{README Summary}$$

* **Embedding Model**: `BAAI/bge-small-en-v1.5` running locally via FastEmbed (ONNX).
* **Vector Dimension**: 384 dimensions.
* **Metric**: **Cosine Similarity** ($S_{\text{semantic}} \in [0.0, 1.0]$).

```python
parts = [f"Repository: {repo.full_name}"]
if repo.language:
    parts.append(f"Language: {repo.language}")
if repo.topics:
    parts.append(f"Topics: {', '.join(repo.topics)}")
if repo.description:
    parts.append(f"Description: {repo.description}")
if repo.readme_summary:
    parts.append(f"Summary: {repo.readme_summary}")
document = " | ".join(parts)
```

---

## 2. The Power-Law Problem in Popularity

Repository stars and forks follow an extreme **Power-Law distribution**:
* Mega-repositories (e.g., `facebook/react`, `tiangolo/fastapi`) have 70,000 to 200,000+ stars.
* Good emerging or niche tools might have 50 to 500 stars.

If stars are applied linearly:
* A search for *"minimalist bash cron monitor"* would rank `facebook/react` above a 200-star bash project simply because React has 200,000 stars.
* Using raw stars would completely swamp semantic relevance.

---

## 3. Logarithmic Popularity Normalization

We normalize popularity smoothly into the range $[0.0, 1.0]$ using logarithmic scaling with anchor ceilings:

$$P_{\text{popularity}} = \min\left(1.0, \frac{\log_{10}(\text{stars} + 1) + 0.5 \cdot \log_{10}(\text{forks} + 1)}{\log_{10}(\text{max\_stars} + 1) + 0.5 \cdot \log_{10}(\text{max\_forks} + 1)}\right)$$

Where:
* $\text{max\_stars} = 100,000$
* $\text{max\_forks} = 20,000$
* Stars and forks are clamped to $\ge 0$ to handle negative or missing values.

### Normalization Scale Examples:
| Repository | Stars | Forks | Normalized $P$ |
| :--- | :--- | :--- | :--- |
| Brand new / niche repo | 0 | 0 | **0.00** |
| Early-stage project | 50 | 5 | **0.29** |
| Growing library | 1,000 | 100 | **0.56** |
| Established open source | 10,000 | 1,200 | **0.78** |
| Major industry standard | 80,000 | 6,500 | **0.95** |
| Mega-repo (100k+ stars) | 150,000 | 25,000 | **1.00** |

---

## 4. Scoring Strategies (Strategy Pattern)

Ranking logic is abstracted behind the `ScoringStrategy` base class, allowing the ranking algorithm to be swapped or parameterized without modifying retrieval code.

```python
class ScoringStrategy(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def calculate_score(
        self,
        semantic_score: float,
        popularity_score: float,
        popularity_weight: float,
    ) -> float: ...
```

### Strategy 1: Multiplicative Gate (Active Default)
$$\text{FinalScore} = S_{\text{semantic}} \times (1.0 + \alpha \cdot P_{\text{popularity}})$$

* $\alpha \in [0.0, 1.0]$ is the user-supplied `popularity_weight`.
* **Why this is the best production default**:
  * **Semantic Relevance is Mandatory (The Gate)**: If $S_{\text{semantic}} = 0$, then $\text{FinalScore} = 0$, even if a repository has 200,000 stars.
  * **Proportional Boost**: When two repositories both match the query semantically, the more battle-tested, popular repository is boosted to the top.

### Strategy 2: Linear Hybrid (Convex Combination)
$$\text{FinalScore} = (1.0 - \alpha) \cdot S_{\text{semantic}} + \alpha \cdot P_{\text{popularity}}$$

* Available when users explicitly want popularity to dominate the search regardless of semantic match quality (e.g., discovering the most popular repositories within a general topic tag).

---

## 5. Two-Stage Search Workflow

1. **Stage 1 (High-Recall Candidate Fetch)**:
   * Qdrant performs HNSW vector search with user-specified metadata filters (`language`, `min_stars`, `license`, `topic`).
   * Fetches top $K$ candidates ($K = 100$) in $< 5\text{ms}$.
2. **Stage 2 (In-Memory Dynamic Reranking)**:
   * Computes $P_{\text{popularity}}$ for each candidate.
   * Calculates $\text{FinalScore}$ using the active `ScoringStrategy`.
   * Sorts the candidates in descending order.
   * Applies pagination offsets and limits.
   * Returns complete score breakdowns (`semantic_score`, `popularity_score`, `final_score`).

