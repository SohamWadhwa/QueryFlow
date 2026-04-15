from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from utils.mysql_client import get_connection

router = APIRouter()

class DBRequest(BaseModel):
    db_name: str

def is_valid_name(name: str):
    return name.replace("_", "").isalnum()

@router.post("/create")
def create_db(req: DBRequest):
    if not is_valid_name(req.db_name):
        raise HTTPException(400, "Invalid database name")
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{req.db_name}`")
        conn.commit()
    finally:
        cursor.close()
        conn.close()
    return {"success": True, "message": f"Database '{req.db_name}' created", "db_name": req.db_name}

@router.get("/list")
def list_dbs():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SHOW DATABASES")
        system_dbs = {"information_schema", "mysql", "performance_schema", "sys", "queryflow", "defaultdb"}
        dbs = [row[0] for row in cursor.fetchall() if row[0] not in system_dbs]
    finally:
        cursor.close()
        conn.close()
    return {"success": True, "databases": dbs}

@router.post("/delete")
def delete_db(req: DBRequest):
    if not is_valid_name(req.db_name):
        raise HTTPException(400, "Invalid database name")
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"DROP DATABASE IF EXISTS `{req.db_name}`")
        conn.commit()
    finally:
        cursor.close()
        conn.close()
    return {"success": True, "message": f"Database '{req.db_name}' deleted"}

@router.post("/schema")
def get_schema(req: DBRequest):
    if not is_valid_name(req.db_name):
        raise HTTPException(400, "Invalid database name")
    conn = get_connection()
    conn.database = req.db_name
    cursor = conn.cursor()
    try:
        cursor.execute("SHOW TABLES")
        tables = [row[0] for row in cursor.fetchall()]
        schema = []
        for table in tables:
            cursor.execute(f"DESCRIBE `{table}`")
            columns = [{"name": r[0], "type": r[1], "not_null": r[2] == "NO",
                        "primary_key": r[3] == "PRI", "default_value": r[4]} for r in cursor.fetchall()]
            schema.append({"table": table, "columns": columns})
    finally:
        cursor.close()
        conn.close()
    return {"success": True, "db_name": req.db_name, "schema": schema}

def get_db_path(db_name: str):
    return db_name  

def get_schema_for_model(req: DBRequest):
    if not is_valid_name(req.db_name):
        raise HTTPException(400, "Invalid database name")
    conn = get_connection()
    conn.database = req.db_name
    cursor = conn.cursor()
    try:
        cursor.execute("SHOW TABLES")
        tables = [row[0] for row in cursor.fetchall()]
        schema_parts = []
        for table in tables:
            cursor.execute(f"SHOW CREATE TABLE `{table}`")
            row = cursor.fetchone()
            schema_parts.append({"table": table, "schema": row[1]})
    finally:
        cursor.close()
        conn.close()
    return {"success": True, "db_name": req.db_name, "schema": schema_parts}

@router.post("/all-tables")
def get_all_tables(req: DBRequest):
    if not is_valid_name(req.db_name):
        raise HTTPException(400, "Invalid database name")
    conn = get_connection()
    conn.database = req.db_name
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SHOW TABLES")
        table_names = [list(row.values())[0] for row in cursor.fetchall()]
        tables = []
        for table in table_names:
            cursor.execute(f"SELECT * FROM `{table}` LIMIT 50")
            rows = cursor.fetchall()
            tables.append({"table": table, "columns": list(rows[0].keys()) if rows else [],
                           "rows": rows, "total_shown": len(rows), "capped": len(rows) == 50})
    finally:
        cursor.close()
        conn.close()
    return {"success": True, "db_name": req.db_name, "tables": tables}