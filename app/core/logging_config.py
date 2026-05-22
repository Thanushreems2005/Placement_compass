import json
import logging
from contextvars import ContextVar
from datetime import datetime

# Context variable to hold request_id across async tasks
request_id_var: ContextVar[str] = ContextVar("request_id", default="")

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcfromtimestamp(record.created).isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "filename": record.filename,
            "line": record.lineno,
        }
        
        # Add request_id from contextvar
        req_id = request_id_var.get()
        if req_id:
            log_data["request_id"] = req_id
            
        # Extract extra fields if present
        if hasattr(record, "execution_time_ms"):
            log_data["execution_time_ms"] = record.execution_time_ms
        if hasattr(record, "cache_hit"):
            log_data["cache_hit"] = record.cache_hit
        if hasattr(record, "status_code"):
            log_data["status_code"] = record.status_code
        if hasattr(record, "route"):
            log_data["route"] = record.route
            
        # Exception handling
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
            
        return json.dumps(log_data, ensure_ascii=False)

def setup_logging():
    root = logging.getLogger()
    
    # Remove existing stream/file handlers to avoid duplicates
    for handler in root.handlers[:]:
        root.removeHandler(handler)
        
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    root.addHandler(handler)
    root.setLevel(logging.INFO)
    
    # Route all standard framework logging back through the root handler
    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access", "fastapi"):
        sub_logger = logging.getLogger(logger_name)
        sub_logger.handlers = []
        sub_logger.propagate = True
