from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class FileBase(BaseModel):
    filename: str
    content_type: str
    size: int
    is_encrypted: bool = True
    folder_id: Optional[int] = None

class FileCreate(FileBase):
    pass

class FileUpdate(BaseModel):
    filename: Optional[str] = None
    folder_id: Optional[int] = None

class FileResponse(FileBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Note: we don't include file_data or file_path in responses
    
    class Config:
        orm_mode = True