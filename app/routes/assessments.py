import json
import random
import logging
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
from app.models.assessment import Assessment
from app.core.assessment_questions import ASSESSMENT_QUESTIONS
from app.core.supabase import supabase_client
from app.services.openrouter import OpenRouterService
from app.schemas.assessment import (
    AssessmentStartResponse,
    AssessmentSubmitRequest,
    AssessmentResponse,
    QuestionSchema,
    GradedQuestionSchema
)

router = APIRouter(prefix="/assessments", tags=["assessments"])

logger = logging.getLogger("app.routes.assessments")

@router.get("/questions", response_model=AssessmentStartResponse)
async def get_assessment_questions(
    level: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve questions for an assessment matching the topics derived from corporate parameters"""
    if level not in ASSESSMENT_QUESTIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid skill level: {level}. Choose 'Beginner', 'Intermediate', or 'Advanced'."
        )
        
    # 1. Fetch user's preferred companies from Supabase student profile
    pref_companies = []
    try:
        sb_profiles = await supabase_client.select("student_profiles", "*", {"user_id": f"eq.{current_user.id}"})
        if sb_profiles and sb_profiles[0].get("preferred_companies"):
            pref_companies = [c.strip() for c in sb_profiles[0]["preferred_companies"].split(",") if c.strip()]
    except Exception as e:
        logger.error(f"Failed to fetch staging_company parameters for dynamic assessments: {str(e)}")

    # 2. Extract derived topics for preferred companies
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
            logger.error(f"Failed to fetch staging_company parameters for dynamic assessments: {str(e)}")

    # 3. Map derived topics to standard question domains
    TOPIC_MAP = {
        "Graphs & Tree Algorithms": ["Graphs", "Trees", "Advanced Structures"],
        "Dynamic Programming": ["Dynamic Programming", "Recursion"],
        "Heaps & Priority Queues": ["Cache Optimization", "Recursion", "Complexity Analysis"],
        "Arrays & Hashmaps": ["Arrays", "Hashing", "Complexity Analysis"],
        "Binary Trees & BSTs": ["Trees", "Advanced Structures"],
        "Arrays & Hashing": ["Arrays", "Hashing"],
        "Greedy Algorithms": ["Two Pointers", "Complexity Analysis"],
        "Sliding Window": ["Two Pointers", "Strings"],
        "Arrays & Strings": ["Arrays", "Strings"],
        "Linked Lists & Stacks": ["Stacks & Queues", "Cache Optimization"],
        "Sorting & Searching": ["Binary Search", "Bitwise Operations"],
    }
    
    allowed_domains = set()
    for t_name in derived_topics:
        mapped_domains = TOPIC_MAP.get(t_name, [])
        for dom in mapped_domains:
            allowed_domains.add(dom.lower())
            
    # 4. Filter static questions matching the derived domains
    questions_data = ASSESSMENT_QUESTIONS[level]
    filtered_questions = []
    
    if allowed_domains:
        filtered_questions = [
            q for q in questions_data 
            if q["topic"].lower() in allowed_domains
        ]
        
    # If no preferred companies were analyzed or matching questions are sparse (e.g. less than 3), fallback to complete standard set
    if len(filtered_questions) < 3:
        filtered_questions = list(questions_data)
        
    # Dynamic random sampling of exactly 10 questions to prevent repeating patterns upon every attempt
    if len(filtered_questions) > 10:
        filtered_questions = random.sample(filtered_questions, 10)
    elif len(filtered_questions) < 10:
        remaining_needed = 10 - len(filtered_questions)
        remaining_pool = [q for q in questions_data if q["id"] not in [fq["id"] for fq in filtered_questions]]
        if remaining_pool:
            added = random.sample(remaining_pool, min(remaining_needed, len(remaining_pool)))
            filtered_questions.extend(added)
            
    # Shuffle the final 10 questions for pristine user experience variation
    random.shuffle(filtered_questions)
        
    # Filter out correct_index and explanation to prevent cheating
    questions = [
        QuestionSchema(
            id=q["id"],
            topic=q["topic"],
            text=q["text"],
            options=q["options"],
            benchmark_seconds=q["benchmark_seconds"]
        )
        for q in filtered_questions
    ]
    return AssessmentStartResponse(skill_level=level, questions=questions)


@router.post("/submit", response_model=AssessmentResponse)
async def submit_assessment(
    request: AssessmentSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Submit assessment answers, calculate scoring/accuracy/speed, trigger skill updates and AI analysis"""
    level = request.skill_level
    if level not in ASSESSMENT_QUESTIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid skill level: {level}."
        )

    # Filter original questions to only evaluate the 10 questions actually served and answered
    all_questions = ASSESSMENT_QUESTIONS[level]
    original_questions = [q for q in all_questions if q["id"] in request.answers]
    
    # Fallback to prevent divide by zero or scoring failure if no answers are passed
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
        correct_idx = q["correct_index"]
        benchmark = q["benchmark_seconds"]
        
        user_answer = request.answers.get(q_id)
        user_time = request.time_spent.get(q_id, benchmark)  # default to benchmark if omitted
        
        total_actual_time += user_time
        total_benchmark_time += benchmark
        
        # Calculate correctness
        is_correct = (user_answer == correct_idx)
        if is_correct:
            correct_count += 1
            topic_results[q_topic] = 100.0
            correct_list.append(q)
        else:
            topic_results[q_topic] = 0.0
            incorrect_list.append(q)
            
        # Calculate speed performance
        speed_ratio = user_time / benchmark if benchmark > 0 else 1.0
        speed_results[q_id] = {
            "time_spent": user_time,
            "benchmark": benchmark,
            "status": "Optimal" if speed_ratio <= 1.0 else "Standard" if speed_ratio <= 1.5 else "Slow"
        }
        
        # Format correct answer text for frontend report
        options = q.get("options", [])
        correct_ans_repr = options[correct_idx] if correct_idx < len(options) else "Unknown Option"
        
        graded_questions.append(GradedQuestionSchema(
            id=q_id,
            text=q["text"],
            topic=q_topic,
            type="mcq",
            options=options,
            user_answer=user_answer,
            correct_answer=correct_ans_repr,
            is_correct=is_correct,
            explanation=q.get("explanation", "Verify the dynamic bounds and data structure constraints.")
        ))

    # Standard calculations
    score = int((correct_count / total_questions) * 100)
    accuracy = float((correct_count / total_questions) * 100.0)
    
    # Speed Category
    speed_ratio_overall = total_actual_time / total_benchmark_time if total_benchmark_time > 0 else 1.0
    if speed_ratio_overall <= 1.0:
        speed_category = "Optimal / Speed Champion"
    elif speed_ratio_overall <= 1.5:
        speed_category = "Standard / Satisfactory"
    else:
        speed_category = "Slow / Needs Practice"

    # Skill Level Updates & Recommendations
    # Rule engine to dynamically re-evaluate capabilities
    next_skill_level = level
    if score >= 80:
        if level == "Beginner":
            next_skill_level = "Intermediate"
        elif level == "Intermediate":
            next_skill_level = "Advanced"
        # If already Advanced, stays Advanced
    elif score <= 20:
        if level == "Advanced":
            next_skill_level = "Intermediate"
        elif level == "Intermediate":
            next_skill_level = "Beginner"
        # If already Beginner, stays Beginner

    # Update Student Profile dynamically in Supabase
    pref_companies = "Google,Meta,Amazon"
    try:
        sb_profiles = await supabase_client.select("student_profiles", "*", {"user_id": f"eq.{current_user.id}"})
        if sb_profiles:
            profile = sb_profiles[0]
            pref_companies = profile.get("preferred_companies") or pref_companies
            await supabase_client.update(
                "student_profiles", 
                {"skill_level": next_skill_level},
                {"user_id": f"eq.{current_user.id}"}
            )
        else:
            # Create profile if not existed
            await supabase_client.insert(
                "student_profiles",
                {
                    "user_id": str(current_user.id),
                    "skill_level": next_skill_level,
                    "prep_goal": "FAANG Interview Prep",
                    "weekly_hours": 10,
                    "preferred_companies": pref_companies
                }
            )
    except Exception as e:
        logger.error(f"Failed to update student profile in Supabase: {str(e)}")

    # ----------------------------------------------------
    # GENERATE RICH AI ANALYSIS REPORT
    # ----------------------------------------------------
    companies = pref_companies.split(",")
    ai_report = f"""# 🧠 Placement AI Skill Assessment Evaluation Report

**Evaluation Date:** {datetime.utcnow().strftime('%B %d, %Y')}  
**Assessed Skill Level:** `{level}`  
**Current Calibrated Level:** `{next_skill_level}`

---

## 📊 Performance Overview
* **Overall Score:** `{score}/100`
* **Test Accuracy:** `{accuracy}%`
* **Overall Time Spent:** `{total_actual_time} seconds` (Target benchmark: `{total_benchmark_time}s`)
* **Speed Index Profile:** `{speed_category}`

---

## 🎯 Topic-wise Competency Matrix
Here is the performance breakdown across core algorithmic paradigms:
"""

    for topic, s in topic_results.items():
        pill = "🟢 Mastered (100%)" if s == 100.0 else "🔴 Review Required (0%)"
        ai_report += f"- **{topic}:** {pill}\n"

    ai_report += f"""
---

## 💡 Key Algorithmic Analysis

### 💪 Promising Strengths
"""
    if len(correct_list) == 0:
        ai_report += "- No major strengths identified in this test cycle. Let's start with structural foundation revisions first.\n"
    else:
        for q in correct_list:
            ai_report += f"- **{q['topic']}:** You showed sharp problem-solving capabilities in this domain. Your response to standard conceptual paradigms is optimal.\n"

    ai_report += """
### ⚠️ Target Areas for Development
"""
    if len(incorrect_list) == 0:
        ai_report += "- Flawless performance! You showed complete command over all assessed core questions.\n"
    else:
        for q in incorrect_list:
            ai_report += f"- **{q['topic']}:** Under-performing or slower. *Recommendation:* Read up on details like: *{q['explanation']}*\n"

    ai_report += f"""
---

## 🚀 Tailored Recruiting Strategy for `{", ".join(companies)}`
Based on your capability profile, we have calibrated your study targets:
"""

    if next_skill_level == "Beginner":
        ai_report += """- **Primary Objective:** Build a solid foundation in basic data structures.
- **Weekly Practice:** Focus on **Arrays & Strings** (1D/2D arrays, linear scans, string reversals).
- **Company Target Path:** Target **Google** and **Meta** Easy problems first to build syntax speed.
- **Action Step:** Dedicate 70% of weekly preparation to implementing search and sorting patterns from scratch.
"""
    elif next_skill_level == "Intermediate":
        ai_report += """- **Primary Objective:** Master standard algorithm patterns and recursive logic.
- **Weekly Practice:** Prioritize **Two-Pointer sum bounds, Sliding Windows, Stacks**, and basic **BST Traversals**.
- **Company Target Path:** Prepare for **Meta's high-speed screening** rounds by solving Medium difficulty questions under 25 minutes.
- **Action Step:** Dedicate 60% of preparation to binary search optimizations and recursion call trees.
"""
    else:
        ai_report += """- **Primary Objective:** Perfect complex optimization techniques and systemic scalability.
- **Weekly Practice:** Deep dive into **Dynamic Programming tabulation, graph shortest paths (Dijkstra/A*), segment trees**, and **LRU custom memory layouts**.
- **Company Target Path:** Target **Google loops and Amazon's architectural evaluations**. Aim to complete hard algorithmic challenges under 40 minutes.
- **Action Step:** Practice coding dual-pointer list/map layouts (like LRU) and graph traversal constraints.
"""

    ai_report += """
---
*Disclaimer: This analysis is automatically generated by the Placement Intelligence Engine based on direct testing telemetry.*
"""

    # Save to Database
    db_assessment = Assessment(
        user_id=current_user.id,
        skill_level=level,
        score=score,
        accuracy=accuracy,
        speed_index=float(total_actual_time),
        speed_category=speed_category,
        topic_scores=json.dumps(topic_results),
        ai_analysis=ai_report,
        completed=True
    )
    
    db.add(db_assessment)
    db.commit()
    db.refresh(db_assessment)

    # Return response formatted correctly
    return AssessmentResponse(
        id=db_assessment.id,
        user_id=db_assessment.user_id,
        skill_level=db_assessment.skill_level,
        score=db_assessment.score,
        accuracy=db_assessment.accuracy,
        speed_index=db_assessment.speed_index,
        speed_category=db_assessment.speed_category,
        topic_scores=topic_results,
        ai_analysis=db_assessment.ai_analysis,
        completed=db_assessment.completed,
        created_at=db_assessment.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        graded_questions=graded_questions
    )


@router.get("/history", response_model=List[AssessmentResponse])
async def get_assessment_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve full history of user's skill assessments"""
    assessments = (
        db.query(Assessment)
        .filter(Assessment.user_id == current_user.id)
        .order_by(Assessment.created_at.desc())
        .all()
    )
    
    response_list = []
    for a in assessments:
        try:
            topic_scores_dict = json.loads(a.topic_scores)
        except Exception:
            topic_scores_dict = {}
            
        response_list.append(
            AssessmentResponse(
                id=a.id,
                user_id=a.user_id,
                skill_level=a.skill_level,
                score=a.score,
                accuracy=a.accuracy,
                speed_index=a.speed_index,
                speed_category=a.speed_category,
                topic_scores=topic_scores_dict,
                ai_analysis=a.ai_analysis,
                completed=a.completed,
                created_at=a.created_at.strftime('%Y-%m-%d %H:%M:%S')
            )
        )
    return response_list


@router.get("/latest", response_model=AssessmentResponse)
async def get_latest_assessment(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve the most recent assessment completed by the user"""
    latest = (
        db.query(Assessment)
        .filter(Assessment.user_id == current_user.id)
        .order_by(Assessment.created_at.desc())
        .first()
    )
    
    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No assessment records found. Please start your first assessment!"
        )
        
    try:
        topic_scores_dict = json.loads(latest.topic_scores)
    except Exception:
        topic_scores_dict = {}
        
    return AssessmentResponse(
        id=latest.id,
        user_id=latest.user_id,
        skill_level=latest.skill_level,
        score=latest.score,
        accuracy=latest.accuracy,
        speed_index=latest.speed_index,
        speed_category=latest.speed_category,
        topic_scores=topic_scores_dict,
        ai_analysis=latest.ai_analysis,
        completed=latest.completed,
        created_at=latest.created_at.strftime('%Y-%m-%d %H:%M:%S')
    )
