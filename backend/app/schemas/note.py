from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class NoteBase(BaseModel):
    title: str
    content: str
    tags: Optional[List[str]] = []
    is_encrypted: bool = True
    folder_id: Optional[int] = None


class NoteCreate(NoteBase):
    pass


class NoteUpdate(NoteBase):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    is_encrypted: Optional[bool] = None
    folder_id: Optional[int] = None


class Note(NoteBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class NoteResponse(NoteBase):  # Add this class
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True
