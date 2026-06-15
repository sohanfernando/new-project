from sqlalchemy import Column, ForeignKey, Integer, JSON, String, Text, DateTime, Float
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class CandidateDigitalTwin(Base):
    __tablename__ = "candidate_digital_twins"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidate_profiles.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    predicted_level = Column(String(255), nullable=True)
    level_confidence = Column(Float, nullable=True)
    predicted_roles = Column(JSON, nullable=True)          # list of strings
    strengths_analysis = Column(JSON, nullable=True)       # list of dicts (title, rationale)
    hidden_skills = Column(JSON, nullable=True)            # list of dicts (skill, reasoning)
    growth_potential = Column(String(255), nullable=True)
    growth_reasoning = Column(Text, nullable=True)
    recommended_paths = Column(JSON, nullable=True)        # list of strings
    interview_questions = Column(JSON, nullable=True)      # dict with technical, scenario, behavioral keys
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    candidate = relationship("CandidateProfile", back_populates="digital_twin")
