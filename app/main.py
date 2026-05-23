import logging
import os
# Load .env early — before any other imports — so env vars are available
# regardless of how the process is launched (concurrently, direct, etc.)
from pathlib import Path as _Path
try:
    from dotenv import load_dotenv as _load_dotenv
    _env_file = _Path(__file__).resolve().parent.parent / ".env"
    if _env_file.exists():
        _load_dotenv(dotenv_path=_env_file, override=False)
except ImportError:
    pass  # python-dotenv not installed; rely on shell environment

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routes import auth, users, students, companies, placements, analytics, admin, notifications, health
from app.routes import aptitude_v2
from app.middleware.logging import LoggingMiddleware
from app.middleware.hardening import RequestIDMiddleware, TimeoutMiddleware
from app.core.exceptions import global_exception_handler, not_found_exception_handler, NotFoundException


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup structured JSON logging globally
    from app.core.logging_config import setup_logging
    setup_logging()
    
    logger = logging.getLogger("startup")
    logger.info("Executing Enterprise-Grade Startup Diagnostics...")
    
    # 1. Verify Environment Variables (read from pydantic settings, which loads .env)
    missing_vars = []
    if not settings.DATABASE_URL:
        missing_vars.append("DATABASE_URL")
    # SUPABASE_URL is read directly from os.environ after pydantic loads it
    import os
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    if not supabase_url:
        missing_vars.append("SUPABASE_URL")
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
origins = ["http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LoggingMiddleware)
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
app.include_router(aptitude_v2.router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {"message": "Welcome to the Placement Intel Portal API"}
