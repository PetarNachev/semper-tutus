from sqlalchemy import Boolean, Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
from ..core.security import get_password_hash, verify_password


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    encryption_salt = Column(String, nullable=True)  # Changed to nullable=True
    encrypted_master_key = Column(String, nullable=True)
    
    # files = relationship("File", back_populates="owner", cascade="all, delete-orphan")
    
    folders = relationship("Folder", back_populates="owner")

    # Relationship with notes
    notes = relationship("Note", back_populates="owner")

    def set_password(self, password: str):
        self.hashed_password = get_password_hash(password)

    def check_password(self, password: str) -> bool:
        return verify_password(password, self.hashed_password)
