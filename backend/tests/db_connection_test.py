# test_db.py (create this in your backend directory)

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User
from app.models.note import Note
from datetime import datetime


def test_db_connection():
    db = SessionLocal()
    try:
        # Create a test user
        test_user = User(
            email="test@example.com",
            username="testuser",
            hashed_password="testpass123",  # In real app, this should be properly hashed
            is_active=True,
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)

        # Create a test note for this user
        test_note = Note(
            title="Test Note",
            content="This is a test note content",
            tags=["test", "first note"],
            is_encrypted=False,
            user_id=test_user.id,
        )
        db.add(test_note)
        db.commit()

        # Query and print results
        print("\nCreated User:", test_user.username, test_user.email)
        print("Created Note:", test_note.title)

        # Query all notes for the user
        user_notes = db.query(Note).filter(Note.user_id == test_user.id).all()
        print(f"\nNotes for user {test_user.username}:")
        for note in user_notes:
            print(f"- {note.title}: {note.content}")

    except Exception as e:
        print("Error:", e)
    finally:
        db.close()


if __name__ == "__main__":
    test_db_connection()
