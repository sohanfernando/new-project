from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    order = Column(Integer, default=0, nullable=False)

    # Relationship to profiles mapped to this job role
    profiles = relationship("CandidateProfile", back_populates="role")

    @property
    def candidate_count(self) -> int:
        return len(self.profiles)
