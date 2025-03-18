# app/schemas/folder.py
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

# Base schema with common attributes
class FolderBase(BaseModel):
    name: str
    parent_id: Optional[int] = None

# Schema for creating a new folder
class FolderCreate(FolderBase):
    pass

# Schema for updating a folder
class FolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None

# Schema for folder response
class FolderResponse(FolderBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

# Recursive schema for folder tree response (including children)
class FolderTreeResponse(FolderResponse):
    children: List['FolderTreeResponse'] = []
    
    class Config:
        orm_mode = True

# This handles the recursive reference
FolderTreeResponse.update_forward_refs()