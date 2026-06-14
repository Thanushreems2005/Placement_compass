import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    
    skill_level = Column(String, nullable=False)  # Level taken: Beginner, Intermediate, Advanced
    score = Column(Integer, nullable=False)  # 0 to 100
    accuracy = Column(Float, nullable=False)  # 0.0 to 100.0
    speed_index = Column(Float, nullable=False)  # Overall seconds taken
    speed_category = Column(String, default="Optimal", nullable=False)  # Optimal, Standard, Slow
    topic_scores = Column(Text, nullable=False)  # JSON-encoded dictionary of topic-wise performance
    ai_analysis = Column(Text, nullable=False)  # Markdown AI comprehensive analysis and action plan
    completed = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", backref="assessments")
