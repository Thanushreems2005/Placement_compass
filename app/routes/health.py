from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.redis_service import redis_service
import time

router = APIRouter(prefix="/health", tags=["health"])

@router.get("")
async def aggregated_health(db: Session = Depends(get_db)):
    """Aggregated health check for the entire application stack."""
    results = {}
    is_all_healthy = True

    # 1. Backend check
    results["backend"] = {"status": "healthy", "timestamp": time.time()}

    # 2. Redis check
    try:
        is_redis_alive = await redis_service.ping()
        results["redis"] = {
            "status": "healthy" if is_redis_alive else "unhealthy",
            "details": "Redis is operational." if is_redis_alive else "Redis service offline."
        }
        if not is_redis_alive:
            is_all_healthy = False
    except Exception as e:
        results["redis"] = {"status": "unhealthy", "error": str(e)}
        is_all_healthy = False

    # 3. Supabase check
    try:
        from LANGGRAPH.services.supabase_service import SupabaseClient
        client = SupabaseClient()
        # Perform simple read to verify connectivity
        client.client.table("companies").select("company_id").limit(1).execute()
        results["supabase"] = {
            "status": "healthy",
            "details": "Supabase connection verified successfully."
        }
    except Exception as e:
        results["supabase"] = {"status": "unhealthy", "error": str(e)}
        is_all_healthy = False

    # 4. SQLite local database check
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        results["database"] = {
            "status": "healthy",
            "details": "Local SQLite database operational."
        }
    except Exception as e:
        results["database"] = {"status": "unhealthy", "error": str(e)}
        is_all_healthy = False

    status_code = 200 if is_all_healthy else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "healthy" if is_all_healthy else "degraded",
            "services": results
        }
    )

@router.get("/backend")
def health_backend():
    """Simple check to verify the FastAPI instance is alive."""
    return {
        "status": "healthy",
        "uptime": "operational",
        "timestamp": time.time()
    }

@router.get("/redis")
async def health_redis():
    """Verify direct Redis connectivity."""
    is_alive = await redis_service.ping()
    if is_alive:
        return {
            "status": "healthy",
            "details": "Redis service is active and responsive."
        }
    return JSONResponse(
        status_code=503,
        content={
            "status": "unhealthy",
            "details": "Cannot connect to Redis host."
        }
    )

@router.get("/supabase")
async def health_supabase():
    """Verify Supabase integration and token validity."""
    try:
        from LANGGRAPH.services.supabase_service import SupabaseClient
        client = SupabaseClient()
        client.client.table("companies").select("company_id").limit(1).execute()
        return {
            "status": "healthy",
            "details": "Supabase integration working."
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "details": f"Supabase authorization failed: {str(e)}"
            }
        )
