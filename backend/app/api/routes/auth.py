from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ...models.user import User
from ...schemas.user import UserCreate, UserResponse
from ...database import get_db
from ...core.security import verify_password, create_access_token, get_password_hash
from ...core.encryption import (
    decrypt_master_key,
    encrypt_master_key,
    generate_salt,
    generate_master_key
)
from ..dependencies import get_current_user
from ...core.session_manager import session_manager

router = APIRouter()

print("Available functions:", [
    func for func in dir() 
    if not func.startswith('_')
])

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    # Generate encryption materials
    salt = generate_salt()
    master_key = generate_master_key()
    encrypted_master_key = encrypt_master_key(master_key, user.password, salt)
    
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=get_password_hash(user.password),
        encryption_salt=salt,
        encrypted_master_key=encrypted_master_key
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    try:
        print("Starting login process")  # Debug print
        user = db.query(User).filter(User.username == form_data.username).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        print("User authenticated, trying to decrypt master key")  # Debug print
        
        try:
            # Decrypt master key
            master_key = decrypt_master_key(
                user.encrypted_master_key,
                form_data.password,
                user.encryption_salt
            )
            print("Master key decrypted successfully")  # Debug print
        except Exception as e:
            print(f"Error decrypting master key: {str(e)}")  # Debug print
            raise HTTPException(
                status_code=500,
                detail=f"Error decrypting master key: {str(e)}"
            )

        # Store master key in session
        session_manager.store_master_key(user.id, master_key)

        # Create access token
        access_token = create_access_token(data={"sub": user.username})
        return {"access_token": access_token, "token_type": "bearer"}
        
    except Exception as e:
        print(f"Login error: {str(e)}")  # Debug print
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    session_manager.clear_session(current_user.id)
    return {"message": "Successfully logged out"}