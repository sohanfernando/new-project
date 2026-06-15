from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.level import Level
from app.schemas.level import LevelCreate, LevelOut
from app.routers.auth import get_current_user
from typing import List

router = APIRouter(prefix="/api/levels", tags=["levels"])

@router.get("", response_model=List[LevelOut])
def get_levels(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Retrieve all configured seniority levels in the system."""
    return db.query(Level).order_by(Level.order.asc()).all()

@router.post("", response_model=LevelOut, status_code=status.HTTP_201_CREATED)
def create_level(level_data: LevelCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Create a new seniority level (name must be unique)."""
    name_clean = level_data.name.strip()
    existing = db.query(Level).filter(Level.name == name_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A seniority level with this name already exists."
        )
    max_order = db.query(Level).order_by(Level.order.desc()).first()
    next_order = (max_order.order + 1) if max_order else 0
    
    level = Level(name=name_clean, order=next_order)
    db.add(level)
    db.commit()
    db.refresh(level)
    return level

@router.put("/reorder", status_code=status.HTTP_200_OK)
def reorder_levels(ordered_ids: List[int] = Body(...), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Save custom ordering sequence of seniority levels."""
    for idx, level_id in enumerate(ordered_ids):
        db.query(Level).filter(Level.id == level_id).update({"order": idx})
    db.commit()
    return {"status": "success", "message": "Levels reordered successfully"}

@router.put("/{id}", response_model=LevelOut)
def update_level(id: int, level_data: LevelCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Modify the name of an existing seniority level."""
    level = db.query(Level).filter(Level.id == id).first()
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seniority level not found."
        )
    name_clean = level_data.name.strip()
    existing = db.query(Level).filter(Level.name == name_clean, Level.id != id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Another seniority level with this name already exists."
        )
    level.name = name_clean
    db.commit()
    db.refresh(level)
    return level

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_level(id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Remove a seniority level from the database."""
    level = db.query(Level).filter(Level.id == id).first()
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seniority level not found."
        )
    db.delete(level)
    db.commit()
    return
