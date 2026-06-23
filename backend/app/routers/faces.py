import os
import time
import shutil
import logging
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from fastapi.responses import FileResponse
from app.database.db_config import get_connection
from app.utils.auth_utils import get_optional_token_user
from app.services.stream_manager import stream_manager

router = APIRouter()
logger = logging.getLogger(__name__)

from app.config_paths import KNOWN_FACES_DIR
from app.utils.validation import validate_image

@router.post("/")
async def cadastrar_face(
    nome: str = Form(...), 
    matricula: str = Form(...), 
    setor: str = Form(None),  # Nome do campo que o frontend envia
    setor_id: str = Form(None),  # Também aceita setor_id
    cargo: str = Form(""), 
    foto: UploadFile = File(...), 
    user_id: str = Depends(get_optional_token_user)
):
    logger.info(f"Iniciando cadastro de face: nome={nome}, matricula={matricula}")
    
    # Usar setor_id se fornecido, senão usar setor
    raw_setor_value = setor_id or setor
    
    if not raw_setor_value:
        logger.error(f"Erro: setor_id não fornecido (setor={setor}, setor_id={setor_id})")
        raise HTTPException(status_code=400, detail="setor_id é obrigatório")
    
    await validate_image(foto)
    
    if not nome or not matricula:
        logger.error(f"Dados inválidos: nome={nome}, matricula={matricula}")
        raise HTTPException(status_code=400, detail="nome e matricula são obrigatórios")
    
    name = f"{matricula}_{nome.replace(' ', '')}.jpg"
    path = os.path.join(KNOWN_FACES_DIR, name)
    logger.info(f"Salvando foto em: {path}")
    
    try:
        with open(path, "wb") as f: 
            shutil.copyfileobj(foto.file, f)
        logger.info(f"Foto salva com sucesso")
    except Exception as e:
        logger.error(f"Erro ao salvar foto: {e}")
        raise HTTPException(status_code=500, detail="Erro ao salvar arquivo de foto")
    
    conn = get_connection()
    try:
        cur = conn.cursor()

        # Resolve o setor: se vier um UUID válido, usa; se vier um nome, busca no banco
        if isinstance(raw_setor_value, str) and raw_setor_value.strip():
            try:
                # Tenta validar como UUID
                import uuid
                uuid.UUID(raw_setor_value)
                final_setor_id = raw_setor_value
            except ValueError:
                # Se não for UUID, busca pelo nome do setor
                cur.execute("SELECT id FROM setores WHERE LOWER(nome) = LOWER(%s) LIMIT 1", (raw_setor_value.strip(),))
                setor_row = cur.fetchone()
                if not setor_row:
                    raise HTTPException(status_code=400, detail=f"Setor não encontrado: {raw_setor_value}")
                final_setor_id = str(setor_row[0])
        else:
            final_setor_id = str(raw_setor_value)

        logger.info(f"Inserindo no banco: nome_completo={nome}, matricula={matricula}, setor_id={final_setor_id}, cargo={cargo}")
        cur.execute("""
            INSERT INTO colaboradores (nome_completo, matricula, setor_id, cargo, foto_url, status_bio) 
            VALUES (%s, %s, %s::uuid, %s, %s, 'pendente') RETURNING id
        """, (nome, matricula, final_setor_id, cargo if cargo else None, path))
        fid = cur.fetchone()[0]
        conn.commit()
        logger.info(f"Face registrada com sucesso. ID: {fid}")
        return {"id": str(fid)}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Erro ao registrar face: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Erro ao registrar face: {str(e)}")
    finally:
        cur.close()
        conn.close()

@router.put("/{face_id}")
async def atualizar_face(
    face_id: str,
    nome: str = Form(None), 
    matricula: str = Form(None), 
    setor: str = Form(None),
    cargo: str = Form(None), 
    foto: UploadFile = File(None), 
    user_id: str = Depends(get_optional_token_user)
):
    logger.info(f"Iniciando atualização de face: id={face_id}")
    
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Busca face existente
        cur.execute("SELECT nome_completo, matricula, setor_id, cargo, foto_url FROM colaboradores WHERE id = %s::uuid", (face_id,))
        existing = cur.fetchone()
        
        if not existing:
            raise HTTPException(status_code=404, detail="Face não encontrada")
        
        # Usa valores existentes se não fornecidos
        new_nome = nome if nome else existing[0]
        new_matricula = matricula if matricula else existing[1]
        new_setor_id = existing[2]
        new_cargo = cargo if cargo else existing[3]
        new_foto_url = existing[4]
        
        # Se setor foi fornecido, resolve o ID
        if setor:
            try:
                import uuid
                uuid.UUID(setor)
                new_setor_id = setor
            except ValueError:
                cur.execute("SELECT id FROM setores WHERE LOWER(nome) = LOWER(%s) LIMIT 1", (setor.strip(),))
                setor_row = cur.fetchone()
                if not setor_row:
                    raise HTTPException(status_code=400, detail=f"Setor não encontrado: {setor}")
                new_setor_id = str(setor_row[0])
        
        # Se foto foi fornecida, salva a nova
        if foto:
            await validate_image(foto)
            name = f"{new_matricula}_{new_nome.replace(' ', '')}.jpg"
            path = os.path.join(KNOWN_FACES_DIR, name)
            logger.info(f"Salvando nova foto em: {path}")
            
            try:
                with open(path, "wb") as f: 
                    shutil.copyfileobj(foto.file, f)
                logger.info(f"Foto salva com sucesso")
                new_foto_url = path
            except Exception as e:
                logger.error(f"Erro ao salvar foto: {e}")
                raise HTTPException(status_code=500, detail="Erro ao salvar arquivo de foto")
        
        # Atualiza no banco
        logger.info(f"Atualizando face: nome={new_nome}, matricula={new_matricula}, setor_id={new_setor_id}, cargo={new_cargo}")
        cur.execute("""
            UPDATE colaboradores 
            SET nome_completo = %s, matricula = %s, setor_id = %s::uuid, cargo = %s, foto_url = %s
            WHERE id = %s::uuid
        """, (new_nome, new_matricula, new_setor_id, new_cargo, new_foto_url, face_id))
        conn.commit()
        logger.info(f"Face atualizada com sucesso")
        
        return {"id": face_id}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Erro ao atualizar face: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Erro ao atualizar face: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.get("/")
async def listar_faces(user_id: str = Depends(get_optional_token_user)):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT c.id, c.nome_completo, c.matricula, s.nome, c.cargo, c.foto_url, c.status_bio, c.ultima_deteccao, c.local_ultima_deteccao, c.criado_em 
            FROM colaboradores c
            LEFT JOIN setores s ON c.setor_id = s.id
            ORDER BY c.criado_em DESC
        """)
        return [
            {
                "id": str(r[0]), "nome": r[1], "matricula": r[2], "setor": r[3], "cargo": r[4], 
                "foto_url": f"/faces/{str(r[0])}/photo" if r[5] else None, 
                "status": r[6], "ultima_deteccao": r[7]
            } 
            for r in cur.fetchall()
        ]
    finally:
        cur.close()
        conn.close()

@router.get("/{face_id}/photo")
async def obter_foto_face(face_id: str, user_id: str = Depends(get_optional_token_user)):
    logger.info(f"Obtendo foto da face: {face_id}, por usuário: {user_id}")
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT foto_url FROM colaboradores WHERE id = %s::uuid", (face_id,))
        r = cur.fetchone()
        if not r or not r[0]:
            logger.warning(f"Foto não encontrada no banco para ID: {face_id}")
            raise HTTPException(status_code=404, detail="Foto não encontrada")
        
        path = r[0]
        logger.info(f"Caminho da foto no banco: {path}")
        
        if not os.path.exists(path):
            filename = os.path.basename(path)
            alt_path = os.path.join(KNOWN_FACES_DIR, filename)
            logger.info(f"Tentando caminho alternativo: {alt_path}")
            if os.path.exists(alt_path): 
                path = alt_path
            else: 
                logger.error(f"Foto não encontrada no disco: {path}")
                raise HTTPException(status_code=404, detail="Arquivo não encontrado")
            
        return FileResponse(path, media_type="image/jpeg", headers={"Cross-Origin-Resource-Policy": "cross-origin"})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro inesperado ao servir foto: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno ao servir foto")
    finally:
        cur.close()
        conn.close()

@router.delete("/{face_id}")
async def deletar_face(face_id: str, user_id: str = Depends(get_optional_token_user)):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT foto_url FROM colaboradores WHERE id = %s::uuid", (face_id,))
        r = cur.fetchone()
        cur.execute("DELETE FROM colaboradores WHERE id = %s::uuid", (face_id,))
        conn.commit()
        if r and r[0] and os.path.exists(r[0]): os.remove(r[0])
        
        # Atualiza o identificador de faces na stream
        stream_manager.refresh_face_identifier()
        
        return {"message": "Removida"}
    finally:
        cur.close()
        conn.close()
