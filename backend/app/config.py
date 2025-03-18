from pydantic_settings import BaseSettings
import os
from pathlib import Path

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    STORE_FILES_IN_DB: bool = False  # If False, store in filesystem
    FILE_STORAGE_PATH: str = os.path.join(os.getcwd(), "file_storage")
    MAX_FILE_SIZE_MB: int = 50 
    
    class Config:
        env_file = ".env"

settings = Settings()