from sqlalchemy import Column, Integer, String, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    industry = Column(String)
    website = Column(String)
    description = Column(Text)
    is_active = Column(Boolean, default=True)

    drives = relationship("PlacementDrive", back_populates="company")
