from pydantic import BaseModel
from typing import Optional

class CompanyBase(BaseModel):
    name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class CompanyResponse(CompanyBase):
    id: int

    class Config:
        from_attributes = True
