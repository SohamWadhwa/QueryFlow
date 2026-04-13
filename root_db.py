import sqlite3
import os

ROOT_DB = os.path.join(
    "databases",
    "root_backend.db"
)

def get_root_db_connection():
    return sqlite3.connect(ROOT_DB, timeout=10, check_same_thread=False)


def initialize_root_db():
    try:
        conn = get_root_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS pending_queries (
            id TEXT PRIMARY KEY,
            db_name TEXT NOT NULL,
            sql TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_status 
        ON pending_queries(status);
        """)

        conn.commit()
    finally:
        conn.close()