from app.database import Base
from app.models.user import User
from app.models.student import Student
from app.models.company import Company
from app.models.placement import PlacementDrive, Application, Interview
from app.models.notification import Notification
from app.models.career import (
    StudentSkill,
    StudentCertification,
    StudentInternship,
    StudentProject,
    StudentResume,
    ReadinessReport,
    ImprovementRecommendation,
)
