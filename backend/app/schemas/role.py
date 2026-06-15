from pydantic import BaseModel

class RoleCreate(BaseModel):
    name: str

class RoleOut(BaseModel):
    id: int
    name: str
    order: int
    candidate_count: int = 0

    class Config:
        from_attributes = True
