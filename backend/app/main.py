from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from . import models, schemas, database

app = FastAPI()

@app.post("/notes/")
def create_note(note: schemas.NoteCreate, db: Session = Depends(database.get_db)):
    db_note = models.Note(**note.dict())
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

@app.get("/notes/")
def read_notes(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    notes = db.query(models.Note).offset(skip).limit(limit).all()
    return notes