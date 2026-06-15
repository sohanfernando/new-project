import os
from dotenv import load_dotenv

# Load env variables from .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cv_reader.db")
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-change-this-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)
