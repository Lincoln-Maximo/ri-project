import psycopg2
import os
from dotenv import load_dotenv


load_dotenv(dotenv_path="../.env")

try:
    conn = psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT")
    )
    cur = conn.cursor()
    
    cur.execute("SELECT id, nome, foto_path FROM colaboradores LIMIT 10;")
    rows = cur.fetchall()
    
    print(f"{'ID':<40} | {'Nome':<30} | {'Foto Path'}")
    print("-" * 100)
    for r in rows:
        print(f"{str(r[0]):<40} | {r[1]:<30} | {r[2]}")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
