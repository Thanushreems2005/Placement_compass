import logging
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any

from app.services.pr_validation_service import pr_validation_service
from LANGGRAPH.nodes.pr_evaluation import evaluate_pr_node

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/submissions", tags=["submissions"])

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
