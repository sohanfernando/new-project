from sqlalchemy import Column, ForeignKey, Integer, JSON, String, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(255), nullable=True)
    
    # JSON columns for flexible structured data storage
    skills = Column(JSON, default=list, nullable=False)       # e.g., ["React", "Python", "TypeScript"]
    location = Column(String(255), nullable=True)
    specialty_summary = Column(Text, nullable=True)
    suitability_suggestion = Column(Text, nullable=True)
    hr_note = Column(Text, nullable=True)
    is_strong = Column(Boolean, default=False, nullable=False)
    
    cv_text = Column(Text, nullable=True)
    cv_file_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Foreign Keys referencing dynamic categories
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    level_id = Column(Integer, ForeignKey("levels.id"), nullable=True)

    # Relationships
    role = relationship("Role", back_populates="profiles")
    level = relationship("Level", back_populates="profiles")
    digital_twin = relationship("CandidateDigitalTwin", back_populates="candidate", uselist=False, cascade="all, delete-orphan")

