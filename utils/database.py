from utils.mysql_client import get_connection
import mysql.connector

def use_db(db_name: str):
    conn = get_connection()
    cursor = conn.cursor()
    # Each user DB is a separate MySQL schema
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
    conn.database = db_name
    cursor.close()
    return conn

def is_select(sql: str) -> bool:
    return sql.strip().lower().startswith(("select", "with"))

def run_query(db_name: str, sql: str):
    conn = use_db(db_name)
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql)

        if is_select(sql):
            result = cursor.fetchall()
        else:
            conn.commit()
            result = {"message": "Query executed successfully"}

    except mysql.connector.Error as e:
        raise Exception(f"SQL execution failed: {str(e)}")
    finally:
        conn.close()

    return result