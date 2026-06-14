import httpx
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("app.services.extraction")

class DynamicExtractionService:
    """
    Dynamic Question Extraction Engine (Phase 2).
    Fetches real-time DSA coding challenges from LeetCode GraphQL and Codeforces API,
    and maps/filters them according to company DSA level, student readiness, and weaknesses.
    """

    LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql"
    CODEFORCES_API_URL = "https://codeforces.com/api/problemset.problems"

    @classmethod
    async def fetch_leetcode_questions(cls, limit: int = 15) -> List[Dict[str, Any]]:
        """
        Fetch questions from LeetCode public GraphQL.
        Extracts title, difficulty, tags, acceptance rate, and URL slug.
        """
        body = {
            "query": """
            query problemsetQuestionList($limit: Int) {
              problemsetQuestionList: questionList(
                categorySlug: ""
                limit: $limit
                skip: 0
                filters: {}
              ) {
                questions: data {
                  title
                  titleSlug
                  difficulty
                  acRate
                  topicTags {
                    name
                  }
                }
              }
            }
            """,
            "variables": {"limit": limit}
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    cls.LEETCODE_GRAPHQL_URL,
                    json=body,
                    headers={"Content-Type": "application/json"},
                    timeout=10.0
                )
                if response.status_code == 200:
                    data = response.json()
                    questions_data = data.get("data", {}).get("problemsetQuestionList", {}).get("questions", [])
                    extracted = []
                    for q in questions_data:
                        extracted.append({
                          "title": q["title"],
                          "difficulty": q["difficulty"],
                          "tags": [tag["name"] for tag in q.get("topicTags", [])],
                          "acceptance_rate": q["acRate"] / 100.0 if q["acRate"] else 0.50,
                          "url": f"https://leetcode.com/problems/{q['titleSlug']}/",
                          "source_platform": "LeetCode",
                          "frequency_score": 0.85, # Default priority index
                          "topic_mapping": q.get("topicTags", [{}])[0].get("name", "Arrays & Hashing") if q.get("topicTags") else "Arrays & Hashing"
                        })
                    if extracted:
                        logger.info(f"Successfully extracted {len(extracted)} LeetCode challenges.")
                        return extracted
        except Exception as e:
            logger.warning(f"LeetCode live GraphQL extraction offline ({str(e)}). Engaging high-fidelity sandbox extractor.")
        
        # High fidelity fallback sandbox data
        return cls._get_fallback_leetcode_questions()

    @classmethod
    async def fetch_codeforces_questions(cls, limit: int = 15) -> List[Dict[str, Any]]:
        """
        Fetch coding problems from Codeforces public API.
        Extracts problem name, rating/difficulty, tags, and contest ID.
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(cls.CODEFORCES_API_URL, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "OK":
                        result = data.get("result", {})
                        problems = result.get("problems", [])[:limit]
                        extracted = []
                        for p in problems:
                            rating = p.get("rating", 1200)
                            # Map CF rating to standard difficulty
                            diff = "Easy" if rating < 1200 else "Medium" if rating < 1900 else "Hard"
                            extracted.append({
                                "title": p["name"],
                                "difficulty": diff,
                                "tags": p.get("tags", []),
                                "acceptance_rate": 0.45,
                                "url": f"https://codeforces.com/problemset/problem/{p['contestId']}/{p['index']}",
                                "source_platform": "Codeforces",
                                "frequency_score": 0.80,
                                "topic_mapping": "Dynamic Programming" if "dp" in p.get("tags", []) else "Graphs & Tree Algorithms" if "graphs" in p.get("tags", []) else "Arrays & Hashing"
                            })
                        if extracted:
                            logger.info(f"Successfully extracted {len(extracted)} Codeforces challenges.")
                            return extracted
        except Exception as e:
            logger.warning(f"Codeforces API live sync offline ({str(e)}). Engaging high-fidelity sandbox extractor.")

        return cls._get_fallback_codeforces_questions()

    @classmethod
    def filter_and_map_questions(
        cls,
        questions: List[Dict[str, Any]],
        company_dsa_level: str,
        student_readiness: float,
        weak_topics: List[str],
        difficulty_mix: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """
        Intelligent filtering engine (Phase 2).
        Sorts, maps, and prioritizes questions matching the target company difficulty mix,
        remediating student weakness areas and matching current readiness thresholds.
        """
        filtered = []
        
        # Sort questions prioritizing weak topics first
        weak_topics_lower = [t.lower() for t in weak_topics]
        
        # Score relevance
        for q in questions:
            relevance = 0.0
            # Weakness boost
            if any(w in q["topic_mapping"].lower() for w in weak_topics_lower):
                relevance += 0.50
            
            # Difficulty matching boost
            target_pct = difficulty_mix.get(q["difficulty"], 0.0)
            relevance += (target_pct / 100.0) * 0.30
            
            # Acceptance rate boost (remediate with higher acceptance for lower readiness)
            if student_readiness < 50.0:
                relevance += q["acceptance_rate"] * 0.20
            else:
                relevance += (1.0 - q["acceptance_rate"]) * 0.20

            q_copy = dict(q)
            q_copy["extraction_relevance"] = relevance
            filtered.append(q_copy)

        # Sort by relevance descending
        filtered.sort(key=lambda x: x["extraction_relevance"], reverse=True)
        return filtered

    @classmethod
    def _get_fallback_leetcode_questions(cls) -> List[Dict[str, Any]]:
        return [
            {
                "title": "Subtree of Another Tree",
                "difficulty": "Easy",
                "tags": ["Trees", "Depth-First Search"],
                "acceptance_rate": 0.47,
                "url": "https://leetcode.com/problems/subtree-of-another-tree/",
                "source_platform": "LeetCode",
                "frequency_score": 0.90,
                "topic_mapping": "Graphs & Tree Algorithms"
            },
            {
                "title": "Network Delay Time",
                "difficulty": "Medium",
                "tags": ["Graphs", "Shortest Path", "Heap"],
                "acceptance_rate": 0.53,
                "url": "https://leetcode.com/problems/network-delay-time/",
                "source_platform": "LeetCode",
                "frequency_score": 0.92,
                "topic_mapping": "Graphs & Tree Algorithms"
            },
            {
                "title": "Edit Distance",
                "difficulty": "Hard",
                "tags": ["String", "Dynamic Programming"],
                "acceptance_rate": 0.54,
                "url": "https://leetcode.com/problems/edit-distance/",
                "source_platform": "LeetCode",
                "frequency_score": 0.88,
                "topic_mapping": "Dynamic Programming"
            },
            {
                "title": "Minimum Window Substring",
                "difficulty": "Hard",
                "tags": ["Hash Table", "String", "Sliding Window"],
                "acceptance_rate": 0.42,
                "url": "https://leetcode.com/problems/minimum-window-substring/",
                "source_platform": "LeetCode",
                "frequency_score": 0.96,
                "topic_mapping": "Arrays & Hashing"
            },
            {
                "title": "Valid Anagram",
                "difficulty": "Easy",
                "tags": ["Hash Table", "String", "Sorting"],
                "acceptance_rate": 0.64,
                "url": "https://leetcode.com/problems/valid-anagram/",
                "source_platform": "LeetCode",
                "frequency_score": 0.99,
                "topic_mapping": "Arrays & Hashing"
            }
        ]

    @classmethod
    def _get_fallback_codeforces_questions(cls) -> List[Dict[str, Any]]:
        return [
            {
                "title": "Kefa and First Steps",
                "difficulty": "Easy",
                "tags": ["dp", "implementation"],
                "acceptance_rate": 0.50,
                "url": "https://codeforces.com/problemset/problem/580/A",
                "source_platform": "Codeforces",
                "frequency_score": 0.75,
                "topic_mapping": "Dynamic Programming"
            },
            {
                "title": "Cut Ribbon",
                "difficulty": "Medium",
                "tags": ["dp", "greedy"],
                "acceptance_rate": 0.43,
                "url": "https://codeforces.com/problemset/problem/189/A",
                "source_platform": "Codeforces",
                "frequency_score": 0.82,
                "topic_mapping": "Dynamic Programming"
            },
            {
                "title": "Registration System",
                "difficulty": "Medium",
                "tags": ["data structures", "hashing"],
                "acceptance_rate": 0.48,
                "url": "https://codeforces.com/problemset/problem/4/C",
                "source_platform": "Codeforces",
                "frequency_score": 0.88,
                "topic_mapping": "Arrays & Hashing"
            }
        ]
