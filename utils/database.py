from routes.db_routes import get_db_path
import os
import sqlite3

SQLITE_TIMEOUT = 30  # seconds


def use_db(db_name: str) -> sqlite3.Connection:
    path = get_db_path(db_name)
    if not os.path.exists(path):
        raise Exception(f"Database '{db_name}' does not exist")
    return sqlite3.connect(path, check_same_thread=False, timeout=SQLITE_TIMEOUT)


def is_select(sql: str) -> bool:
    return sql.strip().lower().startswith(("select", "with"))


def run_query(db_name: str, sql: str):
    conn = use_db(db_name)
    try:
        cursor = conn.cursor()
        cursor.execute(sql)

        if is_select(sql):
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            result = [dict(zip(columns, row)) for row in rows]
        else:
            conn.commit()
            result = {"message": "Query executed successfully"}

    except Exception as e:
        raise Exception(f"SQL execution failed: {str(e)}")

    finally:
        conn.close()

    return result