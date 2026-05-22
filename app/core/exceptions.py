from fastapi import Request
from fastapi.responses import JSONResponse
from app.schemas.common import APIResponse

async def global_exception_handler(request: Request, exc: Exception):
    response = APIResponse(
        success=False,
        message="An unexpected error occurred.",
        data=None,
        errors=str(exc)
    )
    return JSONResponse(
        status_code=500,
        content=response.model_dump()
    )

class NotFoundException(Exception):
    def __init__(self, name: str):
        self.name = name

async def not_found_exception_handler(request: Request, exc: NotFoundException):
    response = APIResponse(
        success=False,
        message=f"{exc.name} not found.",
        data=None
    )
    return JSONResponse(
        status_code=404,
        content=response.model_dump()
    )
