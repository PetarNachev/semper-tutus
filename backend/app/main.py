from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from . import models, schemas, database
from .api.routes import auth

app = FastAPI()


app.include_router(auth.router, prefix="/auth", tags=["auth"])

# app.include_router(notes.router, prefix="/notes", tags=["notes"])

# app.include_router(users.router, prefix="/users", tags=["users"])