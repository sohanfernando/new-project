from pydantic import BaseModel

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str | None = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    email: str
