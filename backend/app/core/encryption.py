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

def encrypt_file(file_data: bytes, key: bytes) -> bytes:
    """Encrypt file data using the provided key"""
    # Use the same encryption algorithm you're using for notes
    # This is a simplified example - adjust to match your actual encryption implementation
    iv = os.urandom(16)  # Generate initialization vector
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    
    # Pad data to match block size
    padder = padding.PKCS7(algorithms.AES.block_size).padder()
    padded_data = padder.update(file_data) + padder.finalize()
    
    # Encrypt the data
    encrypted_data = encryptor.update(padded_data) + encryptor.finalize()
    
    # Return IV + encrypted data
    return iv + encrypted_data

def decrypt_file(encrypted_data: bytes, key: bytes) -> bytes:
    """Decrypt file data using the provided key"""
    # This is a simplified example - adjust to match your actual encryption implementation
    iv = encrypted_data[:16]  # Extract initialization vector (first 16 bytes)
    data = encrypted_data[16:]  # Extract encrypted data (rest of the bytes)
    
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    
    # Decrypt the data
    decrypted_padded_data = decryptor.update(data) + decryptor.finalize()
    
    # Unpad the data
    unpadder = padding.PKCS7(algorithms.AES.block_size).unpadder()
    decrypted_data = unpadder.update(decrypted_padded_data) + unpadder.finalize()
    
    return decrypted_data