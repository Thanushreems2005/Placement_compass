from pydantic import BaseModel, Field
from typing import List, Optional, Any

class MissionCard(BaseModel):
    id: str
    number: int = 0
    title: str
    repo: str
    repo_name: str = ""
    difficulty: str = Field(default="Medium")
    labels: List[str]
    skills: List[str] = Field(default=["Open Source", "Git"])
    estimated_time: str = Field(default="2-4 hours")
    github_url: str
    html_url: str = ""
    company: str
    xp: int = 250
    comments: int = 0
    body: str = ""
    created_at: str = ""

class MissionsResponse(BaseModel):
    missions: List[MissionCard]
    cached: bool = False
    source: str = "github"
    total_count: int = 0
    rate_limited: bool = False
