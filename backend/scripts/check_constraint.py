from database.db_config import get_connection
conn = get_connection()
cur = conn.cursor()
cur.execute("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'eventos_status_check'")
print(cur.fetchone())
