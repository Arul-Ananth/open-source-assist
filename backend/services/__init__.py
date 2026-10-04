"""Services package exports."""

from backend.services.embedding_service import EmbeddingService, embedding_service
from backend.services.qdrant_service import QdrantService, qdrant_service
from backend.services.scoring_strategy import (
    LinearHybridStrategy,
    MultiplicativeGateStrategy,
    ScoringStrategy,
    get_scoring_strategy,
)
from backend.services.search_service import SearchService, search_service
from backend.services.learning_agent import LearningAgentService, learning_agent_service
from backend.services.chatbot_agent import ChatbotAgentService, chatbot_agent_service
from backend.services.github_client import GitHubClient, GitHubAPIError
from backend.services import github_sync_service
from backend.services import project_service
from backend.services import contributor_service
from backend.services import event_service
from backend.services import user_service
from backend.services import otp_service
from backend.services import mail_service
from backend.services import roadmap_service

__all__ = [
    "EmbeddingService",
    "LinearHybridStrategy",
    "MultiplicativeGateStrategy",
    "QdrantService",
    "ScoringStrategy",
    "SearchService",
    "embedding_service",
    "get_scoring_strategy",
    "qdrant_service",
    "search_service",
    "LearningAgentService",
    "learning_agent_service",
    "ChatbotAgentService",
    "chatbot_agent_service",
    "GitHubClient",
    "GitHubAPIError",
    "github_sync_service",
    "project_service",
    "contributor_service",
    "event_service",
    "user_service",
    "otp_service",
    "mail_service",
    "roadmap_service",
]
