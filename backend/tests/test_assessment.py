"""Unit and integration tests for Skill Assessment & user_context synthesis."""

import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.schemas.learning import SkillLevel
from backend.schemas.assessment import (
    AssessmentQuestionType,
    GitHubProjectContext,
    GenerateAssessmentRequest,
    GenerateAssessmentResponse,
    QuestionAnswerSubmission,
    EvaluateAssessmentRequest,
    EvaluateAssessmentResponse,
)
from backend.services.assessment_service import assessment_service


@pytest.mark.asyncio
async def test_generate_assessment_schema_validation() -> None:
    """Test Pydantic schema validation for GenerateAssessmentRequest."""
    req = GenerateAssessmentRequest(
        github_username="octocat",
        projects=[
            GitHubProjectContext(
                repo_name="hello-world",
                description="Simple sample repo",
                primary_language="Python",
                topics=["sample", "demo"],
            )
        ],
        num_mcqs=2,
        num_subjective=1,
    )
    assert req.github_username == "octocat"
    assert req.num_mcqs == 2
    assert req.num_subjective == 1
    assert len(req.projects) == 1


@pytest.mark.asyncio
async def test_assessment_service_question_generation() -> None:
    """Test dynamic question generation producing both MCQ and Subjective questions."""
    req = GenerateAssessmentRequest(
        github_username="testuser",
        projects=[
            GitHubProjectContext(
                repo_name="async-service",
                description="FastAPI Microservice",
                primary_language="Python",
            )
        ],
        num_mcqs=2,
        num_subjective=2,
    )
    res = await assessment_service.generate_assessment(req)

    assert isinstance(res, GenerateAssessmentResponse)
    assert res.assessment_id.startswith("assess_")
    assert len(res.questions) == 4

    mcqs = [q for q in res.questions if q.question_type == AssessmentQuestionType.MCQ]
    subjectives = [q for q in res.questions if q.question_type == AssessmentQuestionType.SUBJECTIVE]

    assert len(mcqs) == 2
    assert len(subjectives) == 2
    assert mcqs[0].options is not None
    assert len(mcqs[0].options) == 4


@pytest.mark.asyncio
async def test_assessment_service_evaluation_and_context_synthesis() -> None:
    """Test assessment evaluation producing overall score and synthesized user_context string."""
    eval_req = EvaluateAssessmentRequest(
        assessment_id="assess_12345",
        github_username="testuser",
        answers=[
            QuestionAnswerSubmission(
                question_id="mcq_1",
                question_type=AssessmentQuestionType.MCQ,
                user_answer="A",
            ),
            QuestionAnswerSubmission(
                question_id="subj_1",
                question_type=AssessmentQuestionType.SUBJECTIVE,
                user_answer="We isolate exception boundaries using custom middleware and environment variables for secrets.",
            ),
        ],
    )
    # Pass db as None (fallback evaluation mode without DB update)
    res = await assessment_service.evaluate_assessment(eval_req, db=None)

    assert isinstance(res, EvaluateAssessmentResponse)
    assert res.overall_score_pct > 0.0
    assert isinstance(res.assessed_skill_level, SkillLevel)
    assert res.generated_user_context
    assert len(res.evaluations) == 2


@pytest.mark.asyncio
async def test_assessment_api_generate_endpoint() -> None:
    """Test POST /api/v1/assessment/generate endpoint integration."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "github_username": "demo-dev",
            "num_mcqs": 2,
            "num_subjective": 1,
        }
        response = await ac.post("/api/v1/assessment/generate", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "assessment_id" in data
    assert isinstance(data["questions"], list)
    assert len(data["questions"]) == 3


@pytest.mark.asyncio
async def test_assessment_api_evaluate_endpoint() -> None:
    """Test POST /api/v1/assessment/evaluate endpoint integration."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "assessment_id": "assess_test99",
            "github_username": "demo-dev",
            "answers": [
                {
                    "question_id": "mcq_1",
                    "question_type": "mcq",
                    "user_answer": "A",
                },
                {
                    "question_id": "subj_1",
                    "question_type": "subjective",
                    "user_answer": "Implemented clean async architecture with Docker deployment.",
                },
            ],
        }
        response = await ac.post("/api/v1/assessment/evaluate", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "overall_score_pct" in data
    assert "assessed_skill_level" in data
    assert "generated_user_context" in data
    assert isinstance(data["evaluations"], list)
