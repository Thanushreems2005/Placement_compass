import logging
from typing import Dict, Any
from LANGGRAPH.aptitude.state import AptitudeGraphState
from LANGGRAPH.services.llm_service import LLMProvider, ModelName

logger = logging.getLogger(__name__)

try:
    from LANGGRAPH.graph.workflow import llm_service
except ImportError:
    from LANGGRAPH.services.llm_service import LLMService
    from LANGGRAPH.config.settings import settings
    llm_service = LLMService(
        groq_api_key=settings.GROQ_API_KEY if settings else "",
        openrouter_api_key=settings.OPENROUTER_API_KEY if settings else "",
        gemini_api_key=settings.GEMINI_API_KEY if settings else "",
        cerebras_api_key=settings.CEREBRAS_API_KEY if settings else "",
        together_api_key=settings.TOGETHER_API_KEY if settings else "",
        anthropic_api_key=settings.ANTHROPIC_API_KEY if settings else ""
    )


async def insight_generator_node(state: AptitudeGraphState) -> Dict[str, Any]:
    """
    Node 5: Generate personalized motivational feedback and insights based on student statistics.
    """
    logger.info("--- Running Aptitude Insight Generator Node ---")
    weak_areas = state.get("weak_areas") or []
    strong_areas = state.get("strong_areas") or []
    readiness_score = state.get("readiness_score", 0.0)
    metrics = state.get("performance_metrics") or {}
    
    use_llm = llm_service.is_provider_configured(LLMProvider.GEMINI) or \
              llm_service.is_provider_configured(LLMProvider.GROQ)
              
    ai_insights = ""
    
    if use_llm:
        provider = LLMProvider.GEMINI if llm_service.is_provider_configured(LLMProvider.GEMINI) else LLMProvider.GROQ
        model = ModelName.GEMINI_FLASH if provider == LLMProvider.GEMINI else ModelName.LLAMA_70B
        
        system_msg = (
            "You are an inspiring placement officer and aptitude coach. Analyze the student's metrics and "
            "write a highly personalized, motivational feedback paragraph (approx. 3-4 sentences). "
            "Acknowledge their strong areas, give actionable advice on improving their weakest area, and "
            "provide a realistic projection of their readiness. Return a JSON object with 'insight' key."
        )
        
        user_msg = (
            f"Student Analytics:\n"
            f"- Overall Readiness: {readiness_score}%\n"
            f"- Accuracy: {metrics.get('overall_accuracy', 0.0)}%\n"
            f"- Solving Speed: {metrics.get('overall_speed', 0.0)} seconds/question\n"
            f"- Weak areas: {weak_areas}\n"
            f"- Strong areas: {strong_areas}\n"
        )
        
        prompt = llm_service.create_prompt(system_msg, user_msg)
        
        try:
            response = await llm_service.call_llm(
                provider=provider,
                model_name=model,
                prompt=prompt,
                section_name="aptitude_insights"
            )
            
            content = response.content
            if isinstance(content, dict):
                ai_insights = content.get("insight") or ""
                logger.info("Successfully fetched AI insights from LLM.")
        except Exception as e:
            logger.error(f"LLM call failed in Insight Generator node: {e}. Falling back to rule-based insights.")
            
    # Rule-based fallback if LLM is offline or not configured
    if not ai_insights:
        if weak_areas:
            top_weak = weak_areas[0]
            ai_insights = (
                f"You're making steady progress toward placement readiness, currently at {readiness_score}%. "
                f"Your performance in {top_weak} is currently your largest bottleneck. By spending just "
                f"30-40 minutes practicing focused subtopics of {top_weak} daily, you can increase your accuracy "
                f"and boost your overall score by 10-15 points within two weeks."
            )
        elif strong_areas:
            top_strong = strong_areas[0]
            ai_insights = (
                f"Superb performance! Your high mastery of {top_strong} showcases exceptional analytical skill. "
                f"At {readiness_score}% overall readiness, you are in a strong position. Keep practicing with mixed "
                f"timed mock tests to maintain your edge and polish your solving speed even further."
            )
        else:
            ai_insights = (
                f"Welcome to the Aptitude preparation dashboard! You are currently at {readiness_score}% readiness. "
                f"To begin receiving detailed AI analysis and customized roadmaps, please submit a few mock attempt scores "
                f"across different topics like Quantitative, Logical, and Verbal Ability."
            )
            
    return {
        "ai_insights": ai_insights
    }
