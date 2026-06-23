from pydantic import BaseModel, EmailStr
from typing import Optional

class Usuario(BaseModel):
    nome_completo: str
    email: EmailStr
    password: Optional[str] = None
    telefone: Optional[str] = None
    id_funcionario: Optional[str] = None
    departamento: Optional[str] = None
    cargo: Optional[str] = None
    foto_url: Optional[str] = None
    alerta_email: bool = True
    alerta_sms: bool = False
    notificacao_sistema: bool = True

class UsuarioUpdate(BaseModel):
    nome_completo: Optional[str] = None
    email: Optional[EmailStr] = None
    telefone: Optional[str] = None
    id_funcionario: Optional[str] = None
    departamento: Optional[str] = None
    cargo: Optional[str] = None
    alerta_email: Optional[bool] = None
    alerta_sms: Optional[bool] = None
    notificacao_sistema: Optional[bool] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class PasswordChangeRequest(BaseModel):
    senha_atual: str
    nova_senha: str

class Camera(BaseModel):
    nome: str
    modelo: Optional[str] = None
    fabricante: Optional[str] = None
    localizacao: Optional[str] = None
    setor_id: str
    link_rtsp: str
    modo_operacao: str
    inicio_operacao: Optional[str] = None
    fim_operacao: Optional[str] = None
    status: Optional[str] = 'ativa'
