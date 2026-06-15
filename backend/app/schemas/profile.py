from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.schemas.digital_twin import DigitalTwinOut

class ProfileCreate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    skills: List[str] = []
    specialty_summary: Optional[str] = None
    suitability_suggestion: Optional[str] = None
    hr_note: Optional[str] = None
    is_strong: bool = False
    role_id: Optional[int] = None
    level_id: Optional[int] = None
    cv_text: Optional[str] = None
    cv_file_path: Optional[str] = None

    # Digital twin fields
    predicted_level: Optional[str] = None
    level_confidence: Optional[float] = None
    predicted_roles: List[str] = []
    strengths_analysis: List[Dict[str, Any]] = []
    hidden_skills: List[Dict[str, Any]] = []
    growth_potential: Optional[str] = None
    growth_reasoning: Optional[str] = None
    recommended_paths: List[str] = []
    interview_questions: Optional[Dict[str, List[str]]] = None

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    skills: Optional[List[str]] = None
    specialty_summary: Optional[str] = None
    suitability_suggestion: Optional[str] = None
    hr_note: Optional[str] = None
    is_strong: Optional[bool] = None
    role_id: Optional[int] = None
    level_id: Optional[int] = None
    cv_text: Optional[str] = None
    cv_file_path: Optional[str] = None

    # Digital twin fields
    predicted_level: Optional[str] = None
    level_confidence: Optional[float] = None
    predicted_roles: Optional[List[str]] = None
    strengths_analysis: Optional[List[Dict[str, Any]]] = None
    hidden_skills: Optional[List[Dict[str, Any]]] = None
    growth_potential: Optional[str] = None
    growth_reasoning: Optional[str] = None
    recommended_paths: Optional[List[str]] = None
    interview_questions: Optional[Dict[str, List[str]]] = None

class ProfileOut(BaseModel):
    id: int
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    skills: List[str] = []
    specialty_summary: Optional[str] = None
    suitability_suggestion: Optional[str] = None
    hr_note: Optional[str] = None
    is_strong: bool = False
    cv_text: Optional[str] = None
    cv_file_path: Optional[str] = None
    role_id: Optional[int] = None
    level_id: Optional[int] = None
    created_at: datetime
    digital_twin: Optional[DigitalTwinOut] = None

    class Config:
        from_attributes = True


