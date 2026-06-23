from database.db_config import get_connection
conn = get_connection()
cur = conn.cursor()
try:
    cur.execute("ALTER TABLE eventos ADD COLUMN screenshot_url TEXT")
    conn.commit()
    print("Coluna screenshot_url adicionada com sucesso.")
except Exception as e:
    conn.rollback()
    print(f"Erro ou coluna já existe: {e}")
finally:
    cur.close()
    conn.close()
