from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.role import Role
from app.schemas.role import RoleCreate, RoleOut
from app.routers.auth import get_current_user
from typing import List

router = APIRouter(prefix="/api/roles", tags=["roles"])

@router.get("", response_model=List[RoleOut])
def get_roles(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Retrieve all configured roles in the system."""
    return db.query(Role).order_by(Role.order.asc()).all()

@router.post("", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
def create_role(role_data: RoleCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Create a new job role (name must be unique)."""
    name_clean = role_data.name.strip()
    existing = db.query(Role).filter(Role.name == name_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A role with this name already exists."
        )
    max_order = db.query(Role).order_by(Role.order.desc()).first()
    next_order = (max_order.order + 1) if max_order else 0
    
    role = Role(name=name_clean, order=next_order)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role

@router.put("/reorder", status_code=status.HTTP_200_OK)
def reorder_roles(ordered_ids: List[int] = Body(...), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Save custom ordering sequence of job roles."""
    for idx, role_id in enumerate(ordered_ids):
        db.query(Role).filter(Role.id == role_id).update({"order": idx})
    db.commit()
    return {"status": "success", "message": "Roles reordered successfully"}

@router.put("/{id}", response_model=RoleOut)
def update_role(id: int, role_data: RoleCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Modify the name of an existing job role."""
    role = db.query(Role).filter(Role.id == id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found."
        )
    name_clean = role_data.name.strip()
    existing = db.query(Role).filter(Role.name == name_clean, Role.id != id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Another role with this name already exists."
        )
    role.name = name_clean
    db.commit()
    db.refresh(role)
    return role

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Remove a job role from the database."""
    role = db.query(Role).filter(Role.id == id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found."
        )
    db.delete(role)
    db.commit()
    return
