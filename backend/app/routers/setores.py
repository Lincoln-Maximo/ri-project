from fastapi import APIRouter, Depends, HTTPException
from app.database.db_config import get_connection
from app.routers.auth import get_current_user

router = APIRouter()

@router.get("/")
async def listar_setores(user_id: str = Depends(get_current_user)):
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Erro de conexão.")
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, nome FROM setores ORDER BY nome")
        rows = cur.fetchall()
        if not rows:
            # Auto-popular se vazio
            padrao = [('Produção', 'Setor de Produção'), ('Manutenção', 'Setor de Manutenção'), ('Logística', 'Setor de Logística')]
            for n, d in padrao: 
                cur.execute("INSERT INTO setores (nome, descricao) VALUES (%s, %s)", (n, d))
            conn.commit()
            cur.execute("SELECT id, nome FROM setores ORDER BY nome")
            rows = cur.fetchall()
        return [{"id": str(r[0]), "nome": r[1]} for r in rows]
    finally:
        cur.close()
        conn.close()
