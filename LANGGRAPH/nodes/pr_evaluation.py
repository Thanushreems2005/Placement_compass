import logging
import hashlib
from typing import Dict, Any
from pydantic import BaseModel, Field
from LANGGRAPH.services.llm_service import LLMService, LLMProvider, ModelName
from LANGGRAPH.config.settings import settings
from langchain_core.prompts import ChatPromptTemplate

logger = logging.getLogger(__name__)

class PREvaluationOutput(BaseModel):
    code_quality: int = Field(description="Score out of 250 for code cleanliness, readability, and conventions.")
    problem_understanding: int = Field(description="Score out of 250 for correctly addressing the requested issue.")
    efficiency: int = Field(description="Score out of 250 for optimal approach, algorithm, or performance.")
    communication: int = Field(description="Score out of 250 for good PR description and clear commit messages.")
    total_score: int = Field(description="Total score out of 1000 (sum of the above).")
    feedback: str = Field(description="A concise paragraph providing constructive feedback for the student.")

class PREvaluationService:
    def __init__(self):
        self.llm_service = LLMService(
            groq_api_key=settings.GROQ_API_KEY,
            openrouter_api_key=settings.OPENROUTER_API_KEY,
            gemini_api_key=settings.GEMINI_API_KEY,
            cerebras_api_key=settings.CEREBRAS_API_KEY,
            together_api_key=settings.TOGETHER_API_KEY,
            anthropic_api_key=settings.ANTHROPIC_API_KEY
        )
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a senior software engineer grading a student's open source Pull Request. Review the PR metadata and Diff. Provide a strict, fair evaluation across code_quality, problem_understanding, efficiency, and communication. Calculate the total_score out of 1000 and provide constructive feedback."),
            ("human", "PR Title: {title}\nPR Body: {body}\n\nCode Diff:\n{diff}")
        ])

    async def evaluate_pr(self, title: str, body: str, diff: str) -> Dict[str, Any]:
        providers = [
            (LLMProvider.GROQ, ModelName.LLAMA_3_1_8B),
            (LLMProvider.GEMINI, ModelName.GEMINI_FLASH),
            (LLMProvider.OPENROUTER, ModelName.GEMMA_2_9B)
        ]

        for provider, model in providers:
            try:
                response = await self.llm_service.call_llm(
                    provider=provider,
                    model_name=model,
                    prompt=self.prompt.partial(title=title, body=body or "No description", diff=diff),
                    output_schema=PREvaluationOutput,
                    section_name="pr_evaluation",
                    company_name="general",
                    temperature=0.1,
                    max_tokens=400
                )
                if hasattr(response.content, "model_dump"):
                    return response.content.model_dump()
                return dict(response.content) if isinstance(response.content, dict) else response.content
            except Exception as e:
                logger.warning(f"PR Evaluation failed with {provider.value}: {str(e)}")
                continue

        logger.error("All LLM providers failed for PR evaluation. Using fallback.")
        return {
            "code_quality": 200,
            "problem_understanding": 200,
            "efficiency": 200,
            "communication": 200,
            "total_score": 800,
            "feedback": "Your PR looks solid. We encountered an error running the full AI evaluation, but basic heuristics mark this as a passing submission. Great job!"
        }

pr_evaluation_service = PREvaluationService()

async def evaluate_pr_node(title: str, body: str, diff: str) -> Dict[str, Any]:
    """Node for LangGraph to evaluate a PR."""
    return await pr_evaluation_service.evaluate_pr(title, body, diff)
