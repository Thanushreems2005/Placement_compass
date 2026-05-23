from fastapi import APIRouter
from typing import Dict, Any, List

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])

@router.get("/")
async def get_leaderboard() -> Dict[str, Any]:
    """Get the global real-time leaderboard."""
    # Since we are preserving Supabase architecture but don't have the table instantiated yet,
    # we return a robust mocked real-time payload that satisfies the frontend UI.
    mock_leaders = [
        {"id": "1", "name": "Alex Johnson", "xp": 5400, "missionsCompleted": 12, "rank": 1, "department": "Computer Science"},
        {"id": "2", "name": "Sarah Chen", "xp": 4850, "missionsCompleted": 10, "rank": 2, "department": "Software Eng"},
        {"id": "3", "name": "Michael Rodriguez", "xp": 4200, "missionsCompleted": 9, "rank": 3, "department": "Computer Science"},
        {"id": "4", "name": "Emily Taylor", "xp": 3950, "missionsCompleted": 8, "rank": 4, "department": "Data Science"},
        {"id": "5", "name": "David Kim", "xp": 3800, "missionsCompleted": 8, "rank": 5, "department": "Software Eng"},
        {"id": "6", "name": "Jessica Patel", "xp": 3500, "missionsCompleted": 7, "rank": 6, "department": "Computer Science"},
        {"id": "7", "name": "Ryan Martinez", "xp": 3200, "missionsCompleted": 6, "rank": 7, "department": "Data Science"},
        {"id": "8", "name": "Amanda White", "xp": 2900, "missionsCompleted": 5, "rank": 8, "department": "Computer Science"},
    ]

    return {
        "status": "success",
        "leaders": mock_leaders,
        "metadata": {
            "total_participants": 842,
            "your_rank": 42,
            "your_xp": 1250,
            "next_rank_xp": 1500
        }
    }
