"""Pydantic schemas for Skill Assessment generation, evaluation, and user_context synthesis."""

from enum import Enum
from pydantic import BaseModel, Field
from backend.schemas.learning import SkillLevel


class AssessmentQuestionType(str, Enum):
    """Types of assessment questions."""

    MCQ = "mcq"
    SUBJECTIVE = "subjective"


class MCQOption(BaseModel):
    """Individual option for a Multiple Choice Question (MCQ)."""

    option_id: str = Field(
        ...,
        description="Option identifier (e.g., 'A', 'B', 'C', 'D').",
    )
    option_text: str = Field(
        ...,
        description="Text content of the option choice.",
    )


class GitHubProjectContext(BaseModel):
    """Context of a user's GitHub repository for project-grounded question generation."""

    repo_name: str = Field(
        ...,
        description="Name of the GitHub repository (e.g., 'fastapi-microservices').",
    )
    description: str | None = Field(
        default=None,
        description="Repository description or summary.",
    )
    primary_language: str | None = Field(
        default=None,
        description="Primary programming language (e.g., 'Python', 'TypeScript').",
    )
    topics: list[str] = Field(
        default_factory=list,
        description="Topic tags associated with the repository.",
    )
    readme_summary: str | None = Field(
        default=None,
        description="Key summary excerpt from the repository README.",
    )


class AssessmentQuestion(BaseModel):
    """Dynamic question generated for skill assessment, grounded in project context."""

    question_id: str = Field(
        ...,
        description="Unique identifier for the question (e.g., 'q1').",
    )
    question_type: AssessmentQuestionType = Field(
        ...,
        description="Question type: 'mcq' (Multiple Choice) or 'subjective' (Open-Ended).",
    )
    question_text: str = Field(
        ...,
        description="Question text grounded in the user's GitHub project stack or architecture.",
    )
    related_project: str | None = Field(
        default=None,
        description="Name of the user's GitHub project that inspired this question.",
    )
    options: list[MCQOption] | None = Field(
        default=None,
        description="List of choices if question_type is 'mcq'.",
    )
    skill_domain: str = Field(
        ...,
        description="Target skill domain (e.g., 'Async I/O', 'REST Architecture', 'State Management').",
    )
    difficulty: SkillLevel = Field(
        default=SkillLevel.INTERMEDIATE,
        description="Calibrated difficulty level of the question.",
    )


class GenerateAssessmentRequest(BaseModel):
    """Request payload for dynamically generating a GitHub-contextualized skill assessment."""

    github_username: str | None = Field(
        default=None,
        description="Optional user GitHub username to auto-fetch public repository metadata.",
    )
    projects: list[GitHubProjectContext] | None = Field(
        default=None,
        description="Optional list of explicit GitHub project contexts.",
    )
    num_mcqs: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Number of Multiple Choice Questions to generate.",
    )
    num_subjective: int = Field(
        default=2,
        ge=1,
        le=5,
        description="Number of Subjective / Open-ended Questions to generate.",
    )


class StructuredQuestionGenOutput(BaseModel):
    """Internal Pydantic model for enforcing LLM structured output during question generation."""

    questions: list[AssessmentQuestion] = Field(
        ...,
        description="List of dynamically generated MCQ and subjective questions.",
    )


class GenerateAssessmentResponse(BaseModel):
    """Response payload containing generated assessment questions."""

    assessment_id: str = Field(
        ...,
        description="Unique assessment session identifier.",
    )
    github_username: str | None = Field(
        default=None,
        description="GitHub username associated with the assessment context.",
    )
    questions: list[AssessmentQuestion] = Field(
        default_factory=list,
        description="Generated MCQ and Subjective questions.",
    )
    generated_at: str = Field(
        ...,
        description="ISO timestamp of question generation.",
    )


class QuestionAnswerSubmission(BaseModel):
    """User response submission for a single assessment question."""

    question_id: str = Field(
        ...,
        description="Identifier of the question being answered.",
    )
    question_type: AssessmentQuestionType = Field(
        ...,
        description="Question type ('mcq' or 'subjective').",
    )
    user_answer: str = Field(
        ...,
        description="User's submitted answer ('A'/'B'/'C'/'D' for MCQ, or text for Subjective).",
    )


class EvaluateAssessmentRequest(BaseModel):
    """Request payload for evaluating an assessment submission and synthesizing user_context."""

    assessment_id: str = Field(
        ...,
        description="Identifier of the assessment session.",
    )
    github_username: str | None = Field(
        default=None,
        description="Optional GitHub username associated with the user.",
    )
    answers: list[QuestionAnswerSubmission] = Field(
        ...,
        description="User's submitted answers to the assessment questions.",
    )
    questions: list[AssessmentQuestion] | None = Field(
        default=None,
        description="Optional list of original questions for context.",
    )


class QuestionEvaluationResult(BaseModel):
    """Evaluation result for an individual assessment question."""

    question_id: str = Field(
        ...,
        description="Target question ID.",
    )
    question_type: AssessmentQuestionType = Field(
        ...,
        description="Question type ('mcq' or 'subjective').",
    )
    score_pct: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Percentage score achieved for this question (0.0 to 100.0).",
    )
    feedback: str = Field(
        ...,
        description="Detailed evaluation feedback and explanation.",
    )
    correct_answer_summary: str = Field(
        ...,
        description="Key takeaways or model answer breakdown.",
    )


class StructuredEvaluationOutput(BaseModel):
    """Internal Pydantic model for enforcing LLM structured output during evaluation and context synthesis."""

    overall_score_pct: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Overall percentage score across all questions.",
    )
    assessed_skill_level: SkillLevel = Field(
        ...,
        description="Overall assessed skill level ('beginner', 'intermediate', 'advanced').",
    )
    generated_user_context: str = Field(
        ...,
        description=(
            "Concise, high-value summary line describing the user's technical background, "
            "strengths, and skill level to be persisted in the User table for app personalization."
        ),
    )
    evaluations: list[QuestionEvaluationResult] = Field(
        ...,
        description="Detailed evaluations for each submitted question.",
    )


class EvaluateAssessmentResponse(BaseModel):
    """API Response payload returned after assessment evaluation and user context update."""

    assessment_id: str = Field(
        ...,
        description="Assessment session identifier.",
    )
    overall_score_pct: float = Field(
        ...,
        description="Overall score percentage.",
    )
    assessed_skill_level: SkillLevel = Field(
        ...,
        description="Assessed skill level.",
    )
    generated_user_context: str = Field(
        ...,
        description="Synthesized user_context string persisted to the database.",
    )
    evaluations: list[QuestionEvaluationResult] = Field(
        default_factory=list,
        description="Question evaluation breakdowns.",
    )
    user_updated: bool = Field(
        ...,
        description="Flag indicating whether the User database record was updated with user_context.",
    )
    duration_ms: float = Field(
        ...,
        description="Processing duration in milliseconds.",
    )
    model_used: str = Field(
        ...,
        description="Identifier of the LLM model used.",
    )
