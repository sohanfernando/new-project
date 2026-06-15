from pydantic import BaseModel

class LevelCreate(BaseModel):
    name: str

class LevelOut(BaseModel):
    id: int
    name: str
    order: int

    class Config:
        from_attributes = True
