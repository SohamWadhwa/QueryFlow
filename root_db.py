from utils.mysql_client import get_connection

def get_root_db_connection():
    return get_connection()

def initialize_root_db():
    conn = get_root_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pending_queries (
                id VARCHAR(36) PRIMARY KEY,
                db_name VARCHAR(255) NOT NULL,
                `sql` TEXT NOT NULL,
                status VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        # cursor.execute("""
        #     CREATE INDEX idx_status 
        #     ON pending_queries(status);
        # """)
        conn.commit()
    finally:
        cursor.close()
        conn.close()