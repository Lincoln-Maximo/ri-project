import os
import secrets
import datetime
import bcrypt
import jwt
import logging
import time
import shutil
import smtplib
from email.message import EmailMessage
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, BackgroundTasks, Request, Query
from fastapi.responses import FileResponse
from app.models.schemas import (
    Usuario, UsuarioUpdate, LoginRequest, PasswordChangeRequest,
    PasswordResetRequest, PasswordResetConfirm
)
from app.database.db_config import get_connection
from app.utils.validation import validate_image
from app.utils.auth_utils import require_role, Role, get_current_user
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig

router = APIRouter()
logger = logging.getLogger(__name__)

# Configurações de Segurança
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("A variável de ambiente SECRET_KEY não está configurada.")
ALGORITHM = "HS256"

# Configuração de E-mail
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS=os.getenv("MAIL_TLS") == "True",
    MAIL_SSL_TLS=os.getenv("MAIL_SSL") == "True",
    USE_CREDENTIALS=True
)

from app.config_paths import STORAGE_DIR

security = HTTPBearer(auto_error=False)

# --- Helpers ---
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
    credentials = auth.credentials if auth and auth.credentials else token
    if not credentials:
        raise HTTPException(status_code=401, detail="Token não fornecido")
    try:
        payload = jwt.decode(credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id: raise HTTPException(status_code=401, detail="Token inválido")
        return user_id
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

def registrar_log_atividade(usuario_id, acao, entidade, entidade_id=None, ip=None):
    conn = get_connection()
    if not conn: return
    cur = conn.cursor()
    cur.execute("INSERT INTO logs_atividade (usuario_id, acao, entidade, entidade_id, ip, criado_em) VALUES (%s, %s, %s, %s, %s, NOW())", 
                (usuario_id, acao, entidade, entidade_id, ip))
    conn.commit()
    cur.close()
    conn.close()

def verificar_bloqueio(usuario_id):
    conn = get_connection()
    if not conn: return False
    cur = conn.cursor()
    limite_tempo = datetime.datetime.utcnow() - datetime.timedelta(minutes=15)
    cur.execute("SELECT COUNT(*) FROM logs_atividade WHERE usuario_id = %s AND acao = 'ALTERACAO_SENHA_FALHA' AND criado_em > %s", (usuario_id, limite_tempo))
    tentativas = cur.fetchone()[0]
    cur.close()
    conn.close()
    return tentativas >= 5

def verificar_bloqueio_ip(ip):
    conn = get_connection()
    if not conn: return False
    cur = conn.cursor()
    limite_tempo = datetime.datetime.utcnow() - datetime.timedelta(minutes=15)
    cur.execute("SELECT COUNT(*) FROM logs_atividade WHERE ip = %s AND acao = 'LOGIN_FALHA' AND criado_em > %s", (ip, limite_tempo))
    tentativas = cur.fetchone()[0]
    cur.close()
    conn.close()
    return tentativas >= 5

async def send_password_change_email(email: str, name: str, ip_address: str, user_agent: str):
    try:
        data_hora = datetime.datetime.now().strftime("%d/%m/%Y às %H:%M")
        message = MessageSchema(
            subject="Sua senha foi alterada — Real Intelligence",
            recipients=[email],
            body=f"""Olá, {name},

Sua senha de acesso ao sistema Real Intelligence foi alterada com sucesso.

Detalhes da operação:
- Data e hora: {data_hora} (horário de Brasília)
- IP de origem: {ip_address}
- Dispositivo/navegador: {user_agent}

Se você não realizou essa alteração, acesse o sistema imediatamente e entre em contato com o suporte.""",
            subtype="plain"
        )
        fm = FastMail(conf)
        await fm.send_message(message)
        logger.info(f"E-mail de notificação de segurança enviado para: {email}")
    except Exception as e:
        logger.error(f"Falha ao enviar e-mail de notificação de senha para {email}: {e}")

# --- Rotas ---

@router.post("/login")
async def login(request: LoginRequest, http_request: Request):
    client_ip = http_request.client.host
    if verificar_bloqueio_ip(client_ip):
         raise HTTPException(status_code=429, detail="Muitas tentativas. Tente novamente mais tarde.")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, nome_completo, email, senha_hash, cargo, foto_url FROM usuarios WHERE LOWER(email) = LOWER(%s)", (request.email,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    
    if not user or not bcrypt.checkpw(request.password.encode('utf-8'), user[3].encode('utf-8')):
        registrar_log_atividade(None, 'LOGIN_FALHA', 'login', None, client_ip)
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token = jwt.encode({"sub": str(user[0]), "email": user[2], "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer", "user": {"id": str(user[0]), "nome": user[1], "email": user[2], "cargo": user[4], "foto_url": user[5]}}

@router.post("/usuarios")
async def cadastrar_usuario(usuario: Usuario, http_request: Request, background_tasks: BackgroundTasks, user_id: str = Depends(require_role(Role.ADMIN))):
    conn = get_connection()
    cur = conn.cursor()

    pwd = usuario.password or secrets.token_urlsafe(16)
    hashed = bcrypt.hashpw(pwd.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    cur.execute("INSERT INTO usuarios (nome_completo, email, senha_hash, cargo) VALUES (%s, %s, %s, %s) RETURNING id", 
                (usuario.nome_completo, usuario.email, hashed, usuario.cargo))
    uid = cur.fetchone()[0]
    conn.commit()
    cur.close(); conn.close()
    return {"id": str(uid)}

@router.get("/me")
async def get_me(user_id: str = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, nome_completo, email, cargo, foto_url FROM usuarios WHERE id = %s", (user_id,))
    u = cur.fetchone()
    cur.close(); conn.close()
    if not u: raise HTTPException(status_code=404)
    return {"id": str(u[0]), "nome": u[1], "email": u[2], "cargo": u[3], "foto_url": u[4]}

@router.put("/usuarios/me")
async def update_me(usuario: UsuarioUpdate, user_id: str = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE usuarios SET nome_completo=%s, email=%s WHERE id=%s", (usuario.nome_completo, usuario.email, user_id))
    conn.commit()
    cur.close(); conn.close()
    return {"message": "Atualizado"}

@router.post("/usuarios/me/senha")
async def change_password(
    request: PasswordChangeRequest, 
    background_tasks: BackgroundTasks,
    http_request: Request,
    user_id: str = Depends(get_current_user)
):
    if verificar_bloqueio(user_id):
        raise HTTPException(status_code=429, detail="Conta bloqueada temporariamente.")
    
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
    
    client_ip = http_request.client.host
    
    try:
        cur = conn.cursor()
        cur.execute("SELECT senha_hash, nome_completo, email FROM usuarios WHERE id = %s", (user_id,))
        user = cur.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        hashed_password, nome, email = user
        
        if not bcrypt.checkpw(request.senha_atual.encode('utf-8'), hashed_password.encode('utf-8')):
            registrar_log_atividade(user_id, "ALTERACAO_SENHA_FALHA", "usuario", user_id, ip=client_ip)
            raise HTTPException(status_code=401, detail="Senha atual incorreta")

        new_hashed = bcrypt.hashpw(request.nova_senha.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        cur.execute("UPDATE usuarios SET senha_hash = %s WHERE id = %s", (new_hashed, user_id))
        conn.commit()
        
        registrar_log_atividade(user_id, "ALTERACAO_SENHA_SUCESSO", "usuario", user_id, ip=client_ip)
        background_tasks.add_task(send_password_change_email, email, nome, client_ip, http_request.headers.get("user-agent", ""))
        
        return {"message": "Senha alterada!"}
    finally:
        cur.close()
        conn.close()

@router.post("/usuarios/me/foto")
async def update_profile_photo(foto: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    await validate_image(foto)
    logger.info(f"Recebendo upload de foto para usuario: {user_id}")
    filename = f"avatar_{user_id}_{int(time.time())}.jpeg"
    path = os.path.join(STORAGE_DIR, filename)
    logger.info(f"Salvando foto em: {path}")
    
    try:
        with open(path, "wb") as f: shutil.copyfileobj(foto.file, f)
        logger.info("Foto salva com sucesso no disco.")
    except Exception as e:
        logger.error(f"Erro ao salvar foto no disco: {e}")
        raise HTTPException(status_code=500, detail="Erro ao salvar arquivo")
        
    conn = get_connection()
    cur = conn.cursor()
    logger.info(f"Atualizando banco de dados para usuario {user_id} com URL /profile_pictures/{filename}")
    cur.execute("UPDATE usuarios SET foto_url = %s WHERE id = %s", (f"/profile_pictures/{filename}", user_id))
    conn.commit()
    cur.close(); conn.close()
    logger.info("Banco de dados atualizado.")
    return {"foto_url": f"/profile_pictures/{filename}"}

@router.get("/profile_pictures/{filename}")
async def get_profile_picture(filename: str):
    path = os.path.join(STORAGE_DIR, filename)
    if not os.path.exists(path): raise HTTPException(status_code=404)
    return FileResponse(path, media_type="image/jpeg", headers={"Cross-Origin-Resource-Policy": "cross-origin"})

# ==========================================
# ENDPOINTS DE RECUPERAÇÃO DE SENHA
# ==========================================

@router.post("/request-password-reset")
async def request_password_reset(request: PasswordResetRequest):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, nome_completo, email FROM usuarios WHERE LOWER(email) = LOWER(%s)", (request.email,))
    user = cur.fetchone()
    cur.close(); conn.close()
    if not user: return {"message": "Instruções enviadas se o e-mail existir."}
    
    user_id, nome, email = user
    token = jwt.encode(
        {"sub": str(user_id), "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=15), "type": "password_reset"},
        SECRET_KEY, algorithm=ALGORITHM
    )
    reset_link = f"http://localhost/reset-password?token={token}"
    
    try:
        msg = EmailMessage()
        msg['Subject'] = "Recuperação de Senha — Real Intelligence"
        msg['From'] = os.getenv("MAIL_USERNAME")
        msg['To'] = email
        msg.set_content(f"Olá {nome},\n\nLink: {reset_link}\n\nExpira em 15 min.")
        
        with smtplib.SMTP(os.getenv("MAIL_SERVER"), int(os.getenv("MAIL_PORT", 587))) as server:
            server.starttls()
            server.login(os.getenv("MAIL_USERNAME"), os.getenv("MAIL_PASSWORD"))
            server.send_message(msg)
        return {"message": "Instruções enviadas para o seu e-mail."}
    except Exception as e:
        logger.error(f"Erro no envio SMTP: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao enviar e-mail")

@router.post("/reset-password")
async def reset_password(request: PasswordResetConfirm):
    try:
        payload = jwt.decode(request.token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "password_reset": raise Exception()
        h = bcrypt.hashpw(request.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        conn = get_connection(); cur = conn.cursor()
        cur.execute("UPDATE usuarios SET senha_hash = %s WHERE id = %s", (h, payload["sub"]))
        conn.commit(); cur.close(); conn.close()
        return {"message": "Senha redefinida com sucesso!"}
    except: raise HTTPException(status_code=400, detail="Token inválido")
