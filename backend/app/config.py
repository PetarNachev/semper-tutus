from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str

    class Config:
        env_file = "../.env"  # Path relative to where config.py is

settings = Settings()