from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    content_type = Column(String, nullable=False)  # MIME type
    size = Column(Integer, nullable=False)  # Size in bytes
    is_encrypted = Column(Boolean, default=True)
    file_path = Column(String, nullable=True)  # For external storage option
    file_data = Column(LargeBinary, nullable=True)  # For DB storage option
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="files")
    folder = relationship("Folder", back_populates="files")