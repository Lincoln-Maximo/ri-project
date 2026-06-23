import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database.db_config import get_connection

def check_events():
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, miniatura_url, screenshot_url FROM eventos ORDER BY ocorrido_em DESC LIMIT 5")
        rows = cur.fetchall()
        for r in rows:
            print(f"ID: {r[0]}, Mini: {r[1]}, Screen: {r[2]}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    check_events()
