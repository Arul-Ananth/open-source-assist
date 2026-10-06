"""Skill Assessment service managing question generation, evaluation, and user_context synthesis."""

import time
import uuid
import logging
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.config import settings
from backend.models.user_model import User
from backend.schemas.learning import SkillLevel
from backend.schemas.assessment import (
    AssessmentQuestionType,
    MCQOption,
    GitHubProjectContext,
    AssessmentQuestion,
    GenerateAssessmentRequest,
    GenerateAssessmentResponse,
    StructuredQuestionGenOutput,
    EvaluateAssessmentRequest,
    QuestionEvaluationResult,
    StructuredEvaluationOutput,
    EvaluateAssessmentResponse,
)
from backend.services.github_service import github_service

logger = logging.getLogger(__name__)


def _build_fallback_questions(
    projects: list[GitHubProjectContext],
    num_mcqs: int,
    num_subjective: int,
) -> list[AssessmentQuestion]:
    """Generates structured fallback assessment questions grounded in project context."""
    questions: list[AssessmentQuestion] = []
    
    # 1. Generate MCQ questions grounded in GitHub projects
    for i in range(num_mcqs):
        proj = projects[i % len(projects)] if projects else GitHubProjectContext(repo_name="general-dev", primary_language="Python")
        q_id = f"mcq_{i + 1}"
        questions.append(
            AssessmentQuestion(
                question_id=q_id,
                question_type=AssessmentQuestionType.MCQ,
                question_text=f"In your project '{proj.repo_name}' ({proj.primary_language or 'Python'}), what is the primary benefit of modular separation and async I/O?",
                related_project=proj.repo_name,
                options=[
                    MCQOption(option_id="A", option_text="Improves non-blocking concurrency and response throughput."),
                    MCQOption(option_id="B", option_text="Eliminates the need for automated unit tests."),
                    MCQOption(option_id="C", option_text="Forces all database transactions to run synchronously."),
                    MCQOption(option_id="D", option_text="Increases memory usage linearly with each request."),
                ],
                skill_domain=f"{proj.primary_language or 'Software'} Architecture",
                difficulty=SkillLevel.INTERMEDIATE,
            )
        )

    # 2. Generate Subjective questions grounded in GitHub projects
    for j in range(num_subjective):
        proj = projects[j % len(projects)] if projects else GitHubProjectContext(repo_name="general-dev", primary_language="Python")
        q_id = f"subj_{j + 1}"
        questions.append(
            AssessmentQuestion(
                question_id=q_id,
                question_type=AssessmentQuestionType.SUBJECTIVE,
                question_text=f"For your repository '{proj.repo_name}', describe how you handle error boundaries, structured logging, and production deployment configuration.",
                related_project=proj.repo_name,
                options=None,
                skill_domain="Production Engineering & Error Handling",
                difficulty=SkillLevel.INTERMEDIATE,
            )
        )

    return questions


def _build_fallback_evaluation(
    request: EvaluateAssessmentRequest,
) -> StructuredEvaluationOutput:
    """Generates fallback evaluation and user_context string when LiteLLM is unconfigured."""
    evaluations: list[QuestionEvaluationResult] = []
    total_score = 0.0

    for idx, ans in enumerate(request.answers):
        is_mcq = ans.question_type == AssessmentQuestionType.MCQ
        # Check MCQ selection ("A" is correct in fallback options)
        if is_mcq:
            score = 100.0 if ans.user_answer.strip().upper() == "A" else 0.0
            feedback = "Correct selection! Non-blocking async I/O prevents event loop starvation." if score == 100.0 else "Incorrect choice. Option A represents the primary architectural benefit."
            correct_summary = "Option A: Improves non-blocking concurrency and response throughput."
        else:
            score = 85.0 if len(ans.user_answer.strip()) > 15 else 50.0
            feedback = "Good explanation of error boundaries and production setup." if score == 85.0 else "Answer is brief; consider detailing exception handlers and environment secrets."
            correct_summary = "A solid answer covers exception isolation, environment variable configuration, and automated CI/CD deployment."

        total_score += score
        evaluations.append(
            QuestionEvaluationResult(
                question_id=ans.question_id,
                question_type=ans.question_type,
                score_pct=score,
                feedback=feedback,
                correct_answer_summary=correct_summary,
            )
        )

    overall_score = round(total_score / len(request.answers), 1) if request.answers else 75.0
    assessed_level = SkillLevel.BEGINNER if overall_score < 60.0 else SkillLevel.INTERMEDIATE if overall_score < 85.0 else SkillLevel.ADVANCED
    
    generated_context = (
        f"{assessed_level.value.capitalize()} developer with experience in project architecture, "
        f"scored {overall_score}% on skill assessment demonstrating proficiency in async processing and error handling."
    )

    return StructuredEvaluationOutput(
        overall_score_pct=overall_score,
        assessed_skill_level=assessed_level,
        generated_user_context=generated_context,
        evaluations=evaluations,
    )


class AssessmentService:
    """Service facade for generating GitHub-grounded skill assessments and evaluating user context."""

    async def generate_assessment(
        self,
        request: GenerateAssessmentRequest,
        current_user: dict[str, Any] | None = None,
    ) -> GenerateAssessmentResponse:
        """Generates dynamic MCQ and subjective assessment questions grounded in user's GitHub projects."""
        username = request.github_username or (current_user.get("username") if current_user else None)
        projects = request.projects or []

        if not projects and username:
            fetched = await github_service.fetch_user_repositories(username, limit=5)
            if fetched:
                projects = fetched

        questions: list[AssessmentQuestion] = []

        if settings.GEMINI_API_KEY:
            try:
                import litellm

                model_identifier = (
                    settings.GEMINI_MODEL
                    if settings.GEMINI_MODEL.startswith("gemini/")
                    else f"gemini/{settings.GEMINI_MODEL}"
                )

                prompt_system = (
                    "You are an expert AI software engineering assessor and technical interviewer. "
                    "Your mission is to generate dynamic skill assessment questions for a developer. "
                    "You MUST generate BOTH Multiple Choice Questions (MCQs) and Subjective / Open-ended Questions. "
                    "All questions MUST be grounded in the user's GitHub repository projects and tech stack."
                )

                proj_summary = [
                    f"- {p.repo_name} ({p.primary_language or 'General'}): {p.description or 'No desc'}"
                    for p in projects
                ] if projects else ["General open-source development stack"]

                prompt_user = (
                    f"GitHub Username: {username or 'Guest'}\n"
                    f"User Repositories:\n" + "\n".join(proj_summary) + "\n\n"
                    f"Generate exactly {request.num_mcqs} MCQ questions (with 4 options 'A','B','C','D') "
                    f"and {request.num_subjective} Subjective open-ended questions grounded in these projects."
                )

                response = await litellm.acompletion(
                    model=model_identifier,
                    api_key=settings.GEMINI_API_KEY,
                    response_format=StructuredQuestionGenOutput,
                    messages=[
                        {"role": "system", "content": prompt_system},
                        {"role": "user", "content": prompt_user},
                    ],
                    temperature=0.3,
                )

                if response and response.choices:
                    msg = response.choices[0].message
                    parsed_output = msg.parsed if hasattr(msg, "parsed") and msg.parsed else StructuredQuestionGenOutput.model_validate_json(msg.content)
                    if parsed_output and parsed_output.questions:
                        # Validate that generated MCQs have at least 4 options
                        is_valid = True
                        for q in parsed_output.questions:
                            if q.question_type == AssessmentQuestionType.MCQ:
                                if not q.options or len(q.options) < 4:
                                    is_valid = False
                                    break
                        if is_valid:
                            questions = parsed_output.questions
                        else:
                            logger.warning("LiteLLM returned MCQ with < 4 options, using fallback questions")
            except Exception as exc:
                logger.warning("LiteLLM question generation failed, using fallback generator: %s", exc)

        if not questions:
            questions = _build_fallback_questions(
                projects=projects,
                num_mcqs=request.num_mcqs,
                num_subjective=request.num_subjective,
            )

        return GenerateAssessmentResponse(
            assessment_id=f"assess_{uuid.uuid4().hex[:12]}",
            github_username=username,
            questions=questions,
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

    async def evaluate_assessment(
        self,
        request: EvaluateAssessmentRequest,
        db: AsyncSession,
        current_user: dict[str, Any] | None = None,
    ) -> EvaluateAssessmentResponse:
        """Evaluates assessment answers, synthesizes a user_context string, and updates the User record in database."""
        start_time = time.perf_counter()
        output: StructuredEvaluationOutput | None = None

        if settings.GEMINI_API_KEY:
            try:
                import litellm

                model_identifier = (
                    settings.GEMINI_MODEL
                    if settings.GEMINI_MODEL.startswith("gemini/")
                    else f"gemini/{settings.GEMINI_MODEL}"
                )

                prompt_system = (
                    "You are an expert technical evaluator. Evaluate the submitted MCQ and Subjective assessment answers. "
                    "Calculate an overall score percentage (0-100), determine the assessed skill level (beginner, intermediate, advanced), "
                    "and synthesize a single concise, high-value 'generated_user_context' line summarizing the user's technical background and strengths."
                )

                submissions_text = [
                    f"Question {ans.question_id} ({ans.question_type.value}): User Answer: '{ans.user_answer}'"
                    for ans in request.answers
                ]

                prompt_user = (
                    f"Assessment ID: {request.assessment_id}\n"
                    f"Submissions:\n" + "\n".join(submissions_text) + "\n\n"
                    "Evaluate each question and synthesize the user_context summary string."
                )

                response = await litellm.acompletion(
                    model=model_identifier,
                    api_key=settings.GEMINI_API_KEY,
                    response_format=StructuredEvaluationOutput,
                    messages=[
                        {"role": "system", "content": prompt_system},
                        {"role": "user", "content": prompt_user},
                    ],
                    temperature=0.2,
                )

                if response and response.choices:
                    msg = response.choices[0].message
                    parsed_output = msg.parsed if hasattr(msg, "parsed") and msg.parsed else StructuredEvaluationOutput.model_validate_json(msg.content)
                    if parsed_output:
                        output = parsed_output
            except Exception as exc:
                logger.warning("LiteLLM assessment evaluation failed, using fallback evaluator: %s", exc)

        if output is None:
            output = _build_fallback_evaluation(request)

        # Update User table with generated user_context & skill_level
        user_updated = False
        target_user_id = current_user.get("user_id") if current_user else None
        
        if target_user_id:
            try:
                u_uuid = uuid.UUID(target_user_id)
                user = await db.scalar(select(User).where(User.id == u_uuid))
                if user:
                    user.user_context = output.generated_user_context
                    user.skill_level = output.assessed_skill_level.value
                    if request.github_username:
                        user.github_username = request.github_username
                    await db.commit()
                    user_updated = True
            except Exception as exc:
                logger.error("Failed to update User database record with user_context: %s", exc)

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        model_name = settings.GEMINI_MODEL if settings.GEMINI_API_KEY else f"{settings.GEMINI_MODEL}-evaluator"

        return EvaluateAssessmentResponse(
            assessment_id=request.assessment_id,
            overall_score_pct=output.overall_score_pct,
            assessed_skill_level=output.assessed_skill_level,
            generated_user_context=output.generated_user_context,
            evaluations=output.evaluations,
            user_updated=user_updated,
            duration_ms=duration_ms,
            model_used=model_name,
        )


assessment_service = AssessmentService()
