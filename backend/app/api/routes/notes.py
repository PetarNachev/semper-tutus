# app/api/routes/notes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ...models.note import Note
from ...schemas.note import NoteCreate, NoteUpdate, NoteResponse
from ...database import get_db
from ..dependencies import get_current_user
from ...models.user import User
from ...core.encryption import decrypt_master_key, encrypt_note_content, decrypt_note_content
from ...core.session_manager import session_manager

router = APIRouter()

@router.post("/", response_model=NoteResponse)
def create_note(
    note: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        if note.is_encrypted:
            master_key = session_manager.get_master_key(current_user.id)
            if not master_key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session expired. Please login again."
                )
            
            note_data = note.dict()
            note_data['content'] = encrypt_note_content(note.content, master_key)
        else:
            note_data = note.dict()

        db_note = Note(**note_data, user_id=current_user.id)
        db.add(db_note)
        db.commit()
        db.refresh(db_note)
        return db_note
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{note_id}", response_model=NoteResponse)
def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific note by ID, ensuring the user owns it."""
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    try:
        if note.is_encrypted:
            master_key = session_manager.get_master_key(current_user.id)
            if not master_key:
                raise HTTPException(
                    status_code=401,
                    detail="Session expired. Please login again."
                )
            note.content = decrypt_note_content(note.content, master_key)
        return note
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving note: {str(e)}")

@router.get("/", response_model=List[NoteResponse])
def get_notes(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Get all notes for the authenticated user."""
    try:
        notes = db.query(Note).filter(Note.user_id == current_user.id).all()
        
        # Get master key once for all encrypted notes
        master_key = None
        encrypted_notes = any(note.is_encrypted for note in notes)
        
        if encrypted_notes:
            master_key = session_manager.get_master_key(current_user.id)
            if not master_key:
                raise HTTPException(
                    status_code=401,
                    detail="Session expired. Please login again."
                )

        # Decrypt notes if needed
        for note in notes:
            if note.is_encrypted:
                note.content = decrypt_note_content(note.content, master_key)
        
        return notes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving notes: {str(e)}")

@router.put("/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: int,
    note_update: NoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a note if the user owns it."""
    db_note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")

    try:
        update_data = note_update.dict(exclude_unset=True)
        master_key = None
        
        # Get master key if needed
        if db_note.is_encrypted or ('is_encrypted' in update_data and update_data['is_encrypted']):
            master_key = session_manager.get_master_key(current_user.id)
            if not master_key:
                raise HTTPException(
                    status_code=401,
                    detail="Session expired. Please login again."
                )

        # Handle content update for encrypted notes
        if 'content' in update_data and db_note.is_encrypted:
            update_data['content'] = encrypt_note_content(update_data['content'], master_key)
        
        # Handle encryption status change
        if 'is_encrypted' in update_data and update_data['is_encrypted'] != db_note.is_encrypted:
            if update_data['is_encrypted']:
                # Encrypt the content
                update_data['content'] = encrypt_note_content(db_note.content, master_key)
            else:
                # Decrypt the content
                decrypted_content = decrypt_note_content(db_note.content, master_key)
                update_data['content'] = decrypted_content

        for key, value in update_data.items():
            setattr(db_note, key, value)

        db.commit()
        db.refresh(db_note)
        
        # Decrypt for response if needed
        if db_note.is_encrypted:
            db_note.content = decrypt_note_content(db_note.content, master_key)
            
        return db_note
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating note: {str(e)}")

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a note if the user owns it."""
    db_note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")

    db.delete(db_note)
    db.commit()
    return