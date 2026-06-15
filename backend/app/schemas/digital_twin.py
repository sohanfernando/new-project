from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class DigitalTwinBase(BaseModel):
    predicted_level: Optional[str] = None
    level_confidence: Optional[float] = None
    predicted_roles: List[str] = []
    strengths_analysis: List[Dict[str, Any]] = []
    hidden_skills: List[Dict[str, Any]] = []
    growth_potential: Optional[str] = None
    growth_reasoning: Optional[str] = None
    recommended_paths: List[str] = []
    interview_questions: Optional[Dict[str, List[str]]] = None

class DigitalTwinCreate(DigitalTwinBase):
    pass

class DigitalTwinOut(DigitalTwinBase):
    id: int
    candidate_id: int
    updated_at: datetime

    class Config:
        from_attributes = True
