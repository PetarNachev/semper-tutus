from typing import Dict, Optional
from datetime import datetime, timedelta, UTC
import threading

class SecureSessionManager:
    def __init__(self):
        self._sessions: Dict[int, Dict] = {}
        self._lock = threading.Lock()
        self._cleanup_interval = timedelta(minutes=30)
        self._session_timeout = timedelta(hours=4)

    def store_master_key(self, user_id: int, master_key: bytes):
        with self._lock:
            self._sessions[user_id] = {
                'master_key': master_key,
                'last_access': datetime.now(UTC)
            }
            self._cleanup_expired()

    def get_master_key(self, user_id: int) -> Optional[bytes]:
        with self._lock:
            if user_id in self._sessions:
                session = self._sessions[user_id]
                if datetime.now(UTC) - session['last_access'] < self._session_timeout:
                    session['last_access'] = datetime.now(UTC)
                    return session['master_key']
                else:
                    del self._sessions[user_id]
            return None
        
    def clear_session(self, user_id: int):
        with self._lock:
            if user_id in self._sessions:
                del self._sessions[user_id]

    def _cleanup_expired(self):
        now = datetime.now(UTC)
        expired = [
            user_id for user_id, session in self._sessions.items()
            if now - session['last_access'] >= self._session_timeout
        ]
        for user_id in expired:
            del self._sessions[user_id]

session_manager = SecureSessionManager()