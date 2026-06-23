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
    
    camera_id = '50bd01e5-6330-49c0-8fbf-d235da480eb4'
    new_status = 'offline'
    
    print(f"Updating camera {camera_id} to status '{new_status}'...")
    cur.execute("UPDATE cameras SET status = %s WHERE id = %s::uuid", (new_status, camera_id))
    print(f"Rows affected: {cur.rowcount}")
    conn.commit()
    
    cur.execute("SELECT status FROM cameras WHERE id = %s::uuid", (camera_id,))
    row = cur.fetchone()
    print(f"Status after update: {row[0]}")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
