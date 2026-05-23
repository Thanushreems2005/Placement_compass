from datetime import datetime, timedelta
from typing import Optional, Union
from jose import jwt
import bcrypt
from app.core.config import settings

MAX_BCRYPT_BYTES = 72


def _bcrypt_bytes(password: str) -> bytes:
    return password.encode("utf-8")[:MAX_BCRYPT_BYTES]

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(_bcrypt_bytes(plain_password), hashed_password.encode("utf-8"))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(_bcrypt_bytes(password), bcrypt.gensalt()).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
