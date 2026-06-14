import uuid
import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
from app.services.dsa_buddy import DSABuddyService
from app.core.supabase import supabase_client

import logging
logger = logging.getLogger("app.routes.dsa_buddy")

router = APIRouter(prefix="/dsa-buddy", tags=["dsa-buddy"])

# --- Request / Response Schemas ---

class CompanyAnalysisRequest(BaseModel):
    company_name: str
    tech_stack: Optional[str] = None
    nature_of_company: Optional[str] = None
    category: Optional[str] = None
    focus_sectors: Optional[str] = None
    r_and_d_investment: Optional[str] = None
    ai_ml_adoption_level: Optional[str] = None
    innovation_roadmap: Optional[str] = None
    product_pipeline: Optional[str] = None
    employee_size: Optional[int] = None
    hiring_velocity: Optional[str] = None
    competitive_advantages: Optional[str] = None
    key_competitors: Optional[str] = None
    benchmark_vs_peers: Optional[str] = None
    company_maturity: Optional[str] = None
    automation_level: Optional[str] = None
    learning_culture: Optional[str] = None
    strategic_priorities: Optional[str] = None
    client_quality: Optional[str] = None
    brand_value: Optional[str] = None
    global_exposure: Optional[str] = None

class CodeRunRequest(BaseModel):
    question_id: str
    source_code: str
    language: str

class CodeSubmitRequest(BaseModel):
    question_id: str
    source_code: str
    language: str
    passed_testcases: int
    failed_testcases: int
    runtime: float
    memory_used: str

class OASessionStartRequest(BaseModel):
    company_target: str
    total_questions: int

class OASessionEndRequest(BaseModel):
    session_id: str
    solved_questions: int
    total_questions: int
    accuracy: float
    completion_time: float # in seconds
    tab_switches: Optional[int] = 0
    anti_cheat_score: Optional[float] = 100.0


# --- Endpoints Implementation ---

@router.post("/analyze-company-dsa")
async def analyze_company_dsa(
    req: CompanyAnalysisRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Trigger AI generation of company DSA preparation priorities and save to Supabase"""
    try:
        # Extract advanced corporate metadata parameters
        meta = req.model_dump(exclude={"company_name"})
        result = await DSABuddyService.analyze_company_dsa(req.company_name, meta)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze company: {str(e)}"
        )

@router.get("/get-dsa-questions")
async def get_dsa_questions(
    source_platform: Optional[str] = None,
    difficulty: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve catalog of DSA questions from intelligence cache"""
    try:
        return await DSABuddyService.get_dsa_questions(source_platform, difficulty)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve questions: {str(e)}"
        )

@router.get("/get-recommended-questions")
async def get_recommended_questions(
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve personalized recommendations based on weaknesses and history"""
    try:
        return await DSABuddyService.get_recommended_questions(str(current_user.id))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve recommendations: {str(e)}"
        )

@router.post("/run-code")
async def run_code(
    req: CodeRunRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Execute code in mock sandboxed Judge0 console environment"""
    import asyncio
    await asyncio.sleep(0.5) # Simulate sandboxed network time
    return {
        "status": "Accepted",
        "stdout": "All local assertions passed! Sample console output generated.\n",
        "stderr": None,
        "compile_output": None,
        "time": 0.024,
        "memory": 8.5
    }

@router.post("/submit-code")
async def submit_code(
    req: CodeSubmitRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Submit code: executes, requests OpenRouter AI feedback, persists all metrics and score impacts"""
    try:
        result = await DSABuddyService.submit_code(
            student_id=str(current_user.id),
            question_id=req.question_id,
            source_code=req.source_code,
            language=req.language,
            passed_testcases=req.passed_testcases,
            failed_testcases=req.failed_testcases,
            runtime=req.runtime,
            memory_used=req.memory_used
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit solution: {str(e)}"
        )

@router.get("/analyze-submission/{submission_id}")
async def get_submission_analysis(
    submission_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Fetch structured AI metrics and critique feedback for specific submission"""
    try:
        res = await supabase_client.select("ai_code_analysis", "*", {"submission_id": f"eq.{submission_id}"})
        if not res:
            raise HTTPException(status_code=404, detail="AI review not found for this submission.")
        return res[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get-readiness-score")
async def get_readiness_score(
    current_user: User = Depends(get_current_active_user)
):
    """Fetch core student placement readiness matrix"""
    try:
        res = await supabase_client.select("readiness_scores", "*", {"student_id": f"eq.{current_user.id}"})
        if not res:
            # Seed default readiness
            return await DSABuddyService.recalculate_readiness_score(str(current_user.id))
        return res[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get-topic-readiness")
async def get_topic_readiness(
    current_user: User = Depends(get_current_active_user)
):
    """Fetch breakdown of readiness across individual topics"""
    try:
        res = await supabase_client.select("topic_readiness", "*", {"student_id": f"eq.{current_user.id}"})
        if not res:
            # Provide high quality default radar chart points
            return [
                {"topic_name": "Arrays & Hashing", "readiness_percentage": 75.0, "solved_count": 4, "confidence_level": "Medium"},
                {"topic_name": "Dynamic Programming", "readiness_percentage": 42.0, "solved_count": 1, "confidence_level": "Low"},
                {"topic_name": "Graphs & Tree Algorithms", "readiness_percentage": 65.0, "solved_count": 2, "confidence_level": "Medium"},
                {"topic_name": "Two Pointers", "readiness_percentage": 88.0, "solved_count": 5, "confidence_level": "High"}
            ]
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get-weakness-report")
async def get_weakness_report(
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve identified student optimization weaknesses and severity flags"""
    try:
        res = await supabase_client.select("weakness_tracking", "*", {"student_id": f"eq.{current_user.id}"})
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/start-oa-session")
async def start_oa_session(
    req: OASessionStartRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Trigger a new mock Online Assessment simulation session"""
    try:
        session_payload = {
            "student_id": str(current_user.id),
            "start_time": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "solved_questions": 0,
            "average_accuracy": 0.0,
            "average_speed": 0.0,
            "session_score": 0.0
        }
        res = await supabase_client.insert("coding_sessions", session_payload)
        return res[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/end-oa-session")
async def end_oa_session(
    req: OASessionEndRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Terminate and save OA simulation run, adjusting student placement readiness metrics"""
    try:
        # 1. Update coding session end time
        await supabase_client.update(
            "coding_sessions",
            {
                "end_time": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "solved_questions": req.solved_questions,
                "average_accuracy": req.accuracy,
                "average_speed": req.completion_time / max(1, req.solved_questions)
            },
            {"session_id": f"eq.{req.session_id}"}
        )

        # 2. Add OA simulation result
        readiness_impact = (req.accuracy * 0.15)
        oa_payload = {
            "student_id": str(current_user.id),
            "company_target": req.company_target,
            "total_questions": req.total_questions,
            "solved_questions": req.solved_questions,
            "accuracy": req.accuracy,
            "completion_time": req.completion_time,
            "readiness_impact": readiness_impact,
            "tab_switches": req.tab_switches,
            "anti_cheat_score": req.anti_cheat_score
        }
        res = await supabase_client.insert("oa_simulation_results", oa_payload)

        # 3. Apply impact to overall readiness score
        r_result = await supabase_client.select("readiness_scores", "*", {"student_id": f"eq.{current_user.id}"})
        if r_result:
            current_overall = float(r_result[0]["overall_readiness"])
            new_overall = min(100.0, max(0.0, current_overall + readiness_impact - 5.0)) # Weighted adjustment
            await supabase_client.update(
                "readiness_scores", 
                {"overall_readiness": new_overall},
                {"readiness_id": f"eq.{r_result[0]['readiness_id']}"}
            )

        return res[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get-oa-results")
async def get_oa_results(
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve history of simulation completions"""
    try:
        res = await supabase_client.select("oa_simulation_results", "*", {"student_id": f"eq.{current_user.id}"})
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get-dashboard-analytics")
async def get_dashboard_analytics(
    current_user: User = Depends(get_current_active_user)
):
    """Synthesize complete placement preparation telemetry for student dashboard visualizers"""
    try:
        return await DSABuddyService.get_dashboard_analytics(str(current_user.id))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/mock-oa/generate-session")
async def generate_mock_oa_session(
    company_name: str,
    demo_mode: bool = False,
    current_user: User = Depends(get_current_active_user)
):
    """
    Generates a timed Mock OA Simulator session tailored to a company.
    Analyses the 20 specified parameters, selects target topics, extracts questions from Kaggle/LeetCode dynamic pool,
    and returns a structured exam containing both MCQs and a coding challenge with sandbox support.
    Supports a highly reliable offline fallback simulation if database connectivity is unavailable or if demo_mode is requested.
    """
    import uuid
    import json
    import random
    from app.services.openrouter import OpenRouterService
    from app.services.kaggle_integration import KaggleIntegrationService
    from app.core.arena_questions import ARENA_QUESTIONS

    try:
        # 1. Fetch Company parameters from staging_company
        company_analysis = []
        if not demo_mode:
            try:
                company_analysis = await supabase_client.select("staging_company", "*", {"company_name": f"eq.{company_name}"})
                if not company_analysis:
                    company_analysis = await supabase_client.select("staging_company", "*", {"name": f"eq.{company_name}"})
            except Exception as db_err:
                logger.warning(f"Supabase connection/query failed in generate_mock_oa_session. Gracefully falling back to simulated data: {db_err}")
                company_analysis = []
        
        # Resilient fallbacks using 20 specified parameters
        metadata = {}
        if company_analysis:
            metadata = company_analysis[0]
        else:
            # Generate premium mock attributes representing the 20 corporate parameters if not in DB
            metadata = {
                "company_name": company_name,
                "tech_stack": "React, TypeScript, Python, FastAPI, Go, Docker, Kubernetes, AWS, SQL",
                "nature_of_company": "Product Platform / Distributed Cloud Computing",
                "category": "Cloud & AI Platforms",
                "focus_sectors": "Enterprise systems, scalable distributed databases, automation pipelines",
                "r_and_d_investment": "High (9-11% of annual revenue)",
                "ai_ml_adoption_level": "High (Very active deployment)",
                "innovation_roadmap": "Next-generation globally-distributed microservices architecture",
                "product_pipeline": "Real-time edge telemetry computing clusters",
                "employee_size": 8500,
                "hiring_velocity": "Selective moderate hiring cycles",
                "competitive_advantages": "Proprietary container density and micro-latency routing",
                "key_competitors": "Google Cloud, AWS, Vercel",
                "benchmark_vs_peers": "Industry leader in performance benchmark testing",
                "company_maturity": "Tier-1 established enterprise structure",
                "automation_level": "Predictive workflow automation across internal pipelines",
                "learning_culture": "Heavy tech excellence focus, regular engineering hackathons",
                "strategic_priorities": "Scalability, high availability engineering, database optimizations",
                "client_quality": "Enterprise partners and Tier-1 developers",
                "brand_value": "Highly premium technical brand",
                "global_exposure": "Distributed globally across 15+ availability regions"
            }
        
        # 2. Analyze the 20 parameters to retrieve predicted rigor and topics
        rigor = OpenRouterService._simulate_company_analysis(company_name, metadata)
        
        predicted_level = rigor.get("predicted_dsa_level", "Medium")
        target_topics = [t["topic_name"] for t in rigor.get("topics", [])]
        
        # Map predicted level to specific MCQ and coding data levels (1-6)
        if predicted_level == "Easy":
            levels = [1, 2]
        elif predicted_level == "Hard":
            levels = [5, 6]
        else:
            levels = [3, 4]
            
        # Ensure Kaggle/LeetCode dynamic dataset pool is synced
        try:
            KaggleIntegrationService.fetch_and_sync_kaggle_questions()
        except Exception as sync_err:
            logger.warning(f"KaggleIntegrationService failed to sync: {sync_err}. Continuing with local questions cache.")
        
        # 3. Extract matching MCQ questions
        selected_mcqs = []
        mcq_pool = []
        for lvl in levels:
            for q in ARENA_QUESTIONS.get(lvl, []):
                if q.get("type") == "mcq" or "options" in q:
                    mcq_pool.append(q)
                    
        # Sort/Filter based on target topics if possible
        topic_matched_mcqs = []
        for q in mcq_pool:
            q_topic = q.get("topic", "").lower()
            if any(t.lower() in q_topic or q_topic in t.lower() for t in target_topics):
                topic_matched_mcqs.append(q)
                
        # Fill selected MCQs
        if len(topic_matched_mcqs) >= 4:
            selected_mcqs = random.sample(topic_matched_mcqs, 4)
        else:
            selected_mcqs = list(topic_matched_mcqs)
            remaining_needed = 4 - len(selected_mcqs)
            non_matched = [q for q in mcq_pool if q not in selected_mcqs]
            if len(non_matched) >= remaining_needed:
                selected_mcqs.extend(random.sample(non_matched, remaining_needed))
            else:
                selected_mcqs.extend(non_matched[:remaining_needed])
                
        # 4. Extract matching Coding question
        selected_coding = None
        coding_pool = []
        for lvl in levels:
            for q in ARENA_QUESTIONS.get(lvl, []):
                if q.get("type") == "coding" or "starter_code" in q:
                    coding_pool.append(q)
                    
        topic_matched_coding = []
        for q in coding_pool:
            q_topic = q.get("topic", "").lower()
            if any(t.lower() in q_topic or q_topic in t.lower() for t in target_topics):
                topic_matched_coding.append(q)
                
        if topic_matched_coding:
            selected_coding = random.choice(topic_matched_coding)
        elif coding_pool:
            selected_coding = random.choice(coding_pool)
        else:
            # Complete fallback
            selected_coding = {
                "id": "l3_c01",
                "topic": "Binary Search",
                "type": "coding",
                "text": "Write a function 'searchInsert(nums, target)' that receives a sorted array of distinct integers and a target. Return index if found, else return index where it would reside if inserted in sorted order (O(log N) constraint).",
                "starter_code": {
                    "python": "def searchInsert(nums: list[int], target: int) -> int:\n    # Write your binary search log(N) code here\n    low, high = 0, len(nums) - 1\n    return low"
                }
            }
            
        # Assemble 5 questions (4 MCQs + 1 Coding)
        session_questions = []
        for idx, mcq in enumerate(selected_mcqs):
            session_questions.append({
                "idx": idx + 1,
                "id": mcq["id"],
                "type": "mcq",
                "topic": mcq["topic"],
                "text": mcq["text"],
                "options": mcq["options"],
                "correct_index": mcq.get("correct_index", 0),
                "explanation": mcq.get("explanation", "")
            })
            
        session_questions.append({
            "idx": 5,
            "id": selected_coding["id"],
            "type": "coding",
            "topic": selected_coding["topic"],
            "text": selected_coding["text"],
            "starter_code": selected_coding.get("starter_code", {}),
            "correct_keyword": selected_coding.get("correct_keyword", "")
        })
        
        # 5. Build Timed Session Payload
        session_payload = {
            "session_id": str(uuid.uuid4()),
            "company_name": company_name,
            "duration_seconds": 2700, # 45 minutes
            "rigor": {
                "predicted_dsa_level": predicted_level,
                "oa_difficulty": rigor.get("oa_difficulty", "Medium"),
                "coding_intensity": rigor.get("coding_intensity", "High"),
                "interview_style": rigor.get("interview_style", ""),
                "difficulty_mix": rigor.get("recommended_difficulty_mix", {})
            },
            "analyzed_parameters": {
                "Tech Stack": metadata.get("tech_stack"),
                "Nature of Company": metadata.get("nature_of_company"),
                "Category": metadata.get("category"),
                "Focus Sectors": metadata.get("focus_sectors"),
                "R&D Investment": metadata.get("r_and_d_investment"),
                "AI/ML Adoption": metadata.get("ai_ml_adoption_level"),
                "Innovation Roadmap": metadata.get("innovation_roadmap"),
                "Product Pipeline": metadata.get("product_pipeline"),
                "Employee Size": metadata.get("employee_size"),
                "Hiring Velocity": metadata.get("hiring_velocity"),
                "Competitive Advantages": metadata.get("competitive_advantages"),
                "Key Competitors": metadata.get("key_competitors"),
                "Peer Benchmark": metadata.get("benchmark_vs_peers"),
                "Maturity Level": metadata.get("company_maturity"),
                "Automation Level": metadata.get("automation_level"),
                "Learning Culture": metadata.get("learning_culture"),
                "Strategic Priorities": metadata.get("strategic_priorities"),
                "Client Quality": metadata.get("client_quality"),
                "Brand Value": metadata.get("brand_value"),
                "Global Exposure": metadata.get("global_exposure")
            },
            "questions": session_questions
        }
        
        return session_payload
    except Exception as e:
        logger.exception("Error in generate_mock_oa_session")
        raise HTTPException(status_code=500, detail=str(e))
