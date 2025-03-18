from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ...models.folder import Folder
from ...models.note import Note
from ...schemas.folder import FolderCreate, FolderUpdate, FolderResponse
from ...database import get_db
from ..dependencies import get_current_user
from ...models.user import User

router = APIRouter()

@router.post("/", response_model=FolderResponse)
def create_folder(
    folder: FolderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new folder"""
    try:
        # Check if parent folder exists and belongs to the user
        if folder.parent_id:
            parent_folder = db.query(Folder).filter(
                Folder.id == folder.parent_id,
                Folder.user_id == current_user.id
            ).first()
            
            if not parent_folder:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parent folder not found or doesn't belong to you"
                )
        
        db_folder = Folder(**folder.dict(), user_id=current_user.id)
        db.add(db_folder)
        db.commit()
        db.refresh(db_folder)
        return db_folder
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[FolderResponse])
def get_folders(
    parent_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all folders for the user, optionally filtered by parent_id"""
    query = db.query(Folder).filter(Folder.user_id == current_user.id)
    
    # Filter by parent_id if provided
    if parent_id is not None:
        query = query.filter(Folder.parent_id == parent_id)
    
    return query.all()

@router.get("/{folder_id}", response_model=FolderResponse)
def get_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific folder by ID"""
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    return folder

@router.put("/{folder_id}", response_model=FolderResponse)
def update_folder(
    folder_id: int,
    folder_update: FolderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a folder"""
    db_folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()
    
    if not db_folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    update_data = folder_update.dict(exclude_unset=True)
    
    # Check for circular references when updating parent_id
    if "parent_id" in update_data and update_data["parent_id"]:
        # Ensure not setting parent to itself
        if update_data["parent_id"] == folder_id:
            raise HTTPException(
                status_code=400, 
                detail="A folder cannot be its own parent"
            )
        
        # Check if new parent exists and belongs to the user
        parent = db.query(Folder).filter(
            Folder.id == update_data["parent_id"],
            Folder.user_id == current_user.id
        ).first()
        
        if not parent:
            raise HTTPException(
                status_code=404,
                detail="Parent folder not found or doesn't belong to you"
            )
        
        # Prevent setting a descendant as parent (would create a cycle)
        current_id = parent.id
        while current_id:
            current_folder = db.query(Folder).filter(Folder.id == current_id).first()
            if current_folder.parent_id == folder_id:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot set a descendant folder as parent (would create a cycle)"
                )
            current_id = current_folder.parent_id
    
    # Update folder with provided data
    for key, value in update_data.items():
        setattr(db_folder, key, value)
    
    db.commit()
    db.refresh(db_folder)
    return db_folder

@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: int,
    recursive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a folder"""
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Check if folder has children or notes
    has_children = db.query(Folder).filter(Folder.parent_id == folder_id).first() is not None
    has_notes = db.query(Note).filter(Note.folder_id == folder_id).first() is not None
    
    if (has_children or has_notes) and not recursive:
        raise HTTPException(
            status_code=400,
            detail="Folder contains notes or subfolders. Use recursive=true to delete everything."
        )
    
    # Delete recursively if requested
    if recursive:
        # Delete all notes in this folder
        db.query(Note).filter(Note.folder_id == folder_id).delete()
        
        # Get all child folders
        child_folders = db.query(Folder).filter(Folder.parent_id == folder_id).all()
        for child in child_folders:
            # Recursive delete through API call
            delete_folder(child.id, True, db, current_user)
    
    # Finally delete the folder itself
    db.delete(folder)
    db.commit()
    return None

@router.get("/{folder_id}/notes", response_model=List)
def get_folder_notes(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all notes in a specific folder"""
    # First check if folder exists and belongs to user
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Get all notes in the folder
    notes = db.query(Note).filter(
        Note.folder_id == folder_id,
        Note.user_id == current_user.id
    ).all()
    
    return notes