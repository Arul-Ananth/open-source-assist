"""Pydantic schemas for Skill-Aware AI Chatbot request and response contracts."""

from pydantic import BaseModel, Field
from backend.schemas.learning import SkillLevel, CitedMaterial


class UserSkillProfile(BaseModel):
    """User technical skill profile and context for personalizing chatbot answers."""

    skill_level: SkillLevel = Field(
        default=SkillLevel.BEGINNER,
        description="User's technical proficiency level for the requested domain.",
    )
    tech_stack: list[str] = Field(
        default_factory=list,
        description="List of primary programming languages, frameworks, or tools the user is familiar with.",
    )
    experience_years: float | None = Field(
        default=None,
        ge=0.0,
        le=50.0,
        description="Optional years of software development experience.",
    )
    learning_goals: list[str] | None = Field(
        default=None,
        description="Optional specific learning objectives or target competencies.",
    )


class CodeSnippet(BaseModel):
    """Structured code example included in chatbot answers."""

    language: str = Field(
        ...,
        description="Programming language identifier (e.g., 'python', 'typescript', 'bash').",
    )
    code: str = Field(
        ...,
        description="Clean, executable code block tailored to the user's skill level.",
    )
    explanation: str = Field(
        ...,
        description="Line-by-line or concept explanation of the code snippet.",
    )


class ChatbotRequest(BaseModel):
    """Request payload for submitting a question to the skill-aware AI chatbot."""

    question: str = Field(
        ...,
        min_length=2,
        max_length=2000,
        description="Technical question or problem statement.",
    )
    skill_profile: UserSkillProfile = Field(
        default_factory=UserSkillProfile,
        description="User's skill context and profile to calibrate answer depth and complexity.",
    )


class StructuredChatbotOutput(BaseModel):
    """Internal Pydantic schema for enforcing structured outputs from LiteLLM/Gemini API."""

    answer: str = Field(
        ...,
        description="Clear, skill-calibrated answer addressing the user's question.",
    )
    code_snippets: list[CodeSnippet] = Field(
        default_factory=list,
        description="Practical code examples calibrated to the user's technical stack.",
    )
    cited_references: list[CitedMaterial] = Field(
        default_factory=list,
        description="Official documentation or learning resource citations.",
    )
    suggested_followups: list[str] = Field(
        default_factory=list,
        description="Recommended follow-up questions or deeper topic investigations.",
    )


class ChatbotResponse(BaseModel):
    """API Response payload returned by the skill-aware chatbot endpoint."""

    question: str = Field(
        ...,
        description="Original user question.",
    )
    skill_level_used: SkillLevel = Field(
        ...,
        description="Skill level used to calibrate explanation depth.",
    )
    answer: str = Field(
        ...,
        description="Comprehensive answer tailored to user skill context.",
    )
    code_snippets: list[CodeSnippet] = Field(
        default_factory=list,
        description="Code snippets tailored to user skill level.",
    )
    cited_references: list[CitedMaterial] = Field(
        default_factory=list,
        description="Citeable reference links matching the answer.",
    )
    suggested_followups: list[str] = Field(
        default_factory=list,
        description="Suggested follow-up questions.",
    )
    duration_ms: float = Field(
        ...,
        description="Processing duration in milliseconds.",
    )
    model_used: str = Field(
        ...,
        description="Identifier of the LLM model used.",
    )
