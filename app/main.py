import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.core.config import settings
from app.routes import auth, users, students, companies, placements, analytics, admin, notifications, health, career
from app.middleware.logging import LoggingMiddleware
from app.middleware.hardening import RequestIDMiddleware, TimeoutMiddleware
from app.core.exceptions import global_exception_handler, not_found_exception_handler, NotFoundException

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup structured JSON logging globally
    from app.core.logging_config import setup_logging
    setup_logging()
    
    logger = logging.getLogger("startup")
    logger.info("Executing Enterprise-Grade Startup Diagnostics...")
    
    # 1. Verify Environment Variables
    required_vars = ["SUPABASE_URL", "DATABASE_URL"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        logger.warning(f"Startup diagnostic check flagged missing variables: {missing_vars}")
    else:
        logger.info("Environment variables checklist: PASSED")
        
    # 2. Verify Redis Connectivity
    from app.services.redis_service import redis_service
    is_redis_alive = await redis_service.ping()
    if is_redis_alive:
        logger.info("Redis Connectivity diagnostic check: PASSED (Operational)")
    else:
        logger.warning("Redis Connectivity diagnostic check: WARNING (Offline - using local JSON fallback)")
        
    # 3. Verify Supabase Connectivity
    try:
        from LANGGRAPH.services.supabase_service import SupabaseClient
        client = SupabaseClient()
        client.client.table("companies").select("company_id").limit(1).execute()
        logger.info("Supabase Connectivity diagnostic check: PASSED")
    except Exception as e:
        logger.error(f"Supabase Connectivity diagnostic check: FAILED - {e}")
        
    # 4. Verify LangGraph Schema Load
    try:
        from LANGGRAPH.graph.workflow import app as graph_app
        logger.info("LangGraph Schema dry-run import check: PASSED")
    except Exception as e:
        logger.critical(f"LangGraph Schema dry-run import check: FAILED - {e}")

    yield
    
    # Shutdown operations
    logger.info("Executing application shutdown...")
    from app.services.redis_service import redis_service
    await redis_service.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Exception Handlers
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(NotFoundException, not_found_exception_handler)

# Middlewares (FastAPI executes them in reverse order of addition: bottom-to-top)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.add_middleware(LoggingMiddleware)
# AI orchestration can exceed 60s. Fallback recovery loops require extended windows.
# 300s is intentional for multi-agent workflows.
app.add_middleware(TimeoutMiddleware, timeout_seconds=300.0)
app.add_middleware(RequestIDMiddleware)

# Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(students.router, prefix=settings.API_V1_STR)
app.include_router(companies.router, prefix=settings.API_V1_STR)
app.include_router(placements.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(career.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "Welcome to the Placement Intel Portal API"}
