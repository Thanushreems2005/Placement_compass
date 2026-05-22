import logging
from typing import Dict, Any, List
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


async def recommendation_engine_node(state: AptitudeGraphState) -> Dict[str, Any]:
    """
    Node 4: AI recommendation engine for personalized roadmaps and resource suggestions.
    """
    logger.info("--- Running Aptitude Recommendation Engine Node ---")
    weak_areas = state.get("weak_areas") or []
    strong_areas = state.get("strong_areas") or []
    metrics = state.get("performance_metrics") or {}
    
    # Check if we can use LLM
    use_llm = llm_service.is_provider_configured(LLMProvider.GEMINI) or \
              llm_service.is_provider_configured(LLMProvider.GROQ)
              
    weekly_goals = []
    daily_targets = {}
    recommendations = []
    
    if use_llm:
        provider = LLMProvider.GEMINI if llm_service.is_provider_configured(LLMProvider.GEMINI) else LLMProvider.GROQ
        model = ModelName.GEMINI_FLASH if provider == LLMProvider.GEMINI else ModelName.LLAMA_70B
        
        system_msg = (
            "You are a premium AI placement preparation coach. Your goal is to guide students on optimizing "
            "their aptitude learning tracking. Analyze the performance data and return a JSON containing:\n"
            "- 'weekly_goals': A list of objects with keys 'week' (int), 'topics' (list of str), 'target_accuracy' (float), "
            "'hours_planned' (float), and 'milestones' (list of str).\n"
            "- 'daily_targets': An object mapping weak topic names to target 'hours' (float) and 'questions_target' (int).\n"
            "- 'recommendations': A list of objects with 'title' (str), 'description' (str), and 'priority' (High/Medium/Low).\n"
            "Keep the suggestions extremely practical and tailor them to the weak and strong areas."
        )
        
        user_msg = (
            f"Student Analytics Snapshot:\n"
            f"- Weak Topics: {weak_areas}\n"
            f"- Strong Topics: {strong_areas}\n"
            f"- Overall Accuracy: {metrics.get('overall_accuracy', 0.0)}%\n"
            f"- Solving Speed: {metrics.get('overall_speed', 0.0)} seconds/question\n"
            f"- Recent Trend: {metrics.get('accuracy_trend', 'Stable')}\n"
        )
        
        prompt = llm_service.create_prompt(system_msg, user_msg)
        
        try:
            response = await llm_service.call_llm(
                provider=provider,
                model_name=model,
                prompt=prompt,
                section_name="aptitude_recommendations"
            )
            
            content = response.content
            if isinstance(content, dict):
                weekly_goals = content.get("weekly_goals") or []
                daily_targets = content.get("daily_targets") or {}
                recommendations = content.get("recommendations") or []
                logger.info("Successfully fetched AI recommendations from LLM.")
        except Exception as e:
            logger.error(f"LLM call failed in Recommendation Engine node: {e}. Falling back to rules.")
            
    # Rule-based fallback if LLM was not used or failed
    if not weekly_goals:
        # Generate weekly goals based on weak areas
        all_topics = weak_areas + [t for t in ["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability", "Data Interpretation", "Puzzles"] if t not in weak_areas and t not in strong_areas]
        for i, topic in enumerate(all_topics[:4]):
            weekly_goals.append({
                "week": i + 1,
                "topics": [topic],
                "target_accuracy": min(95.0, 60.0 + (i + 1) * 8),
                "hours_planned": 14.0,  # 2 hours per day
                "milestones": [
                    f"Master core subtopics of {topic}",
                    f"Achieve {min(95.0, 60.0 + (i + 1) * 8)}% accuracy in {topic} practice tests"
                ]
            })
            
    if not daily_targets:
        # Fallback daily targets
        if weak_areas:
            per_topic = round(2.0 / max(1, len(weak_areas[:3])), 1)
            daily_targets = {
                t: {"hours": per_topic, "questions_target": int(per_topic * 12)}
                for t in weak_areas[:3]
            }
        else:
            daily_targets = {"Practice": {"hours": 1.5, "questions_target": 20}}
            
    if not recommendations:
        # Fallback recommendations list
        for topic in weak_areas[:2]:
            recommendations.append({
                "title": f"Focus on {topic} fundamentals",
                "description": f"Allocate more time to practice basic concept sheets for {topic} to improve core understanding.",
                "priority": "High"
            })
        recommendations.append({
            "title": "Speed Drills",
            "description": "Practice mock sections with a 45-second timer per question to build solver instincts.",
            "priority": "Medium"
        })
        
    return {
        "weekly_goals": weekly_goals,
        "daily_targets": daily_targets,
        "recommendations": recommendations
    }
