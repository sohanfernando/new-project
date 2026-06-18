import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import SessionLocal
from app.routers import auth, cv, roles, levels
from app.models.user import User
from app.models.role import Role
from app.models.level import Level
from app.services.auth_service import get_password_hash

# Schema is now owned by Alembic — run `alembic upgrade head` (or `alembic
# stamp head` on an existing DB) before starting the app. Importing
# Base.metadata.create_all here would silently mask migration drift.

def seed_database():
    """Seed the static HR account and default category entries on startup."""
    db = SessionLocal()
    try:
        # Seed static HR User
        hr_email = os.getenv("HR_SEED_EMAIL", "sapuni.m@sysco-hr.com")
        hr_user = db.query(User).filter(User.email == hr_email).first()
        if not hr_user:
            hr_password = os.getenv("HR_SEED_PASSWORD")
            if not hr_password:
                print(
                    "Skipping HR user seed: HR_SEED_PASSWORD env var is not set. "
                    "Set it to provision the initial HR account."
                )
            else:
                hashed_pwd = get_password_hash(hr_password)
                new_user = User(email=hr_email, hashed_password=hashed_pwd, full_name="Sapuni Mawalage")
                db.add(new_user)
                db.commit()
                print(f"Database Seeded: Created HR User {hr_email} (Sapuni Mawalage)")
        else:
            # Ensure full_name is updated
            if not hr_user.full_name or hr_user.full_name != "Sapuni Mawalage":
                hr_user.full_name = "Sapuni Mawalage"
                db.commit()
                print(f"Database Seeded: Updated name for HR User {hr_email} to Sapuni Mawalage")

        # Seed default Job Roles
        if db.query(Role).count() == 0:
            default_roles = [
                "Software Engineer", "QA Engineer", "DevOps Engineer", 
                "Project Manager", "Frontend Developer", "Backend Developer"
            ]
            for idx, r in enumerate(default_roles):
                db.add(Role(name=r, order=idx))
            db.commit()
            print("Database Seeded: Created default job roles with order")
        else:
            # Backfill orders for existing seeded roles if needed
            existing_roles = db.query(Role).filter(Role.order == 0).all()
            if len(existing_roles) > 1:
                all_roles = db.query(Role).all()
                for idx, r in enumerate(all_roles):
                    r.order = idx
                db.commit()
                print("Database Seeded: Backfilled role order indices")

        # Seed default Seniority Levels
        if db.query(Level).count() == 0:
            default_levels = [
                "Intern", "Associate/Junior", "Mid-Level", "Senior", "Lead/Principal"
            ]
            for idx, l in enumerate(default_levels):
                db.add(Level(name=l, order=idx))
            db.commit()
            print("Database Seeded: Created default seniority levels with order")
        else:
            # Backfill orders for existing seeded levels if needed
            existing_levels = db.query(Level).filter(Level.order == 0).all()
            if len(existing_levels) > 1:
                all_levels = db.query(Level).all()
                for idx, l in enumerate(all_levels):
                    l.order = idx
                db.commit()
                print("Database Seeded: Backfilled level order indices")
            
    except Exception as e:
        print(f"Error seeding database: {str(e)}")
    finally:
        db.close()

# Execute database seeding
seed_database()

app = FastAPI(
    title="Sysco HR Portal API",
    description="Backend API for secure HR CV extraction, candidate tracking, and category configurations.",
    version="1.0.0"
)

# CORS configuration for Vite local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth.router)
app.include_router(roles.router)
app.include_router(levels.router)
app.include_router(cv.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "portal": "Sysco HR Portal",
        "message": "API online. Navigate to /docs for Swagger specifications."
    }
