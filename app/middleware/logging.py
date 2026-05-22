from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
import time
import logging

logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # Check cache header status
        cache_status = response.headers.get("X-Cache", "MISS")
        
        # Log structured fields for the JSON formatter
        logger.info(
            f"{request.method} {request.url.path} - {response.status_code} - {process_time:.4f}s",
            extra={
                "execution_time_ms": round(process_time * 1000, 2),
                "route": request.url.path,
                "status_code": response.status_code,
                "cache_hit": cache_status == "HIT"
            }
        )
        return response
