import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    """Cria uma conexão com o banco usando variáveis de ambiente."""
    try:
        return psycopg2.connect(
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT")
        )
    except Exception as e:
        print(f"Erro ao conectar ao banco: {e}")
        return None

def salvar_evento(camera_id, setor_id, tipo_violacao_id, colaborador_id=None, local=None, miniatura_url=None):
    """
    Salva um evento de violação no banco.
    colaborador_id é opcional — pessoa pode não ser identificada.
    """
    conn = get_connection()
    if not conn:
        return None

    try:
        cur = conn.cursor()

        query = """
            INSERT INTO eventos (
                camera_id,
                setor_id,
                tipo_violacao_id,
                colaborador_id,
                local,
                miniatura_url,
                status,
                nivel_risco
            ) VALUES (%s, %s, %s, %s, %s, %s,
                CASE WHEN %s IS NULL THEN 'desconhecido' ELSE 'identificado' END,
                (SELECT nivel_perigo FROM tipos_violacao WHERE id = %s)
            )
            RETURNING id
        """

        cur.execute(query, (
            camera_id,
            setor_id,
            tipo_violacao_id,
            colaborador_id,
            local,
            miniatura_url,
            colaborador_id,    # usado no CASE
            tipo_violacao_id   # usado no SELECT do nivel_risco
        ))

        evento_id = cur.fetchone()[0]
        conn.commit()
        print(f"Evento salvo com sucesso. ID: {evento_id}")
        return evento_id

    except Exception as e:
        conn.rollback()
        print(f"Erro ao salvar evento: {e}")
        return None

    finally:
        cur.close()
        conn.close()