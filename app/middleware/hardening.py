import uuid
import asyncio
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from app.schemas.common import APIResponse
from app.core.logging_config import request_id_var

logger = logging.getLogger(__name__)

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Extract request ID from header or generate a new UUID
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        
        # 2. Store in contextvar for logging integration
        token = request_id_var.set(request_id)
        
        # 3. Attach directly to request state for middleware access
        request.state.request_id = request_id
        
        try:
            response: Response = await call_next(request)
            # 5. Inject correlation ID into the response headers
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            request_id_var.reset(token)

class TimeoutMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, timeout_seconds: float = 60.0):
        super().__init__(app)
        self.timeout_seconds = timeout_seconds

    async def dispatch(self, request: Request, call_next):
        # Exempt health routes from strict timeout if desired, but 60s is extremely generous
        try:
            return await asyncio.wait_for(call_next(request), timeout=self.timeout_seconds)
        except asyncio.TimeoutError:
            logger.error(f"Request timeout exceeded after {self.timeout_seconds}s for route: {request.url.path}")
            
            response_content = APIResponse(
                success=False,
                message="Request execution timeout exceeded. The upstream operation took too long.",
                data=None,
                errors="GATEWAY_TIMEOUT"
            )
            return JSONResponse(
                status_code=504,
                content=response_content.model_dump()
            )
