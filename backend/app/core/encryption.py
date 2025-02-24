# app/core/encryption.py
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os

print("Loading encryption.py")

def generate_salt() -> str:
    """Generate a random salt for a new user."""
    return base64.b64encode(os.urandom(32)).decode()

def generate_master_key() -> bytes:
    """Generate a random master key for encrypting notes."""
    return Fernet.generate_key()

def derive_key_from_password(password: str, salt: str) -> bytes:
    """Derive a key from password and salt - used to encrypt/decrypt master key."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt.encode(),
        iterations=100000,
    )
    return base64.urlsafe_b64encode(kdf.derive(password.encode()))

def encrypt_master_key(master_key: bytes, password: str, salt: str) -> str:
    """Encrypt master key with password-derived key."""
    password_key = derive_key_from_password(password, salt)
    f = Fernet(password_key)
    return f.encrypt(master_key).decode()

def decrypt_master_key(encrypted_master_key: str, password: str, salt: str) -> bytes:
    print("decrypt_master_key called")
    """Decrypt master key using password."""
    password_key = derive_key_from_password(password, salt)
    f = Fernet(password_key)
    return f.decrypt(encrypted_master_key.encode())

def encrypt_note_content(content: str, master_key: bytes) -> str:
    """Encrypt note content using master key."""
    f = Fernet(master_key)
    return f.encrypt(content.encode()).decode()

def decrypt_note_content(encrypted_content: str, master_key: bytes) -> str:
    """Decrypt note content using master key."""
    f = Fernet(master_key)
    return f.decrypt(encrypted_content.encode()).decode()