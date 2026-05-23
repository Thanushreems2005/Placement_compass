from fastapi import APIRouter, HTTPException, status
import logging
from app.models.missions import MissionsResponse
from app.services.mission_service import mission_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/missions", tags=["missions"])

@router.get("", response_model=MissionsResponse)
async def get_missions():
    try:
        return await mission_service.get_general_missions()
    except Exception as e:
        logger.error(f"Error fetching general missions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve general missions."
        )

@router.get("/default", response_model=MissionsResponse)
async def get_default_missions():
    try:
        return await mission_service.get_default_missions()
    except Exception as e:
        logger.error(f"Error fetching default missions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve default missions."
        )

@router.get("/company/{company}", response_model=MissionsResponse)
async def get_company_missions(company: str):
    try:
        return await mission_service.get_company_missions(company)
    except Exception as e:
        logger.error(f"Error fetching missions for {company}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve missions for company {company}."
        )

from pydantic import BaseModel
from typing import Dict, Any

class MissionAnalyzeRequest(BaseModel):
    title: str
    body: str

@router.post("/analyze", response_model=Dict[str, Any])
async def analyze_mission_endpoint(request: MissionAnalyzeRequest):
    try:
        from LANGGRAPH.nodes.mission_analysis import analyze_mission_node
        result = await analyze_mission_node(request.title, request.body)
        return result
    except Exception as e:
        logger.error(f"Error analyzing mission '{request.title}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze mission via AI."
        )
