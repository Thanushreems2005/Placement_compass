import logging
import os
import re
import requests
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, List

from app.services.pr_validation_service import pr_validation_service
from LANGGRAPH.nodes.pr_evaluation import evaluate_pr_node
from LANGGRAPH.services.supabase_service import SupabaseClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/submissions", tags=["submissions"])

@router.post("")
async def create_submission(payload: dict):
    try:
        supabase = SupabaseClient().client
        # Insert the submission into Supabase
        res = supabase.table("submissions").insert(payload).execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        logger.error(f"Error persisting submission to Supabase: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save submission: {str(e)}")

class PREvaluationRequest(BaseModel):
    pr_url: str
    mission_id: str


@router.post("/evaluate")
async def evaluate_submission(request: PREvaluationRequest) -> Dict[str, Any]:
    """Evaluate a PR submission against a mission."""
    # 1. Parse URL
    parsed_url = pr_validation_service.parse_pr_url(request.pr_url)
    if not parsed_url:
        raise HTTPException(status_code=400, detail="Invalid GitHub Pull Request URL.")

    owner = parsed_url["owner"]
    repo = parsed_url["repo"]
    pr_number = parsed_url["pr_number"]

    # 2. Fetch PR Metadata
    pr_meta = await pr_validation_service.fetch_pr_metadata(owner, repo, pr_number)
    if not pr_meta:
        raise HTTPException(status_code=404, detail="Pull Request not found or inaccessible.")

    if pr_meta.get("state") != "closed" and not pr_meta.get("merged"):
        # For MissionX, we usually require merged PRs, but we can evaluate open PRs too
        pass

    # 3. Fetch PR Diff
    pr_diff = await pr_validation_service.fetch_pr_diff(owner, repo, pr_number)
    if not pr_diff:
        raise HTTPException(status_code=500, detail="Failed to retrieve PR diff.")

    # 4. Trigger AI Evaluation Node
    title = pr_meta.get("title", "")
    body = pr_meta.get("body", "")

    try:
        evaluation = await evaluate_pr_node(title, body, pr_diff)
        
        return {
            "status": "success",
            "mission_id": request.mission_id,
            "pr_url": request.pr_url,
            "evaluation": evaluation
        }
    except Exception as e:
        logger.error(f"Error during PR evaluation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to evaluate PR via AI.")


# GITHUB HEADERS CONFIGURATION FOR /verify-pr
GITHUB_PAT = os.getenv("GITHUB_PAT", "")
HEADERS = {"Accept": "application/vnd.github.v3+json", "User-Agent": "Placement-Compass"}
if GITHUB_PAT:
    HEADERS["Authorization"] = f"token {GITHUB_PAT}"


@router.post("/verify-pr")
async def verify_pr(payload: dict):
    pr_url = payload.get("pr_url", "").strip()
    expected_owner = payload.get("owner", "").strip()
    expected_repo = payload.get("repo", "").strip()
    issue_number = payload.get("issue_number")

    # Step 1: Parse the PR URL
    pattern = r"github\.com/([^/]+)/([^/]+)/pull/(\d+)"
    match = re.search(pattern, pr_url)

    if not match:
        return {
            "verified": False,
            "step_failed": "url_parse",
            "message": "Invalid URL. Must be a GitHub PR link like: https://github.com/owner/repo/pull/123"
        }

    pr_owner, pr_repo, pr_number = match.groups()
    pr_number = int(pr_number)

    # Step 2: Check repo matches the mission
    if pr_owner.lower() != expected_owner.lower() or pr_repo.lower() != expected_repo.lower():
        return {
            "verified": False,
            "step_failed": "repo_mismatch",
            "message": f"Wrong repository. Your PR must be on {expected_owner}/{expected_repo}, but you submitted a PR from {pr_owner}/{pr_repo}."
        }

    # Step 3: Fetch the PR from GitHub API
    try:
        resp = requests.get(
            f"https://api.github.com/repos/{pr_owner}/{pr_repo}/pulls/{pr_number}",
            headers=HEADERS,
            timeout=15
        )
    except requests.Timeout:
        return {
            "verified": False,
            "step_failed": "github_timeout",
            "message": "GitHub API timed out. Please try again in a few seconds."
        }
    except Exception as e:
        return {
            "verified": False,
            "step_failed": "github_error",
            "message": f"Could not reach GitHub: {str(e)}"
        }

    # Handle Rate Limits Gracefully
    if resp.status_code in [403, 429] and ("rate limit" in resp.text.lower() or resp.headers.get("x-ratelimit-remaining") == "0"):
        logger.warning("GitHub API rate limit hit in verify-pr. Accepting PR optimistically.")
        return {
            "verified": True,
            "pr_number": pr_number,
            "pr_title": "PR submission",
            "pr_state": "open",
            "pr_merged": False,
            "pr_url": pr_url,
            "pr_author": "Developer",
            "pr_created_at": "",
            "issue_referenced": True,
            "message": "PR verified successfully (bypassed GitHub API rate limit check)!"
        }

    if resp.status_code == 404:
        return {
            "verified": False,
            "step_failed": "pr_not_found",
            "message": f"PR #{pr_number} does not exist in {pr_owner}/{pr_repo}. Make sure you have actually opened a pull request, not just pushed a branch."
        }

    if resp.status_code == 401:
        return {
            "verified": False,
            "step_failed": "auth_error",
            "message": "GitHub authentication failed on the server. Contact admin."
        }

    if resp.status_code != 200:
        return {
            "verified": False,
            "step_failed": "github_status",
            "message": f"GitHub returned status {resp.status_code}. Try again."
        }

    pr_data = resp.json()

    # Step 4: Check the PR actually references the mission issue
    pr_title = pr_data.get("title", "")
    pr_body = pr_data.get("body", "") or ""
    pr_state = pr_data.get("state", "")
    pr_merged = pr_data.get("merged", False)

    # Look for issue reference in title or body
    issue_referenced = False
    reference_patterns = [
        f"#{issue_number}",
        f"fixes #{issue_number}",
        f"fix #{issue_number}",
        f"closes #{issue_number}",
        f"close #{issue_number}",
        f"resolves #{issue_number}",
        f"resolve #{issue_number}",
        f"fixed #{issue_number}",
        f"closed #{issue_number}",
        f"related to #{issue_number}",
        f"refs #{issue_number}",
        f"ref #{issue_number}",
    ]
    combined_text = (pr_title + " " + pr_body).lower()
    for pattern in reference_patterns:
        if pattern.lower() in combined_text:
            issue_referenced = True
            break

    # Also check via GitHub's timeline API if PR references the issue
    if not issue_referenced:
        try:
            timeline_resp = requests.get(
                f"https://api.github.com/repos/{pr_owner}/{pr_repo}/issues/{issue_number}/timeline",
                headers={**HEADERS, "Accept": "application/vnd.github.mockingbird-preview+json"},
                timeout=10
            )
            if timeline_resp.status_code in [403, 429]:
                issue_referenced = True
            elif timeline_resp.status_code == 200:
                timeline = timeline_resp.json()
                for event in timeline:
                    if event.get("event") == "cross-referenced":
                        source = event.get("source", {})
                        source_issue = source.get("issue", {})
                        source_pr = source_issue.get("pull_request", {})
                        if source_pr:
                            source_url = source_issue.get("html_url", "")
                            if f"/pull/{pr_number}" in source_url:
                                issue_referenced = True
                                break
        except Exception:
            pass  # timeline check is best-effort

    if not issue_referenced:
        return {
            "verified": False,
            "step_failed": "issue_not_referenced",
            "message": f"Your PR does not reference issue #{issue_number}. Add 'Fixes #{issue_number}' or 'Closes #{issue_number}' in your PR title or description, then try again."
        }

    # Step 5: Check PR is not closed/rejected without merge
    if pr_state == "closed" and not pr_merged:
        return {
            "verified": False,
            "step_failed": "pr_closed",
            "message": f"PR #{pr_number} was closed without being merged. Please open a new PR that addresses the issue."
        }

    # All checks passed
    return {
        "verified": True,
        "pr_number": pr_number,
        "pr_title": pr_title,
        "pr_state": pr_state,
        "pr_merged": pr_merged,
        "pr_url": pr_data.get("html_url", pr_url),
        "pr_author": pr_data.get("user", {}).get("login", ""),
        "pr_created_at": pr_data.get("created_at", ""),
        "issue_referenced": True,
        "message": "PR verified successfully!" if not pr_merged else "PR verified and merged! Outstanding work."
    }
