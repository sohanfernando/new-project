from pydantic import BaseModel, Field, field_validator
from typing import Optional
import re

EMAIL_REGEX = re.compile(r"^[\w\.\+-]+@[\w\.-]+\.\w+$")

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class UserRegister(BaseModel):
    email: str
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters long")
    role: str = Field("Candidate", description="User role: Candidate, Recruiter, or Admin")
    level: str = Field("None", description="Seniority level: Intern, Associate/Junior, Mid-Level, Senior, Lead/Principal, or None")
    title_role: Optional[str] = Field(None, description="Specific professional title like Software Engineer, QA Engineer, etc.")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        if not EMAIL_REGEX.match(v):
            raise ValueError("Invalid email address format")
        return v.lower()

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        allowed = ["Candidate", "Recruiter", "Admin"]
        if v not in allowed:
            raise ValueError(f"Role must be one of {allowed}")
        return v

    @field_validator("level")
    @classmethod
    def validate_level(cls, v):
        allowed = ["Intern", "Associate/Junior", "Mid-Level", "Senior", "Lead/Principal", "None"]
        if v not in allowed:
            raise ValueError(f"Level must be one of {allowed}")
        return v

class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        if not EMAIL_REGEX.match(v):
            raise ValueError("Invalid email address format")
        return v.lower()
