import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
from pathlib import Path
import io

from ...models.file import File
from ...models.folder import Folder
from ...schemas.file import FileCreate, FileUpdate, FileResponse
from ...database import get_db
from ..dependencies import get_current_user
from ...models.user import User
from ...core.encryption import encrypt_file, decrypt_file
from ...core.session_manager import session_manager
from ...core.config import settings

router = APIRouter()

# Configure file storage path
FILE_STORAGE_PATH = Path(settings.FILE_STORAGE_PATH)
if not FILE_STORAGE_PATH.exists():
    FILE_STORAGE_PATH.mkdir(parents=True)

@router.post("/", response_model=FileResponse)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    folder_id: Optional[int] = None,
    is_encrypted: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a file to the specified folder"""
    try:
        # Check if folder exists and belongs to user
        if folder_id:
            folder = db.query(Folder).filter(
                Folder.id == folder_id,
                Folder.user_id == current_user.id
            ).first()
            
            if not folder:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Folder not found or doesn't belong to you"
                )
        
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Generate a unique filename to prevent collisions
        unique_id = str(uuid.uuid4())
        original_filename = file.filename
        ext = os.path.splitext(original_filename)[1]
        secure_filename = f"{unique_id}{ext}"
        
        # Check for file size limits (optional)
        max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024  # Convert to bytes
        if file_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds the {settings.MAX_FILE_SIZE_MB}MB limit"
            )
            
        # Create file record in database
        db_file = File(
            filename=original_filename,
            content_type=file.content_type,
            size=file_size,
            is_encrypted=is_encrypted,
            user_id=current_user.id,
            folder_id=folder_id
        )
        
        # Handle encryption if needed
        if is_encrypted:
            master_key = session_manager.get_master_key(current_user.id)
            if not master_key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session expired. Please login again."
                )
            file_content = encrypt_file(file_content, master_key)
        
        # Choose storage method based on configuration (database or filesystem)
        if settings.STORE_FILES_IN_DB:
            # Store in database
            db_file.file_data = file_content
        else:
            # Store in filesystem
            user_dir = FILE_STORAGE_PATH / str(current_user.id)
            if not user_dir.exists():
                user_dir.mkdir(parents=True)
                
            file_path = user_dir / secure_filename
            with open(file_path, "wb") as f:
                f.write(file_content)
                
            # Store relative path in database
            db_file.file_path = f"{current_user.id}/{secure_filename}"
            
        db.add(db_file)
        db.commit()
        db.refresh(db_file)
        
        # Don't return file data in the response
        file_response = FileResponse.from_orm(db_file)
        return file_response
        
    except Exception as e:
        # Cleanup any partially created files
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{file_id}/download")
async def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download a file by ID"""
    # Get file from database
    db_file = db.query(File).filter(
        File.id == file_id,
        File.user_id == current_user.id
    ).first()
    
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        # Get file content based on storage method
        if db_file.file_data:
            # From database
            file_content = db_file.file_data
        elif db_file.file_path:
            # From filesystem
            file_path = FILE_STORAGE_PATH / db_file.file_path
            if not file_path.exists():
                raise HTTPException(status_code=404, detail="File content not found")
            with open(file_path, "rb") as f:
                file_content = f.read()
        else:
            raise HTTPException(status_code=500, detail="File has no content")
        
        # Decrypt if needed
        if db_file.is_encrypted:
            master_key = session_manager.get_master_key(current_user.id)
            if not master_key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session expired. Please login again."
                )
            file_content = decrypt_file(file_content, master_key)
        
        # Return file as streaming response
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type=db_file.content_type,
            headers={"Content-Disposition": f"attachment; filename={db_file.filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving file: {str(e)}")

@router.get("/", response_model=List[FileResponse])
def get_files(
    folder_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all files for the user, optionally filtered by folder"""
    query = db.query(File).filter(File.user_id == current_user.id)
    
    # Filter by folder if provided
    if folder_id is not None:
        # Verify folder belongs to user
        folder = db.query(Folder).filter(
            Folder.id == folder_id,
            Folder.user_id == current_user.id
        ).first()
        
        if not folder:
            raise HTTPException(
                status_code=404,
                detail="Folder not found or doesn't belong to you"
            )
            
        query = query.filter(File.folder_id == folder_id)
    
    files = query.all()
    return files

@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a file"""
    db_file = db.query(File).filter(
        File.id == file_id,
        File.user_id == current_user.id
    ).first()
    
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        # Delete file from filesystem if stored there
        if db_file.file_path:
            file_path = FILE_STORAGE_PATH / db_file.file_path
            if file_path.exists():
                os.remove(file_path)
        
        # Delete record from database
        db.delete(db_file)
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")

@router.put("/{file_id}", response_model=FileResponse)
def update_file(
    file_id: int,
    file_update: FileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update file metadata (rename or move to different folder)"""
    db_file = db.query(File).filter(
        File.id == file_id,
        File.user_id == current_user.id
    ).first()
    
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    update_data = file_update.dict(exclude_unset=True)
    
    # Check if folder exists and belongs to user if moving
    if "folder_id" in update_data and update_data["folder_id"] is not None:
        folder = db.query(Folder).filter(
            Folder.id == update_data["folder_id"],
            Folder.user_id == current_user.id
        ).first()
        
        if not folder:
            raise HTTPException(
                status_code=404,
                detail="Destination folder not found or doesn't belong to you"
            )
    
    # Update the file record
    for key, value in update_data.items():
        setattr(db_file, key, value)
    
    db.commit()
    db.refresh(db_file)
    return db_file