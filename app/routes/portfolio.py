from fastapi import APIRouter, Response
from typing import Dict, Any
from app.services.badge_engine import badge_engine
from app.services.pdf_service import pdf_service

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

@router.get("/{student_id}")
async def get_portfolio(student_id: str) -> Dict[str, Any]:
    """Get a student's public portfolio with badges and verified PRs."""
    
    # Mocking data representing a Supabase pull of a student's history
    mock_history = [
        {"repo": "vercel/next.js", "pr": "Fix hydration mismatch in App Router", "xp": 500, "skills": ["React", "TypeScript"]},
        {"repo": "facebook/react", "pr": "Update concurrent mode docs", "xp": 250, "skills": ["React", "Technical Writing"]},
        {"repo": "tailwindlabs/tailwindcss", "pr": "Add container query utilities", "xp": 500, "skills": ["CSS", "Tailwind CSS"]},
    ]
    
    stats = {
        "missions_completed": len(mock_history),
        "total_xp": sum(m["xp"] for m in mock_history),
    }
    
    badges = badge_engine.evaluate_badges(stats)
    skills = badge_engine.auto_tag_skills(mock_history)
    
    return {
        "status": "success",
        "student_id": student_id,
        "stats": stats,
        "history": mock_history,
        "badges": badges,
        "skills": skills
    }

@router.get("/{student_id}/export")
async def export_portfolio_pdf(student_id: str):
    """Export the student's portfolio as a PDF."""
    # We call the get_portfolio logic (simulating internal function call)
    portfolio_data = await get_portfolio(student_id)
    
    pdf_bytes = pdf_service.generate_portfolio_pdf(portfolio_data)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=portfolio_{student_id}.pdf"
        }
    )
