import logging
import os
import requests
from fastapi import APIRouter, HTTPException
from LANGGRAPH.services.supabase_service import SupabaseClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

GITHUB_PAT = os.getenv("GITHUB_PAT", "")
HEADERS = {"Accept": "application/vnd.github.v3+json", "User-Agent": "Placement-Compass"}
if GITHUB_PAT:
    HEADERS["Authorization"] = f"token {GITHUB_PAT}"

@router.get("/{user_id}")
async def get_portfolio(user_id: str):
    try:
        supabase = SupabaseClient().client
    except Exception as e:
        logger.error(f"[Portfolio] Supabase client init error: {e}")
        raise HTTPException(status_code=500, detail="Supabase connection failed")

    # Fetch all completed submissions for this user from Supabase
    # DO NOT modify any table — just read from submissions table
    try:
        submissions = supabase.table("submissions") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("status", "completed") \
            .order("completed_at", desc=True) \
            .execute()
        completed = submissions.data or []
    except Exception as e:
        logger.error(f"[Portfolio] Supabase query error: {e}")
        completed = []

    # For each completed submission, fetch live PR status from GitHub
    enriched = []
    for sub in completed:
        pr_url = sub.get("pr_url", "")
        owner = sub.get("owner", "")
        repo = sub.get("repo", "")
        pr_number = sub.get("pr_number")
        
        pr_status = "submitted"
        pr_merged = False
        pr_title = sub.get("pr_title", "")
        
        # Fetch live PR status from GitHub
        if owner and repo and pr_number:
            try:
                resp = requests.get(
                    f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}",
                    headers=HEADERS,
                    timeout=8
                )
                if resp.status_code == 200:
                    pr_data = resp.json()
                    pr_merged = pr_data.get("merged", False)
                    pr_status = "merged" if pr_merged else pr_data.get("state", "open")
                    pr_title = pr_data.get("title", pr_title)
            except Exception as e:
                logger.warning(f"[Portfolio] GitHub API error for PR {owner}/{repo}#{pr_number}: {e}")
                pass  # use stored data if GitHub unreachable

        enriched.append({
            "id": sub.get("id"),
            "mission_title": sub.get("mission_title", ""),
            "repo_full_name": f"{owner}/{repo}",
            "owner": owner,
            "repo": repo,
            "owner_avatar_url": f"https://github.com/{owner}.png?size=40",
            "pr_url": pr_url,
            "pr_number": pr_number,
            "pr_title": pr_title,
            "pr_status": pr_status,
            "pr_merged": pr_merged,
            "difficulty": sub.get("difficulty", "Beginner"),
            "xp": sub.get("xp", 100),
            "completed_at": sub.get("completed_at", ""),
            "company_name": sub.get("company_name", ""),
            "score": sub.get("score"),
            "skills": sub.get("skills", []),
        })

    # Calculate stats
    total_xp = sum(s["xp"] for s in enriched)
    total_missions = len(enriched)
    merged_prs = sum(1 for s in enriched if s["pr_merged"])
    
    # Skill frequency count
    all_skills = []
    for s in enriched:
        all_skills.extend(s.get("skills", []))
    from collections import Counter
    skill_counts = Counter(all_skills)
    
    # Proficiency level based on frequency
    verified_skills = []
    for skill, count in skill_counts.most_common(15):
        if count >= 3:
            level = "Advanced"
        elif count >= 2:
            level = "Intermediate"
        else:
            level = "Beginner"
        verified_skills.append({"skill": skill, "level": level, "count": count})

    # Company badges — earned when >= 1 mission completed for that company
    from collections import defaultdict
    company_missions = defaultdict(list)
    for s in enriched:
        company_missions[s["company_name"]].append(s)
    
    badges = []
    for company, missions in company_missions.items():
        company_xp = sum(m["xp"] for m in missions)
        badges.append({
            "company": company,
            "owner": missions[0]["owner"],
            "avatar_url": missions[0]["owner_avatar_url"],
            "missions_count": len(missions),
            "total_xp": company_xp,
            "earned_at": missions[-1]["completed_at"],
        })

    return {
        "stats": {
            "total_xp": total_xp,
            "total_missions": total_missions,
            "merged_prs": merged_prs,
            "badges_count": len(badges),
        },
        "contributions": enriched,
        "verified_skills": verified_skills,
        "badges": badges,
    }
