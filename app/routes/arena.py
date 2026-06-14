import random
import logging
import datetime
from typing import List, Dict, Optional, Union
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
from app.models.student import Student
from app.core.arena_questions import ARENA_QUESTIONS
from app.core.supabase import supabase_client
from app.services.openrouter import OpenRouterService
from app.services.sandbox_executor import execute_in_sandbox

router = APIRouter(prefix="/arena", tags=["arena"])

# ----------------------------------------------------
# SCHEMAS
# ----------------------------------------------------
class ArenaQuestionSchema(BaseModel):
    id: str
    topic: str
    text: str
    type: str
    options: Optional[List[str]] = None
    starter_code: Optional[Dict[str, str]] = None
    benchmark_seconds: int

class ArenaStartResponse(BaseModel):
    level: int
    derived_level_topics: List[str]
    questions: List[ArenaQuestionSchema]

class ArenaSubmitRequest(BaseModel):
    level: int
    answers: Dict[str, Union[int, str]]  # key: question_id, value: selected_option_index (int) or code text (str)
    time_spent: Dict[str, float]  # key: question_id, value: seconds

class SpeedStatusDetail(BaseModel):
    time_spent: float
    benchmark: float
    status: str  # "Optimal", "Standard", "Slow"

class GradedQuestionSchema(BaseModel):
    id: str
    text: str
    topic: str
    type: str
    options: Optional[List[str]] = None
    user_answer: Union[int, str, None] = None
    correct_answer: Union[int, str]
    is_correct: bool
    explanation: str

class ArenaResponse(BaseModel):
    level: int
    score: float
    correct_answers: int
    total_questions: int
    accuracy_percentage: float
    topic_breakdown: Dict[str, float]
    speed_analytics: Dict[str, SpeedStatusDetail]
    ai_feedback: str
    graded_questions: List[GradedQuestionSchema]

# ----------------------------------------------------
# ROUTES
# ----------------------------------------------------
@router.get("/questions", response_model=ArenaStartResponse)
async def get_arena_questions(
    level: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve 10 randomized, corporate-aligned coding questions for a specific Arena Level"""
    if level not in ARENA_QUESTIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Arena Level: {level}. Level must be between 1 and 6."
        )

    # 1. Fetch user preferred companies from student profile or Supabase student profile fallback
    pref_companies = []
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if student:
        # Fallback to general skills/preferred industries if companies not specified
        pref_companies = ["Google", "Meta", "Amazon"]
    
    try:
        # Query Supabase student profiles for prefered companies as a robust fallback
        sb_profiles = await supabase_client.select("student_profiles", "*", {"user_id": f"eq.{current_user.id}"})
        if sb_profiles and sb_profiles[0].get("preferred_companies"):
            pref_companies = [c.strip() for c in sb_profiles[0]["preferred_companies"].split(",") if c.strip()]
    except Exception:
        pass
        
    # 2. Extract 20-parameter derived topics
    derived_topics = set()
    if pref_companies:
        try:
            sb_res = await supabase_client.select("staging_company", "*")
            if sb_res:
                for item in sb_res:
                    c_name = item.get("company_name") or item.get("name")
                    if c_name and any(p.lower() == c_name.lower() for p in pref_companies):
                        derived_intel = OpenRouterService._simulate_company_analysis(c_name, item)
                        for t in derived_intel.get("topics", []):
                            derived_topics.add(t["topic_name"])
        except Exception as e:
            logging.error(f"Failed to fetch staging_company parameters for Coding Arena: {str(e)}")

    # 3. Map derived topics to standard topics relevant to the current level
    LEVEL_TOPICS_MAP = {
        1: {
            "Arrays & Strings": ["Arrays", "Strings"],
            "Sliding Window": ["Sliding Window"],
            "Arrays & Hashing": ["Arrays", "Hashing"],
            "Arrays & Hashmaps": ["Arrays", "Hashing"]
        },
        2: {
            "Linked Lists & Stacks": ["Linked Lists", "Stacks & Queues"],
            "Heaps & Priority Queues": ["Cache Optimization"]
        },
        3: {
            "Sorting & Searching": ["Sorting & Searching", "Binary Search"],
            "Sliding Window": ["Binary Search"],
            "Greedy Algorithms": ["Basic Logic"],
            "Arrays & Strings": ["Bitwise Operations"]
        },
        4: {
            "Binary Trees & BSTs": ["Trees", "BSTs"],
            "Graphs & Tree Algorithms": ["Trees"],
            "Arrays & Hashmaps": ["Hashing"]
        },
        5: {
            "Graphs & Tree Algorithms": ["Graphs"],
            "Heaps & Priority Queues": ["Heaps"],
            "Greedy Algorithms": ["Greedy"]
        },
        6: {
            "Dynamic Programming": ["Dynamic Programming"],
            "Graphs & Tree Algorithms": ["Segment Trees", "Tries"]
        }
    }

    # Extract allowed domains for this level
    current_level_mapping = LEVEL_TOPICS_MAP.get(level, {})
    allowed_domains = set()
    for derived in derived_topics:
        for mapped in current_level_mapping.get(derived, []):
            allowed_domains.add(mapped.lower())

    # 4. Filter arena questions by derived allowed topics
    questions_data = ARENA_QUESTIONS[level]
    filtered_questions = []
    
    if allowed_domains:
        filtered_questions = [
            q for q in questions_data
            if q["topic"].lower() in allowed_domains
        ]
        
    # Fallback to entire level questions if too few topics matched (e.g. less than 3)
    if len(filtered_questions) < 3:
        filtered_questions = list(questions_data)

    # 5. Dynamically sample exactly 10 questions to ensure variety on every attempt
    if len(filtered_questions) > 10:
        filtered_questions = random.sample(filtered_questions, 10)
    elif len(filtered_questions) < 10:
        remaining_needed = 10 - len(filtered_questions)
        remaining_pool = [q for q in questions_data if q["id"] not in [fq["id"] for fq in filtered_questions]]
        if remaining_pool:
            added = random.sample(remaining_pool, min(remaining_needed, len(remaining_pool)))
            filtered_questions.extend(added)

    # Shuffle for best variety order
    random.shuffle(filtered_questions)

    # Map to schema
    questions = [
        ArenaQuestionSchema(
            id=q["id"],
            topic=q["topic"],
            text=q["text"],
            type=q.get("type", "mcq"),
            options=q.get("options"),
            starter_code=q.get("starter_code"),
            benchmark_seconds=q["benchmark_seconds"]
        )
        for q in filtered_questions
    ]

    return ArenaStartResponse(
        level=level,
        derived_level_topics=list(allowed_domains),
        questions=questions
    )


@router.post("/submit", response_model=ArenaResponse)
async def submit_arena_assessment(
    request: ArenaSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Grade and submit answers for the Coding Arena Level, returning precise analysis and custom feedback"""
    level = request.level
    if level not in ARENA_QUESTIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Arena Level: {level}."
        )

    all_questions = ARENA_QUESTIONS[level]
    original_questions = [q for q in all_questions if q["id"] in request.answers]
    
    # Fallback
    if not original_questions:
        original_questions = all_questions[:10]
        
    total_questions = len(original_questions)
    correct_count = 0
    topic_results = {}
    speed_results = {}
    graded_questions = []
    
    total_actual_time = 0
    total_benchmark_time = 0
    
    correct_list = []
    incorrect_list = []

    for q in original_questions:
        q_id = q["id"]
        q_topic = q["topic"]
        correct_idx = q.get("correct_index")
        benchmark = q["benchmark_seconds"]
        
        user_answer = request.answers.get(q_id)
        user_time = request.time_spent.get(q_id, benchmark)
        
        total_actual_time += user_time
        total_benchmark_time += benchmark
        
        is_correct = False
        final_explanation = q.get("explanation", "Ensure optimal time bounds and correct array/pointer alignment.")
        
        if q.get("type") == "coding":
            submitted_code = str(user_answer or "").strip()
            passed, feedback = execute_in_sandbox(submitted_code, q_id)
            is_correct = passed
            final_explanation = feedback
        else:
            is_correct = (user_answer == correct_idx)
            
        if is_correct:
            correct_count += 1
            topic_results[q_topic] = 100.0
            correct_list.append(q)
        else:
            topic_results[q_topic] = 0.0
            incorrect_list.append(q)
            
        speed_ratio = user_time / benchmark if benchmark > 0 else 1.0
        speed_results[q_id] = SpeedStatusDetail(
            time_spent=user_time,
            benchmark=benchmark,
            status="Optimal" if speed_ratio <= 1.0 else "Standard" if speed_ratio <= 1.5 else "Slow"
        )
        
        # Build answer representation for graded questions schema
        correct_ans_repr = ""
        user_ans_repr = ""
        
        if q.get("type") == "coding":
            correct_ans_repr = f"Algorithmic code requires correct structure containing keyword '{q.get('correct_keyword', 'def')}'."
            user_ans_repr = str(user_answer or "No code submitted.")
        else:
            options = q.get("options", [])
            if correct_idx is not None and correct_idx < len(options):
                correct_ans_repr = options[correct_idx]
            else:
                correct_ans_repr = "Unknown Correct Option"
            
            if user_answer is not None and isinstance(user_answer, int) and user_answer < len(options):
                user_ans_repr = options[user_answer]
            else:
                user_ans_repr = "No option selected"

        graded_questions.append(GradedQuestionSchema(
            id=q_id,
            text=q["text"],
            topic=q_topic,
            type=q.get("type", "mcq"),
            options=q.get("options"),
            user_answer=user_answer,
            correct_answer=correct_ans_repr,
            is_correct=is_correct,
            explanation=final_explanation
        ))

    accuracy = (correct_count / total_questions) * 100.0 if total_questions > 0 else 0.0
    score = (correct_count / total_questions) * 100.0

    # Build dynamically generated custom AI feedback based on accuracy and speed
    if score >= 90:
        feedback = f"Outstanding! You've mastered Level {level}! Your conceptual logic is exceptionally strong. You are ready for elite FAANG interview rounds."
    elif score >= 70:
        feedback = f"Great effort! You passed Level {level} with solid accuracy. Focus on timing constraints for {', '.join(topic_results.keys())} to achieve peak efficiency."
    else:
        feedback = f"Level {level} completed. You are making progress, but there are vital conceptual gaps in {', '.join([q['topic'] for q in incorrect_list])}. Review your data layout bounds."

    # Save to Supabase student_submissions/readiness_scores as a telemetry record
    try:
        telemetry_payload = {
            "student_id": current_user.id,
            "level": level,
            "score": score,
            "passed_count": correct_count,
            "total_count": total_questions,
            "completed_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        await supabase_client.insert("arena_submissions", telemetry_payload)
    except Exception:
        pass

    return ArenaResponse(
        level=level,
        score=score,
        correct_answers=correct_count,
        total_questions=total_questions,
        accuracy_percentage=accuracy,
        topic_breakdown=topic_results,
        speed_analytics=speed_results,
        ai_feedback=feedback,
        graded_questions=graded_questions
    )

class ArenaExecuteRequest(BaseModel):
    question_id: str
    code: str

@router.post("/execute")
async def execute_code_sandbox(
    request: ArenaExecuteRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Executes student code within the secure python compilation sandbox"""
    passed, logs = execute_in_sandbox(request.code, request.question_id)
    return {
        "success": passed,
        "output": logs
    }


@router.post("/sync-kaggle")
async def sync_kaggle_questions(
    level: Optional[int] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Trigger dynamic dataset synchronization with Kaggle open repository pool"""
    from app.services.kaggle_integration import KaggleIntegrationService
    result = KaggleIntegrationService.fetch_and_sync_kaggle_questions(level)
    return result
