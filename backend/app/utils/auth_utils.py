from enum import Enum
from typing import Optional
from fastapi import Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os
from app.database.db_config import get_connection


SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

security = HTTPBearer(auto_error=False)

async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    if not auth or not auth.credentials:
        raise HTTPException(status_code=401, detail="Token não fornecido")
    try:
        payload = jwt.decode(auth.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id: raise HTTPException(status_code=401, detail="Token inválido")
        return user_id
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_optional_token_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    token: Optional[str] = Query(None)
):
    credentials = None
    if auth and hasattr(auth, 'credentials') and auth.credentials:
        credentials = auth.credentials
    elif token:
        credentials = token
        
    if not credentials:
        return None  # Token é opcional, retorna None em vez de exceção
    
    try:
        payload = jwt.decode(credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id: 
            return None
        return user_id
    except Exception as e:
        print(f"Auth error: {e}")
        return None  # Retorna None em vez de lançar exceção

class Role(str, Enum):
    ADMIN = "admin"
    OPERADOR = "operador"

def require_role(required_role: Role):
    async def role_checker(user_id: str = Depends(get_current_user)):
        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT cargo FROM usuarios WHERE id = %s", (user_id,))
            res = cur.fetchone()
            
            if not res or res[0].lower() != required_role.value.lower():
                raise HTTPException(status_code=403, detail=f"Requer cargo: {required_role.value}")
        finally:
            cur.close()
            conn.close()
        return user_id
    return role_checker
