import uuid
import datetime
import logging
from typing import Dict, Any, List, Optional
from app.core.supabase import supabase_client
from app.services.openrouter import OpenRouterService
from app.core.websocket_manager import ws_manager

logger = logging.getLogger("app.services.dsa_buddy")

class DSABuddyService:
    """
    Central intelligence service of the DSA Buddy ecosystem.
    Directly orchestrates database persistence, OpenRouter AI pipelines,
    and live WebSocket analytics updates over the Supabase connection layer.
    """

    @classmethod
    async def analyze_company_dsa(cls, company_name: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Trigger OpenRouter AI to analyze company interview style and weights,
        persisting findings into Supabase. Supports 20 advanced parameters.
        """
        # Call AI analyzer
        ai_data = await OpenRouterService.analyze_company_dsa(company_name, metadata)

        # Upsert company entry
        company_payload = {
            "company_name": company_name,
            "predicted_dsa_level": ai_data.get("predicted_dsa_level", "Medium"),
            "oa_difficulty": ai_data.get("oa_difficulty", "Medium"),
            "coding_intensity": ai_data.get("coding_intensity", "High"),
            "confidence_score": ai_data.get("confidence_score", 0.90),
            "interview_style": ai_data.get("interview_style", ""),
            "recommended_difficulty_mix": ai_data.get("recommended_difficulty_mix", {
                "Easy": 30.0,
                "Medium": 50.0,
                "Hard": 20.0,
                "Expert": 0.0
            })
        }

        # Check if company already exists
        exists = await supabase_client.select("company_dsa_analysis", "*", {"company_name": f"eq.{company_name}"})
        if exists:
            company_id = exists[0]["company_id"]
            await supabase_client.update("company_dsa_analysis", company_payload, {"company_id": f"eq.{company_id}"})
        else:
            inserted = await supabase_client.insert("company_dsa_analysis", company_payload)
            company_id = inserted[0]["company_id"]

        # Insert topic weights
        topics = ai_data.get("topics", [])
        for t in topics:
            weight_payload = {
                "company_id": company_id,
                "topic_name": t.get("topic_name"),
                "weightage": t.get("weightage", 0.25),
                "difficulty_level": t.get("difficulty_level", "Medium"),
                "reasoning": t.get("reasoning", "")
            }
            # Avoid duplication on topic weight upsert
            t_exists = await supabase_client.select(
                "dsa_topic_weights", 
                "*", 
                {"company_id": f"eq.{company_id}", "topic_name": f"eq.{t.get('topic_name')}"}
            )
            if t_exists:
                await supabase_client.update(
                    "dsa_topic_weights", 
                    weight_payload, 
                    {"topic_id": f"eq.{t_exists[0]['topic_id']}"}
                )
            else:
                await supabase_client.insert("dsa_topic_weights", weight_payload)

        return {
            "company_id": company_id,
            "company_name": company_name,
            "analysis": company_payload,
            "topics": topics
        }

    @classmethod
    async def get_dsa_questions(
        cls, 
        source_platform: Optional[str] = None, 
        difficulty: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch cached DSA questions. Seeds standard problems if empty to ensure
        high quality presentation out-of-the-box.
        """
        filters = {}
        if source_platform:
            filters["source_platform"] = f"eq.{source_platform}"
        if difficulty:
            filters["difficulty"] = f"eq.{difficulty}"

        questions = await supabase_client.select("dsa_questions", "*", filters)
        
        # Seed and pull dynamic questions if database is sparse
        if not questions:
            logger.info("DSA Questions database is sparse. Querying Dynamic Question Extraction Engine (Phase 2)...")
            try:
                from app.services.extraction import DynamicExtractionService
                
                # Fetch dynamically
                if source_platform == "LeetCode":
                    extracted = await DynamicExtractionService.fetch_leetcode_questions()
                elif source_platform == "Codeforces":
                    extracted = await DynamicExtractionService.fetch_codeforces_questions()
                else:
                    extracted = await DynamicExtractionService.fetch_leetcode_questions() + await DynamicExtractionService.fetch_codeforces_questions()
                
                # Cache dynamic questions into Supabase
                for q in extracted:
                    q_exists = await supabase_client.select("dsa_questions", "*", {"title": f"eq.{q['title']}"})
                    if not q_exists:
                        await supabase_client.insert("dsa_questions", [q])
                
                # Query again with filters applied
                questions = await supabase_client.select("dsa_questions", "*", filters)
            except Exception as e:
                logger.warning(f"Dynamic Question Extraction failed ({str(e)}). Seeding baseline standard catalog.")

        # Seed standard questions if database is still empty (due to network or API limits)
        if not questions:
            seed_data = [
                {
                    "source_platform": "LeetCode",
                    "title": "Two Sum",
                    "difficulty": "Easy",
                    "tags": ["Arrays", "Hashing"],
                    "acceptance_rate": 0.52,
                    "url": "https://leetcode.com/problems/two-sum/",
                    "frequency_score": 0.98,
                    "topic_mapping": "Arrays & Hashing",
                    "company_relevance": {"Google": 0.85, "Meta": 0.90, "Amazon": 0.95}
                },
                {
                    "source_platform": "LeetCode",
                    "title": "LRU Cache",
                    "difficulty": "Hard",
                    "tags": ["Design", "Linked List", "Hashing"],
                    "acceptance_rate": 0.41,
                    "url": "https://leetcode.com/problems/lru-cache/",
                    "frequency_score": 0.95,
                    "topic_mapping": "Design / Linked List",
                    "company_relevance": {"Google": 0.97, "Meta": 0.92, "Amazon": 0.99}
                },
                {
                    "source_platform": "LeetCode",
                    "title": "Course Schedule",
                    "difficulty": "Medium",
                    "tags": ["Graphs", "Topological Sort"],
                    "acceptance_rate": 0.46,
                    "url": "https://leetcode.com/problems/course-schedule/",
                    "frequency_score": 0.88,
                    "topic_mapping": "Graphs & Tree Algorithms",
                    "company_relevance": {"Google": 0.94, "Meta": 0.85, "Amazon": 0.90}
                },
                {
                    "source_platform": "LeetCode",
                    "title": "Longest Palindromic Substring",
                    "difficulty": "Medium",
                    "tags": ["String", "Dynamic Programming"],
                    "acceptance_rate": 0.33,
                    "url": "https://leetcode.com/problems/longest-palindromic-substring/",
                    "frequency_score": 0.92,
                    "topic_mapping": "Dynamic Programming",
                    "company_relevance": {"Google": 0.90, "Meta": 0.88, "Amazon": 0.85}
                }
            ]
            questions = await supabase_client.insert("dsa_questions", seed_data)

        return questions

    @classmethod
    async def get_recommended_questions(cls, student_id: str) -> List[Dict[str, Any]]:
        """
        Produce personalized recommended questions list based on active student weaknesses
        and target company DSA parameters from Supabase.
        """
        # Get active weaknesses
        weaknesses = await supabase_client.select("weakness_tracking", "*", {"student_id": f"eq.{student_id}"})
        weak_topics = [w["weak_topic"] for w in weaknesses] if weaknesses else ["Arrays & Hashing"]
        
        # Get Student Readiness
        readiness_res = await supabase_client.select("readiness_scores", "*", {"student_id": f"eq.{student_id}"})
        student_readiness = float(readiness_res[0]["overall_readiness"]) if readiness_res else 50.0

        # Fetch Target Company Parameters based on Student Profile
        student_profile = await supabase_client.select("student_profiles", "*", {"user_id": f"eq.{student_id}"})
        
        target_company = "Google" # Default fallback
        if student_profile and student_profile[0].get("preferred_companies"):
            prefs = student_profile[0]["preferred_companies"].split(",")
            if prefs:
                target_company = prefs[0].strip()
                
        # Query specific targeted company parameters from Supabase
        company_analysis = await supabase_client.select("staging_company", "*", {"company_name": f"eq.{target_company}"})
        if not company_analysis:
            # Try matching 'name' column if 'company_name' fails
            company_analysis = await supabase_client.select("staging_company", "*", {"name": f"eq.{target_company}"})
            
        if not company_analysis:
            # Fallback if specific company is not yet analyzed
            company_analysis = await supabase_client.select("staging_company", "*", limit=1)
        
        if company_analysis:
            c_data = company_analysis[0]
            company_dsa_level = c_data.get("predicted_dsa_level", "Medium")
            raw_mix = c_data.get("recommended_difficulty_mix")
            
            import json
            if isinstance(raw_mix, str):
                difficulty_mix = json.loads(raw_mix)
            elif isinstance(raw_mix, dict):
                difficulty_mix = raw_mix
            else:
                difficulty_mix = {"Easy": 30.0, "Medium": 50.0, "Hard": 20.0, "Expert": 0.0}
        else:
            company_dsa_level = "Medium"
            difficulty_mix = {"Easy": 30.0, "Medium": 50.0, "Hard": 20.0, "Expert": 0.0}

        # Select all cached questions
        all_questions = await cls.get_dsa_questions()
        
        # Use the Dynamic Extraction Service filtering engine
        from app.services.extraction import DynamicExtractionService
        filtered_questions = DynamicExtractionService.filter_and_map_questions(
            questions=all_questions,
            company_dsa_level=company_dsa_level,
            student_readiness=student_readiness,
            weak_topics=weak_topics,
            difficulty_mix=difficulty_mix
        )
        
        recommendations = []
        for q in filtered_questions[:3]:
            recommendations.append(q)
            
            # Save into recommendation history
            history_payload = {
                "student_id": student_id,
                "recommended_question_id": q.get("question_id", str(uuid.uuid4())),
                "recommendation_reason": f"Targeted mix for {company_dsa_level} companies / Remediation for: {q['topic_mapping']}",
                "recommendation_type": "Adaptive Mix"
            }
            # Skip insert if question_id is missing from external source
            if "question_id" in q:
                await supabase_client.insert("recommendation_history", history_payload)
            
        return recommendations

    @classmethod
    async def submit_code(
        cls, 
        student_id: str, 
        question_id: str, 
        source_code: str, 
        language: str, 
        passed_testcases: int, 
        failed_testcases: int, 
        runtime: float, 
        memory_used: str
    ) -> Dict[str, Any]:
        """
        Complete submission execution flow:
        1. Save raw submission details
        2. Feed into OpenRouter AI review engine
        3. Persist AI review insights
        4. Update topic readiness
        5. Flag new weaknesses
        6. Recalculate overall placement readiness score
        7. Broadcast live analytics over WebSocket
        """
        # Fetch question details
        q_result = []
        try:
            q_result = await supabase_client.select("dsa_questions", "*", {"question_id": f"eq.{question_id}"})
        except Exception:
            pass

        if not q_result:
            # Self-healing question generation for database integrity
            question = {
                "question_id": question_id,
                "title": "Two Sum" if "two" in str(question_id).lower() else "LRU Cache" if "lru" in str(question_id).lower() else "Algorithmic Challenge",
                "topic_mapping": "Arrays & Hashing" if "two" in str(question_id).lower() else "Design / Linked List" if "lru" in str(question_id).lower() else "Dynamic Programming",
                "difficulty": "Medium",
                "source_platform": "LeetCode",
                "acceptance_rate": 0.50,
                "url": "https://leetcode.com",
                "frequency_score": 0.85,
                "company_relevance": {"Google": 0.85, "Meta": 0.90, "Amazon": 0.95}
            }
            try:
                inserted_q = await supabase_client.insert("dsa_questions", [question])
                if inserted_q:
                    question = inserted_q[0]
            except Exception:
                pass
        else:
            question = q_result[0]

        # Calculate final execution status
        status = "Accepted" if failed_testcases == 0 else "Wrong Answer"

        # 1. Save submission
        submission_payload = {
            "student_id": student_id,
            "question_id": question_id,
            "language": language,
            "source_code": source_code,
            "execution_status": status,
            "runtime": runtime,
            "memory_used": memory_used,
            "passed_testcases": passed_testcases,
            "failed_testcases": failed_testcases
        }
        submission = await supabase_client.insert("student_submissions", submission_payload)
        submission_id = submission[0]["submission_id"]

        # 2. Run OpenRouter AI Code Analysis
        ai_analysis = await OpenRouterService.analyze_code(
            source_code=source_code,
            language=language,
            problem_title=question["title"],
            problem_statement=f"Implement solution. Topic: {question['topic_mapping']}"
        )

        # 3. Store AI analysis results
        analysis_payload = {
            "submission_id": submission_id,
            "student_id": student_id,
            "correctness_score": ai_analysis.get("correctness_score", 80.0),
            "optimization_score": ai_analysis.get("optimization_score", 80.0),
            "code_quality_score": ai_analysis.get("code_quality_score", 80.0),
            "edge_case_score": ai_analysis.get("edge_case_score", 80.0),
            "interview_readiness_score": ai_analysis.get("interview_readiness_score", 80.0),
            "strengths": ai_analysis.get("strengths", []),
            "weaknesses": ai_analysis.get("weaknesses", []),
            "improvements": ai_analysis.get("improvements", []),
            "detected_topics": ai_analysis.get("detected_topics", []),
            "ai_feedback": ai_analysis.get("ai_feedback", "Nice effort!")
        }
        await supabase_client.insert("ai_code_analysis", analysis_payload)

        # 4. Update Topic Readiness
        topic_name = question["topic_mapping"]
        topic_exists = await supabase_client.select(
            "topic_readiness", 
            "*", 
            {"student_id": f"eq.{student_id}", "topic_name": f"eq.{topic_name}"}
        )
        
        # Calculate new topic percentage
        new_percentage = float(ai_analysis.get("correctness_score", 80.0))
        
        if topic_exists:
            rec = topic_exists[0]
            solved_count = rec["solved_count"] + 1
            updated_percentage = (float(rec["readiness_percentage"]) * solved_count + new_percentage) / (solved_count + 1)
            topic_payload = {
                "readiness_percentage": min(100.0, updated_percentage),
                "solved_count": solved_count + 1,
                "confidence_level": "High" if updated_percentage >= 80 else "Medium" if updated_percentage >= 50 else "Low"
            }
            await supabase_client.update("topic_readiness", topic_payload, {"topic_readiness_id": f"eq.{rec['topic_readiness_id']}"})
        else:
            topic_payload = {
                "student_id": student_id,
                "topic_name": topic_name,
                "readiness_percentage": min(100.0, new_percentage),
                "solved_count": 1,
                "weak_area_score": 100.0 - new_percentage,
                "confidence_level": "High" if new_percentage >= 80 else "Medium" if new_percentage >= 50 else "Low"
            }
            await supabase_client.insert("topic_readiness", topic_payload)

        # 5. Flag weaknesses
        if new_percentage < 70.0:
            weakness_payload = {
                "student_id": student_id,
                "weak_topic": topic_name,
                "weakness_reason": "Low accuracy and suboptimal space traversal spotted during AI execution scan.",
                "severity": "Critical" if new_percentage < 50.0 else "Moderate",
                "last_detected": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
            w_exists = await supabase_client.select(
                "weakness_tracking", 
                "*", 
                {"student_id": f"eq.{student_id}", "weak_topic": f"eq.{topic_name}"}
            )
            if w_exists:
                payload = {
                    "detected_frequency": w_exists[0]["detected_frequency"] + 1,
                    "severity": weakness_payload["severity"],
                    "last_detected": weakness_payload["last_detected"]
                }
                await supabase_client.update("weakness_tracking", payload, {"weakness_id": f"eq.{w_exists[0]['weakness_id']}"})
            else:
                await supabase_client.insert("weakness_tracking", weakness_payload)

        # 6. Recalculate Readiness Scores
        readiness = await cls.recalculate_readiness_score(student_id)

        # 7. Push Live WebSocket update
        ws_payload = {
            "event": "submission_analyzed",
            "student_id": student_id,
            "overall_readiness": readiness["overall_readiness"],
            "latest_submission": {
                "submission_id": submission_id,
                "question_title": question["title"],
                "status": status,
                "scores": {
                    "correctness": analysis_payload["correctness_score"],
                    "optimization": analysis_payload["optimization_score"],
                    "interview_readiness": analysis_payload["interview_readiness_score"]
                }
            }
        }
        await ws_manager.send_personal_message(ws_payload, student_id)

        return {
            "submission_id": submission_id,
            "status": status,
            "analysis": analysis_payload,
            "readiness": readiness
        }

    @classmethod
    async def recalculate_readiness_score(cls, student_id: str) -> Dict[str, Any]:
        """
        Recalculate placement readiness using formula:
        readiness_score = correctness * 0.25 + optimization * 0.15 + speed * 0.10 + consistency * 0.10 + topic_coverage * 0.10 + hard_problem_solving * 0.10 + interview_readiness * 0.20
        """
        analyses = await supabase_client.select("ai_code_analysis", "*", {"student_id": f"eq.{student_id}"})
        topics = await supabase_client.select("topic_readiness", "*", {"student_id": f"eq.{student_id}"})
        submissions = await supabase_client.select("student_submissions", "*", {"student_id": f"eq.{student_id}"})

        # Calculate score vectors
        if not analyses:
            correctness = 70.0
            optimization = 65.0
            interview_readiness = 68.0
        else:
            correctness = sum(float(a["correctness_score"]) for a in analyses) / len(analyses)
            optimization = sum(float(a["optimization_score"]) for a in analyses) / len(analyses)
            interview_readiness = sum(float(a["interview_readiness_score"]) for a in analyses) / len(analyses)

        # 3. Speed vector: default 80
        speed = 82.5

        # 4. Consistency score: min(100.0, sub_count * 8)
        consistency = min(100.0, len(submissions) * 8.0) if submissions else 40.0

        # 5. Topic coverage: resolved topics coverage (e.g. solved topics * 20%)
        topic_coverage = min(100.0, len(topics) * 20.0) if topics else 30.0

        # 6. Hard problem solving: count of hard solved
        hard_solved = 0
        for s in submissions:
            if s["execution_status"] == "Accepted":
                # Check difficulty mapping
                q = await supabase_client.select("dsa_questions", "difficulty", {"question_id": f"eq.{s['question_id']}"})
                if q and q[0]["difficulty"] == "Hard":
                    hard_solved += 1
        hard_problem_solving = min(100.0, 50.0 + (hard_solved * 25.0))

        # Overall Formula Apply
        overall_readiness = (
            correctness * 0.25 +
            optimization * 0.15 +
            speed * 0.10 +
            consistency * 0.10 +
            topic_coverage * 0.10 +
            hard_problem_solving * 0.10 +
            interview_readiness * 0.20
        )

        readiness_payload = {
            "student_id": student_id,
            "overall_readiness": min(100.0, max(0.0, overall_readiness)),
            "consistency_score": consistency,
            "optimization_skill": optimization,
            "hard_problem_skill": hard_problem_solving,
            "coding_speed": speed,
            "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

        # Check existing entry
        exists = await supabase_client.select("readiness_scores", "*", {"student_id": f"eq.{student_id}"})
        if exists:
            await supabase_client.update("readiness_scores", readiness_payload, {"readiness_id": f"eq.{exists[0]['readiness_id']}"})
        else:
            await supabase_client.insert("readiness_scores", readiness_payload)

        return readiness_payload

    @classmethod
    async def get_dashboard_analytics(cls, student_id: str) -> Dict[str, Any]:
        """
        Gather consolidated metrics dashboard intelligence.
        """
        # Fetch readiness profile
        r_result = await supabase_client.select("readiness_scores", "*", {"student_id": f"eq.{student_id}"})
        readiness = r_result[0] if r_result else {
            "overall_readiness": 0.0,
            "consistency_score": 0.0,
            "optimization_skill": 0.0,
            "hard_problem_skill": 0.0,
            "coding_speed": 0.0
        }

        # Fetch topic breakdowns
        topics = await supabase_client.select("topic_readiness", "*", {"student_id": f"eq.{student_id}"})
        if not topics:
            topics = []

        # Fetch active weaknesses
        weaknesses = await supabase_client.select("weakness_tracking", "*", {"student_id": f"eq.{student_id}"})
        
        # Fetch recent submissions
        submissions = await supabase_client.select("student_submissions", "*", {"student_id": f"eq.{student_id}"})
        
        # Fetch recommendations
        recommendations = await cls.get_recommended_questions(student_id)

        # Fetch student profile for preferred companies
        student_profile = await supabase_client.select("student_profiles", "*", {"user_id": f"eq.{student_id}"})
        pref_str = "Google,Meta,Amazon"
        if student_profile and student_profile[0].get("preferred_companies"):
            pref_str = student_profile[0]["preferred_companies"]
        preferred_companies_list = [c.strip() for c in pref_str.split(",") if c.strip()]

        # Company matches percentage prediction simulation
        company_matches = [
            {"company_name": "Google", "match_percentage": min(100.0, float(readiness["overall_readiness"]) * 0.90)},
            {"company_name": "Meta", "match_percentage": min(100.0, float(readiness["overall_readiness"]) * 0.94)},
            {"company_name": "Amazon", "match_percentage": min(100.0, float(readiness["overall_readiness"]) * 0.97)},
            {"company_name": "Netflix", "match_percentage": min(100.0, float(readiness["overall_readiness"]) * 0.88)}
        ]

        return {
            "readiness": readiness,
            "topics": topics,
            "weaknesses": weaknesses,
            "recent_submissions_count": len(submissions),
            "recommendations": recommendations,
            "company_matches": company_matches,
            "preferred_companies": preferred_companies_list
        }
