"""Skill-Aware AI Chatbot Agent using LangGraph and LiteLLM."""

import time
import logging
from typing import TypedDict, Any
from langgraph.graph import StateGraph, END
from backend.core.config import settings
from backend.schemas.learning import SkillLevel, MaterialType, CitedMaterial
from backend.schemas.chatbot import (
    UserSkillProfile,
    CodeSnippet,
    ChatbotRequest,
    StructuredChatbotOutput,
    ChatbotResponse,
)

logger = logging.getLogger(__name__)


class ChatbotAgentState(TypedDict):
    """Typed state representation for the Skill-Aware Chatbot LangGraph workflow."""

    question: str
    skill_profile: UserSkillProfile
    analysis: dict[str, Any] | None
    generated_response: StructuredChatbotOutput | None


async def analyze_skill_context_node(state: ChatbotAgentState) -> dict[str, Any]:
    """Node: Agent analyzes the user's skill context, experience, and tech stack to calibrate response depth."""
    question = state["question"]
    profile = state["skill_profile"]

    analysis = {
        "question": question,
        "skill_level": profile.skill_level.value,
        "tech_stack": profile.tech_stack,
        "experience_years": profile.experience_years,
        "learning_goals": profile.learning_goals,
        "explanation_strategy": (
            "Clear step-by-step introduction, simple analogies, explicit code comments, avoid dense jargon"
            if profile.skill_level == SkillLevel.BEGINNER
            else "Focus on practical design patterns, async I/O, error isolation, moderate code verbosity"
            if profile.skill_level == SkillLevel.INTERMEDIATE
            else "High-level architectural trade-offs, internal mechanics, performance bounds, concise production-ready code"
        ),
    }
    return {"analysis": analysis}


async def generate_answer_node(state: ChatbotAgentState) -> dict[str, Any]:
    """Node: Invoke Gemini model via LiteLLM with structured response schema."""
    question = state["question"]
    profile = state["skill_profile"]
    analysis = state.get("analysis", {})

    if not settings.GEMINI_API_KEY:
        raise ValueError(
            "GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your environment to use the AI chatbot."
        )

    try:
        import litellm

        model_identifier = (
            settings.GEMINI_MODEL
            if settings.GEMINI_MODEL.startswith("gemini/")
            else f"gemini/{settings.GEMINI_MODEL}"
        )

        prompt_system = (
            "You are an expert AI technical mentor and skill-aware developer chatbot. "
            "Your goal is to answer developer questions with precision, calibrating your explanation depth, "
            "code complexity, vocabulary, and examples strictly to the user's skill level and background profile. "
            f"Target User Skill Level: {profile.skill_level.value.upper()}.\n"
            f"Explanation Strategy: {analysis.get('explanation_strategy', 'Standard explanation')}.\n"
            "Always provide clear explanations, practical code snippets matching their tech stack, citeable official documentation references, "
            "and helpful follow-up questions."
        )

        prompt_user = (
            f"User Question: {question}\n\n"
            f"User Profile:\n"
            f"- Skill Level: {profile.skill_level.value}\n"
            f"- Tech Stack: {profile.tech_stack}\n"
            f"- Development Experience: {profile.experience_years or 'Not specified'} years\n"
            f"- Learning Goals: {profile.learning_goals or 'General knowledge'}\n\n"
            "Generate a skill-calibrated answer with code snippets, citeable references, and follow-up questions."
        )

        response = await litellm.acompletion(
            model=model_identifier,
            api_key=settings.GEMINI_API_KEY,
            response_format=StructuredChatbotOutput,
            messages=[
                {"role": "system", "content": prompt_system},
                {"role": "user", "content": prompt_user},
            ],
            temperature=0.3,
        )

        output: StructuredChatbotOutput | None = None
        if response and response.choices:
            message = response.choices[0].message
            if hasattr(message, "parsed") and message.parsed:
                output = message.parsed
            elif hasattr(message, "content") and message.content:
                output = StructuredChatbotOutput.model_validate_json(message.content)

        if output is None:
            raise RuntimeError("Failed to parse structured output response from LiteLLM.")

        return {"generated_response": output}
    except Exception as exc:
        logger.error("LiteLLM call to Gemini chatbot model failed: %s", exc)
        raise RuntimeError(f"Chatbot service error: {str(exc)}") from exc


def _build_chatbot_agent_graph() -> Any:
    """Build and compile the LangGraph StateGraph workflow for the skill-aware chatbot."""
    builder = StateGraph(ChatbotAgentState)
    builder.add_node("analyze_skill_context", analyze_skill_context_node)
    builder.add_node("generate_answer", generate_answer_node)

    builder.set_entry_point("analyze_skill_context")
    builder.add_edge("analyze_skill_context", "generate_answer")
    builder.add_edge("generate_answer", END)

    return builder.compile()


chatbot_agent_graph = _build_chatbot_agent_graph()


class ChatbotAgentService:
    """Service facade managing skill-aware chatbot Q&A workflows."""

    async def answer_question(self, request: ChatbotRequest) -> ChatbotResponse:
        """Executes the LangGraph agent workflow to answer user questions tailored to their skill profile."""
        start_time = time.perf_counter()

        initial_state: ChatbotAgentState = {
            "question": request.question,
            "skill_profile": request.skill_profile,
            "analysis": None,
            "generated_response": None,
        }

        final_state = await chatbot_agent_graph.ainvoke(initial_state)
        output: StructuredChatbotOutput = final_state["generated_response"]

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        model_name = settings.GEMINI_MODEL if settings.GEMINI_API_KEY else f"{settings.GEMINI_MODEL}-chatbot-generator"

        return ChatbotResponse(
            question=request.question,
            skill_level_used=request.skill_profile.skill_level,
            answer=output.answer,
            code_snippets=output.code_snippets,
            cited_references=output.cited_references,
            suggested_followups=output.suggested_followups,
            duration_ms=duration_ms,
            model_used=model_name,
        )


chatbot_agent_service = ChatbotAgentService()
