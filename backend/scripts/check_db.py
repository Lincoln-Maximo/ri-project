import psycopg2
import os
from dotenv import load_dotenv


load_dotenv(dotenv_path="backend/.env")

try:
    conn = psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT")
    )
    cur = conn.cursor()
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cameras'")
    cols = cur.fetchall()
    print("Columns in 'cameras' table:")
    for col in cols:
        print(f"- {col[0]}: {col[1]}")
    
    cur.execute("SELECT status FROM cameras WHERE id = '50bd01e5-6330-49c0-8fbf-d235da480eb4'")
    row = cur.fetchone()
    print(f"\nCurrent status of camera 50bd01e5...: {row[0] if row else 'Not found'}")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
