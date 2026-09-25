"""Pydantic schemas for Online Learning Materials Generator & Citation Agent."""

from enum import Enum
from pydantic import BaseModel, Field


class SkillLevel(str, Enum):
    """Supported skill levels for learning material personalization."""

    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class MaterialType(str, Enum):
    """Categorization of citeable learning materials."""

    OFFICIAL_DOCS = "official_docs"
    TUTORIAL = "tutorial"
    ARTICLE = "article"
    GITHUB_REPO = "github_repo"
    INTERACTIVE_COURSE = "interactive_course"


class CitedMaterial(BaseModel):
    """Individual citeable online learning resource or open-source reference."""

    title: str = Field(
        ...,
        description="Title of the citeable learning resource or repository.",
    )
    url: str = Field(
        ...,
        description="HTTP/HTTPS URL link to the official documentation, article, or source.",
    )
    material_type: MaterialType = Field(
        ...,
        description="Category of the learning resource.",
    )
    difficulty_level: SkillLevel = Field(
        ...,
        description="Target skill level suitable for this resource.",
    )
    snippet: str = Field(
        ...,
        description="Key summary excerpt, code pattern, or citation snippet.",
    )
    relevance_rationale: str = Field(
        ...,
        description="Explanation of why this resource fits the user's current skill level.",
    )
    topics: list[str] = Field(
        default_factory=list,
        description="Key technical topics covered by this resource.",
    )


class LearningModule(BaseModel):
    """Personalized step-by-step learning section tailored to user skill."""

    module_number: int = Field(
        ...,
        description="Sequential index of the learning step (1-based).",
    )
    title: str = Field(
        ...,
        description="Module title describing the core concept.",
    )
    description: str = Field(
        ...,
        description="Detailed explanation calibrated to the user's skill level.",
    )
    key_takeaways: list[str] = Field(
        default_factory=list,
        description="Core takeaways, best practices, or practical exercises.",
    )
    cited_material_urls: list[str] = Field(
        default_factory=list,
        description="List of material URLs cited within this module.",
    )


class LearningMaterialRequest(BaseModel):
    """Request payload for generating skill-tailored learning materials with citations."""

    topic: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="Target technical subject or framework (e.g. 'FastAPI Async Microservices').",
    )
    skill_level: SkillLevel = Field(
        default=SkillLevel.BEGINNER,
        description="User's current skill level for personalized content depth.",
    )
    user_context: str | None = Field(
        default=None,
        description="Optional user background, prior knowledge, or specific goals.",
    )
    preferred_types: list[MaterialType] | None = Field(
        default=None,
        description="Optional list of preferred material types (e.g. ['official_docs', 'github_repo']).",
    )
    limit: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Maximum number of citeable learning resources to retrieve.",
    )


class StructuredAgentOutput(BaseModel):
    """Internal Pydantic schema for enforcing structured outputs from Gemini API."""

    summary: str = Field(
        ...,
        description="High-level overview of the learning path customized to the skill level.",
    )
    modules: list[LearningModule] = Field(
        ...,
        description="Ordered breakdown of learning modules matching the target skill level.",
    )
    materials: list[CitedMaterial] = Field(
        ...,
        description="List of citeable online resources and open-source references.",
    )


class LearningMaterialResponse(BaseModel):
    """API Response payload containing personalized learning roadmap and citations."""

    topic: str = Field(
        ...,
        description="Subject topic requested.",
    )
    skill_level: SkillLevel = Field(
        ...,
        description="Skill level used for content adaptation.",
    )
    summary: str = Field(
        ...,
        description="Comprehensive personalized learning path overview.",
    )
    modules: list[LearningModule] = Field(
        default_factory=list,
        description="Personalized step-by-step learning modules.",
    )
    cited_materials: list[CitedMaterial] = Field(
        default_factory=list,
        description="Cited online materials and repository sources.",
    )
    duration_ms: float = Field(
        ...,
        description="Processing duration in milliseconds.",
    )
    model_used: str = Field(
        ...,
        description="Identifier of the Gemini LLM model used.",
    )
