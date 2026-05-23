import logging
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from LANGGRAPH.config.settings import settings
from LANGGRAPH.services.llm_service import LLMService, LLMProvider, ModelName

logger = logging.getLogger(__name__)

class MissionAnalysisOutput(BaseModel):
    difficulty: str = Field(description="Must be exactly one of: easy, medium, hard")
    skills: List[str] = Field(description="List of 2-4 skills required for the issue, e.g., Python, React, UI, Backend")
    time_estimate: str = Field(description="Estimated completion time, e.g., '2-4 hours', '1-2 days'")
    relevance_score: float = Field(description="Score between 0.0 and 1.0 indicating relevance for a junior placement candidate")

class MissionLLMService:
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
            ("system", "You are an AI developer mentor that analyzes GitHub issues to determine how hard they are for college students seeking placements. Extract the required difficulty, skills, time estimate, and calculate a relevance score (0.0 to 1.0) where 1.0 is a perfect beginner friendly portfolio issue."),
            ("human", "Issue Title: {title}\nIssue Body: {body}")
        ])

    async def analyze_mission(self, title: str, body: str) -> Dict[str, Any]:
        """Analyze a GitHub issue using LLM providers with automatic fallback."""
        
        # Primary provider sequence
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
                    prompt=self.prompt.partial(title=title, body=body),
                    output_schema=MissionAnalysisOutput,
                    section_name="mission_analysis",
                    company_name="general",
                    temperature=0.1,
                    max_tokens=300
                )
                if hasattr(response.content, "model_dump"):
                    return response.content.model_dump()
                return dict(response.content) if isinstance(response.content, dict) else response.content
            except Exception as e:
                logger.warning(f"Failed to analyze mission with {provider.value} using {model.value}: {str(e)}")
                continue

        # Fallback if all providers fail
        logger.error("All LLM providers failed for mission analysis. Using fallback.")
        return {
            "difficulty": "medium",
            "skills": ["General", "Debugging"],
            "time_estimate": "Unknown",
            "relevance_score": 0.5
        }

mission_llm_service = MissionLLMService()
