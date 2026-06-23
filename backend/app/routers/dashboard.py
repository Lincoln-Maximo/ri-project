from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.database.db_config import get_connection
from app.routers.auth import get_current_user

router = APIRouter()

def get_interval(period: str):
    if period == "7d":
        return "7 days"
    elif period == "30d":
        return "30 days"
    elif period == "all":
        return "100 years"
    return "24 hours"

@router.get("/summary")
async def obter_resumo_dashboard(
    period: str = Query("24h", enum=["24h", "7d", "30d", "all", "custom"]),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user)
):
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        if period == "custom" and start_date and end_date:
            condition = "ocorrido_em BETWEEN %s AND %s"
            params = [start_date, end_date]
        else:
            interval = get_interval(period)
            condition = "ocorrido_em > NOW() - INTERVAL %s"
            params = [interval]

        cur.execute("SELECT COUNT(*) FROM cameras WHERE status = 'ativa'")
        cameras_ativas = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(*) FROM eventos WHERE {condition}", params)
        total_deteccoes = cur.fetchone()[0]

        cur.execute(f"""
            SELECT COUNT(*) FROM eventos 
            WHERE tipo_violacao_id IS NOT NULL 
            AND {condition}
        """, params)
        violacoes = cur.fetchone()[0]

        cur.execute(f"""
            SELECT COUNT(*) FROM eventos 
            WHERE tipo_violacao_id IS NOT NULL 
            AND colaborador_id IS NOT NULL
            AND {condition}
        """, params)
        violacoes_reconhecidas = cur.fetchone()[0]

        cur.execute(f"""
            SELECT COUNT(*) FROM eventos 
            WHERE colaborador_id IS NOT NULL 
            AND {condition}
        """, params)
        faces_reconhecidas = cur.fetchone()[0]

        return {
            "cameras_ativas": cameras_ativas,
            "total_deteccoes": total_deteccoes,
            "violacoes": violacoes,
            "violacoes_reconhecidas": violacoes_reconhecidas,
            "faces_reconhecidas": faces_reconhecidas
        }
    finally:
        cur.close()
        conn.close()

@router.get("/chart-data")
async def obter_dados_grafico(
    period: str = Query("7d", enum=["24h", "7d", "30d", "all", "custom"]),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user)
):
    conn = get_connection()
    try:
        cur = conn.cursor()

        if period == "custom" and start_date and end_date:
            condition = "ocorrido_em BETWEEN %s AND %s"
            params = [start_date, end_date]
        else:
            interval = get_interval(period)
            condition = "ocorrido_em > NOW() - INTERVAL %s"
            params = [interval]

        cur.execute(f"""
            SELECT s.nome, COUNT(e.id) as total
            FROM eventos e
            JOIN setores s ON e.setor_id = s.id
            WHERE e.tipo_violacao_id IS NOT NULL
            AND e.{condition}
            GROUP BY s.nome
        """, params)
        por_setor = [{"name": r[0], "valor": r[1]} for r in cur.fetchall()]
        
        # 1. Gráfico de Detecções de EPI (por tipo de violação)
        cur.execute(f"""
            SELECT tv.nome, COUNT(e.id) as total
            FROM eventos e
            JOIN tipos_violacao tv ON e.tipo_violacao_id = tv.id
            WHERE e.{condition}
            GROUP BY tv.nome
        """, params)
        por_tipo_epi = [{"name": r[0], "valor": r[1]} for r in cur.fetchall()]

        # 2. Gráfico Comparativo (Hoje vs Ontem)
        cur.execute("""
            SELECT 
                COUNT(*) FILTER (WHERE ocorrido_em >= CURRENT_DATE) as hoje,
                COUNT(*) FILTER (WHERE ocorrido_em >= CURRENT_DATE - INTERVAL '1 day' AND ocorrido_em < CURRENT_DATE) as ontem
            FROM eventos
        """)
        comparativo = cur.fetchone()
        dados_comparativos = [
            {"name": "Ontem", "valor": comparativo[1] or 0},
            {"name": "Hoje", "valor": comparativo[0] or 0}
        ]
        
        return {
            "por_setor": por_setor, 
            "por_tipo_epi": por_tipo_epi,
            "comparativo_diario": dados_comparativos
        }
    finally:
        cur.close()
        conn.close()
