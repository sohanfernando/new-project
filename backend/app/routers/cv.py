from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.profile import CandidateProfile
from app.models.role import Role
from app.models.level import Level
from app.models.digital_twin import CandidateDigitalTwin
from app.schemas.profile import ProfileOut, ProfileCreate, ProfileUpdate
from app.routers.auth import get_current_user
from app.services.cv_parser import parse_cv, generate_digital_twin_only
from app.config import UPLOAD_DIR
import os
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime

router = APIRouter(prefix="/api/cv", tags=["cv"])

@router.post("/extract", response_model=Dict[str, Any])
async def extract_cv_data(
    file: UploadFile = File(...),
    role_id: Optional[int] = Form(None),
    level_id: Optional[int] = Form(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Uploads and parses a CV document, returning raw extracted details, checking for duplicates."""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".docx"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a PDF or DOCX file."
        )
        
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write uploaded file to disk: {str(e)}"
        )
        
    target_role_name = None
    target_level_name = None
    if role_id is not None:
        role_obj = db.query(Role).filter(Role.id == role_id).first()
        if role_obj:
            target_role_name = role_obj.name
    if level_id is not None:
        level_obj = db.query(Level).filter(Level.id == level_id).first()
        if level_obj:
            target_level_name = level_obj.name

    try:
        parsed_data = parse_cv(file_path, target_role=target_role_name, target_level=target_level_name)
        parsed_data["cv_file_path"] = file_path
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while parsing the CV: {str(e)}"
        )
        
    # Check for duplicate candidate (by email or phone)
    duplicate = None
    email_val = parsed_data.get("email")
    phone_val = parsed_data.get("phone")
    if email_val or phone_val:
        from sqlalchemy import or_
        filters = []
        if email_val:
            filters.append(CandidateProfile.email == email_val)
        if phone_val:
            filters.append(CandidateProfile.phone == phone_val)
        
        dup_profile = db.query(CandidateProfile).filter(or_(*filters)).first()
        if dup_profile:
            duplicate = {
                "id": dup_profile.id,
                "full_name": dup_profile.full_name,
                "email": dup_profile.email,
                "phone": dup_profile.phone,
                "role_name": dup_profile.role.name if dup_profile.role else "Not Specified",
                "level_name": dup_profile.level.name if dup_profile.level else "Not Specified"
            }
            
    parsed_data["duplicate"] = duplicate
    return parsed_data

@router.post("/candidates", response_model=ProfileOut, status_code=status.HTTP_201_CREATED)
def create_candidate(
    profile_data: ProfileCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Saves or updates candidate profile details in the database."""
    existing = None
    if profile_data.email:
        existing = db.query(CandidateProfile).filter(CandidateProfile.email == profile_data.email).first()
        
    if existing:
        # Update existing candidate details
        existing.full_name = profile_data.full_name
        existing.phone = profile_data.phone
        existing.location = profile_data.location
        existing.skills = profile_data.skills
        existing.specialty_summary = profile_data.specialty_summary
        existing.suitability_suggestion = profile_data.suitability_suggestion
        existing.hr_note = profile_data.hr_note
        existing.is_strong = profile_data.is_strong
        existing.role_id = profile_data.role_id
        existing.level_id = profile_data.level_id
        if profile_data.cv_text:
            existing.cv_text = profile_data.cv_text
        if profile_data.cv_file_path:
            if existing.cv_file_path and existing.cv_file_path != profile_data.cv_file_path:
                try:
                    os.remove(existing.cv_file_path)
                except Exception:
                    pass
            existing.cv_file_path = profile_data.cv_file_path
            
        # Update or create digital twin
        if profile_data.predicted_level:
            twin = existing.digital_twin
            if not twin:
                twin = CandidateDigitalTwin(candidate_id=existing.id)
                db.add(twin)
            twin.predicted_level = profile_data.predicted_level
            twin.level_confidence = profile_data.level_confidence
            twin.predicted_roles = profile_data.predicted_roles
            twin.strengths_analysis = profile_data.strengths_analysis
            twin.hidden_skills = profile_data.hidden_skills
            twin.growth_potential = profile_data.growth_potential
            twin.growth_reasoning = profile_data.growth_reasoning
            twin.recommended_paths = profile_data.recommended_paths
            twin.interview_questions = profile_data.interview_questions
            twin.updated_at = datetime.utcnow()
            
        db.commit()
        db.refresh(existing)
        return existing
        
    new_profile = CandidateProfile(
        full_name=profile_data.full_name,
        email=profile_data.email,
        phone=profile_data.phone,
        location=profile_data.location,
        skills=profile_data.skills,
        specialty_summary=profile_data.specialty_summary,
        suitability_suggestion=profile_data.suitability_suggestion,
        hr_note=profile_data.hr_note,
        is_strong=profile_data.is_strong,
        role_id=profile_data.role_id,
        level_id=profile_data.level_id,
        cv_text=profile_data.cv_text or "",
        cv_file_path=profile_data.cv_file_path or ""
    )
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    
    # Create digital twin if digital twin fields are provided
    if profile_data.predicted_level:
        new_twin = CandidateDigitalTwin(
            candidate_id=new_profile.id,
            predicted_level=profile_data.predicted_level,
            level_confidence=profile_data.level_confidence,
            predicted_roles=profile_data.predicted_roles,
            strengths_analysis=profile_data.strengths_analysis,
            hidden_skills=profile_data.hidden_skills,
            growth_potential=profile_data.growth_potential,
            growth_reasoning=profile_data.growth_reasoning,
            recommended_paths=profile_data.recommended_paths,
            interview_questions=profile_data.interview_questions
        )
        db.add(new_twin)
        db.commit()
        db.refresh(new_profile)
        
    return new_profile

@router.get("/candidates", response_model=List[Dict[str, Any]])
def get_candidates(
    q: Optional[str] = Query(None),
    role_id: Optional[int] = Query(None),
    level_id: Optional[int] = Query(None),
    skill: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Query, search, and filter candidate database records."""
    query = db.query(CandidateProfile)
    
    if role_id:
        query = query.filter(CandidateProfile.role_id == role_id)
    if level_id:
        query = query.filter(CandidateProfile.level_id == level_id)
    if skill:
        query = query.filter(CandidateProfile.skills.like(f"%{skill}%"))
    if q:
        search_filter = f"%{q}%"
        query = query.filter(
            CandidateProfile.full_name.like(search_filter) |
            CandidateProfile.email.like(search_filter) |
            CandidateProfile.cv_text.like(search_filter) |
            CandidateProfile.skills.like(search_filter) |
            CandidateProfile.location.like(search_filter)
        )
        
    profiles = query.all()
    
    results = []
    for p in profiles:
        results.append({
            "id": p.id,
            "full_name": p.full_name,
            "email": p.email,
            "phone": p.phone,
            "location": p.location,
            "skills": p.skills,
            "specialty_summary": p.specialty_summary,
            "suitability_suggestion": p.suitability_suggestion,
            "hr_note": p.hr_note,
            "is_strong": p.is_strong,
            "cv_text": p.cv_text,
            "cv_file_path": p.cv_file_path,
            "role_id": p.role_id,
            "level_id": p.level_id,
            "role_name": p.role.name if p.role else "Not Specified",
            "level_name": p.level.name if p.level else "Not Specified",
            "created_at": p.created_at,
            "digital_twin": {
                "id": p.digital_twin.id,
                "candidate_id": p.digital_twin.candidate_id,
                "predicted_level": p.digital_twin.predicted_level,
                "level_confidence": p.digital_twin.level_confidence,
                "predicted_roles": p.digital_twin.predicted_roles,
                "strengths_analysis": p.digital_twin.strengths_analysis,
                "hidden_skills": p.digital_twin.hidden_skills,
                "growth_potential": p.digital_twin.growth_potential,
                "growth_reasoning": p.digital_twin.growth_reasoning,
                "recommended_paths": p.digital_twin.recommended_paths,
                "interview_questions": p.digital_twin.interview_questions,
                "updated_at": p.digital_twin.updated_at
            } if p.digital_twin else None
        })
    return results

@router.get("/candidates/{id}", response_model=Dict[str, Any])
def get_candidate(id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Retrieve details of a single candidate."""
    p = db.query(CandidateProfile).filter(CandidateProfile.id == id).first()
    if not p:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Candidate profile not found."
        )
        
    return {
        "id": p.id,
        "full_name": p.full_name,
        "email": p.email,
        "phone": p.phone,
        "location": p.location,
        "skills": p.skills,
        "specialty_summary": p.specialty_summary,
        "suitability_suggestion": p.suitability_suggestion,
        "hr_note": p.hr_note,
        "is_strong": p.is_strong,
        "cv_text": p.cv_text,
        "cv_file_path": p.cv_file_path,
        "role_id": p.role_id,
        "level_id": p.level_id,
        "role_name": p.role.name if p.role else "Not Specified",
        "level_name": p.level.name if p.level else "Not Specified",
        "created_at": p.created_at,
        "digital_twin": {
            "id": p.digital_twin.id,
            "candidate_id": p.digital_twin.candidate_id,
            "predicted_level": p.digital_twin.predicted_level,
            "level_confidence": p.digital_twin.level_confidence,
            "predicted_roles": p.digital_twin.predicted_roles,
            "strengths_analysis": p.digital_twin.strengths_analysis,
            "hidden_skills": p.digital_twin.hidden_skills,
            "growth_potential": p.digital_twin.growth_potential,
            "growth_reasoning": p.digital_twin.growth_reasoning,
            "recommended_paths": p.digital_twin.recommended_paths,
            "interview_questions": p.digital_twin.interview_questions,
            "updated_at": p.digital_twin.updated_at
        } if p.digital_twin else None
    }

@router.put("/candidates/{id}", response_model=ProfileOut)
def update_candidate(
    id: int,
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Modify details of an existing candidate profile."""
    profile = db.query(CandidateProfile).filter(CandidateProfile.id == id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Candidate profile not found."
        )
        
    if profile_data.full_name is not None:
        profile.full_name = profile_data.full_name
    if profile_data.email is not None:
        profile.email = profile_data.email
    if profile_data.phone is not None:
        profile.phone = profile_data.phone
    if profile_data.location is not None:
        profile.location = profile_data.location
    if profile_data.skills is not None:
        profile.skills = profile_data.skills
    if profile_data.specialty_summary is not None:
        profile.specialty_summary = profile_data.specialty_summary
    if profile_data.suitability_suggestion is not None:
        profile.suitability_suggestion = profile_data.suitability_suggestion
    if profile_data.hr_note is not None:
        profile.hr_note = profile_data.hr_note
    if profile_data.is_strong is not None:
        profile.is_strong = profile_data.is_strong
    if profile_data.role_id is not None:
        profile.role_id = profile_data.role_id
    if profile_data.level_id is not None:
        profile.level_id = profile_data.level_id
        
    # Update or create digital twin if fields are provided
    if profile_data.predicted_level is not None:
        twin = profile.digital_twin
        if not twin:
            twin = CandidateDigitalTwin(candidate_id=profile.id)
            db.add(twin)
        twin.predicted_level = profile_data.predicted_level
        twin.level_confidence = profile_data.level_confidence
        if profile_data.predicted_roles is not None:
            twin.predicted_roles = profile_data.predicted_roles
        if profile_data.strengths_analysis is not None:
            twin.strengths_analysis = profile_data.strengths_analysis
        if profile_data.hidden_skills is not None:
            twin.hidden_skills = profile_data.hidden_skills
        if profile_data.growth_potential is not None:
            twin.growth_potential = profile_data.growth_potential
        if profile_data.growth_reasoning is not None:
            twin.growth_reasoning = profile_data.growth_reasoning
        if profile_data.recommended_paths is not None:
            twin.recommended_paths = profile_data.recommended_paths
        if profile_data.interview_questions is not None:
            twin.interview_questions = profile_data.interview_questions
        twin.updated_at = datetime.utcnow()
        
    db.commit()
    db.refresh(profile)
    return profile

@router.delete("/candidates/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_candidate(id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Delete candidate and their CV file from disk."""
    profile = db.query(CandidateProfile).filter(CandidateProfile.id == id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Candidate profile not found."
        )
        
    if profile.cv_file_path and os.path.exists(profile.cv_file_path):
        try:
            os.remove(profile.cv_file_path)
        except Exception:
            pass
            
    db.delete(profile)
    db.commit()
    return

@router.post("/candidates/{id}/regenerate-twin", response_model=Dict[str, Any])
def regenerate_digital_twin(id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Manually regenerate the AI Candidate Digital Twin for a given candidate."""
    candidate = db.query(CandidateProfile).filter(CandidateProfile.id == id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Candidate profile not found."
        )
        
    role_name = candidate.role.name if candidate.role else None
    level_name = candidate.level.name if candidate.level else None
    
    # Call Gemini to regenerate digital twin only
    twin_data = generate_digital_twin_only(
        cv_text=candidate.cv_text or "",
        target_role=role_name,
        target_level=level_name
    )
    
    twin = candidate.digital_twin
    if not twin:
        twin = CandidateDigitalTwin(candidate_id=id)
        db.add(twin)
        
    twin.predicted_level = twin_data.get("predicted_level")
    twin.level_confidence = twin_data.get("level_confidence")
    twin.predicted_roles = twin_data.get("predicted_roles")
    twin.strengths_analysis = twin_data.get("strengths_analysis")
    twin.hidden_skills = twin_data.get("hidden_skills")
    twin.growth_potential = twin_data.get("growth_potential")
    twin.growth_reasoning = twin_data.get("growth_reasoning")
    twin.recommended_paths = twin_data.get("recommended_paths")
    twin.interview_questions = twin_data.get("interview_questions")
    twin.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(twin)
    
    return {
        "id": twin.id,
        "candidate_id": twin.candidate_id,
        "predicted_level": twin.predicted_level,
        "level_confidence": twin.level_confidence,
        "predicted_roles": twin.predicted_roles,
        "strengths_analysis": twin.strengths_analysis,
        "hidden_skills": twin.hidden_skills,
        "growth_potential": twin.growth_potential,
        "growth_reasoning": twin.growth_reasoning,
        "recommended_paths": twin.recommended_paths,
        "interview_questions": twin.interview_questions,
        "updated_at": twin.updated_at
    }

