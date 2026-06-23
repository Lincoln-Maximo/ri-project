import hashlib
from fastapi import APIRouter, Depends, HTTPException, Request
from app.models.schemas import Camera
from app.database.db_config import get_connection
from app.routers.auth import get_current_user
from app.services.stream_manager import stream_manager

router = APIRouter()

@router.get("/")
async def listar_cameras(user_id: str = Depends(get_current_user)):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT c.id, c.nome, c.modelo, c.fabricante, c.localizacao, s.nome, c.link_rtsp, c.modo_operacao, c.status 
            FROM cameras c 
            LEFT JOIN setores s ON c.setor_id = s.id
        """)
        return [
            {"id": str(r[0]), "nome": r[1], "modelo": r[2], "fabricante": r[3], "localizacao": r[4], "setor": r[5], "rtsp": r[6], "mode": r[7], "status": r[8]} 
            for r in cur.fetchall()
        ]
    finally:
        cur.close()
        conn.close()

@router.get("/{camera_id}")
async def obter_camera(camera_id: str, user_id: str = Depends(get_current_user)):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, nome, modelo, fabricante, localizacao, setor_id, link_rtsp, modo_operacao, inicio_operacao, fim_operacao, status 
            FROM cameras WHERE id = %s::uuid
        """, (camera_id,))
        r = cur.fetchone()
        if not r: raise HTTPException(status_code=404)
        return {
            "id": str(r[0]), "nome": r[1], "modelo": r[2], "fabricante": r[3], "localizacao": r[4], "setor_id": str(r[5]), "link_rtsp": r[6],
            "modo_operacao": r[7], 
            "inicio_operacao": r[8].strftime("%H:%M") if r[8] and hasattr(r[8], 'strftime') else str(r[8]) if r[8] else None,
            "fim_operacao": r[9].strftime("%H:%M") if r[9] and hasattr(r[9], 'strftime') else str(r[9]) if r[9] else None, 
            "status": r[10]
        }
    finally:
        cur.close()
        conn.close()

@router.post("/")
async def cadastrar_camera(camera: Camera, user_id: str = Depends(get_current_user)):
    conn = get_connection()
    try:
        cur = conn.cursor()
        query = """
            INSERT INTO cameras (nome, modelo, fabricante, localizacao, setor_id, link_rtsp, modo_operacao, inicio_operacao, fim_operacao, status) 
            VALUES (%s, %s, %s, %s, %s::uuid, %s, %s, %s, %s, %s) RETURNING id
        """
        cur.execute(query, (camera.nome, camera.modelo, camera.fabricante, camera.localizacao, camera.setor_id, camera.link_rtsp, camera.modo_operacao, camera.inicio_operacao, camera.fim_operacao, camera.status))
        cid = cur.fetchone()[0]
        conn.commit()
        return {"id": str(cid)}
    finally:
        cur.close()
        conn.close()

@router.put("/{camera_id}")
async def atualizar_camera(camera_id: str, camera: Camera, user_id: str = Depends(get_current_user)):
    conn = get_connection()
    try:
        cur = conn.cursor()
        query = """
            UPDATE cameras SET nome=%s, modelo=%s, fabricante=%s, localizacao=%s, setor_id=%s::uuid, link_rtsp=%s, 
            modo_operacao=%s, inicio_operacao=%s, fim_operacao=%s, status=%s, atualizado_em=NOW() 
            WHERE id=%s::uuid
        """
        cur.execute(query, (camera.nome, camera.modelo, camera.fabricante, camera.localizacao, camera.setor_id, camera.link_rtsp, camera.modo_operacao, camera.inicio_operacao, camera.fim_operacao, camera.status, camera_id))
        conn.commit()
        return {"message": "Atualizada"}
    finally:
        cur.close()
        conn.close()

@router.delete("/{camera_id}")
async def deletar_camera(camera_id: str, user_id: str = Depends(get_current_user)):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM cameras WHERE id = %s::uuid", (camera_id,))
        conn.commit()
        return {"message": "Removida"}
    finally:
        cur.close()
        conn.close()

@router.post("/test")
async def testar_camera(payload: dict, request: Request, user_id: str = Depends(get_current_user)):
    url = payload.get("url", "").strip()
    db_id = payload.get("camera_db_id")
    
    if not url: raise HTTPException(status_code=400, detail="URL de Stream (RTSP/RTMP) é obrigatória")
    
    cid = hashlib.md5(url.encode()).hexdigest()[:12]
    stream_manager.start_stream(cid, url, db_id=db_id)
    
    import asyncio
    for _ in range(30):
        if stream_manager.get_frame(cid) is not None: break
        await asyncio.sleep(0.1)
    
    base_url = str(request.base_url).rstrip('/')
    return {"stream_url": f"{base_url}/cameras/{cid}/stream/feed", "camera_id": cid}
