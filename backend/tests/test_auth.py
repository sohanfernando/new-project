import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.services.auth_service import get_password_hash
from sqlalchemy.pool import StaticPool

# Create isolated test database (using StaticPool for SQLite in-memory sharing)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    """Generates database schema, seeds the static HR user, and opens a session."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Seed test HR user
        hr_email = "sapuni.m@sysco-hr.com"
        hashed_pwd = get_password_hash("sapuni@123")
        db.add(User(email=hr_email, hashed_password=hashed_pwd))
        db.commit()
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    """Overwrites application database dependencies to use the active test session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_static_user_login(client):
    """Verify login with static HR account succeeds."""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "sapuni.m@sysco-hr.com",
            "password": "sapuni@123"
        }
    )
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

def test_login_incorrect_password(client):
    """Verify login with incorrect password returns 401 Unauthorized."""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "sapuni.m@sysco-hr.com",
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"

def test_login_invalid_email(client):
    """Verify login with unregistered email returns 401 Unauthorized."""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "nonexistent@sysco-hr.com",
            "password": "sapuni@123"
        }
    )
    assert response.status_code == 401

def test_current_user_me(client):
    """Verify current user profile endpoint using active JWT token."""
    r_login = client.post(
        "/api/auth/login",
        json={
            "email": "sapuni.m@sysco-hr.com",
            "password": "sapuni@123"
        }
    )
    token = r_login.json()["access_token"]
    
    r_me = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert r_me.status_code == 200
    me_data = r_me.json()
    assert me_data["email"] == "sapuni.m@sysco-hr.com"
