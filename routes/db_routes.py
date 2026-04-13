from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import sqlite3
from config.config import settings

router = APIRouter()

DB_DIR = settings.DB_DIR
os.makedirs(DB_DIR, exist_ok=True)

class DBRequest(BaseModel):
    db_name: str

def is_valid_name(name: str):
    return name.replace("_", "").isalnum()


def get_db_path(db_name: str):
    return os.path.join(DB_DIR, f"{db_name}.db")

@router.post("/create")
def create_db(req: DBRequest):
    db_name = req.db_name

    if not is_valid_name(db_name):
        raise HTTPException(400, "Invalid database name")

    path = get_db_path(db_name)

    if os.path.exists(path):
        raise HTTPException(400, "Database already exists")

    conn = sqlite3.connect(path)
    conn.close()

    return {
        "success": True,
        "message": f"Database '{db_name}' created successfully",
        "db_name": db_name,
    }


@router.get("/list")
def list_dbs():
    databases = [
        f.replace(".db", "")
        for f in os.listdir(DB_DIR)
        if f.endswith(".db") and f != "root_backend.db"
    ]

    return {
        "success": True,
        "databases": databases,
    }


@router.post("/delete")
def delete_db(req: DBRequest):
    db_name = req.db_name
    print(f"Attempting to delete database: {db_name}")

    if not is_valid_name(db_name):
        raise HTTPException(400, "Invalid database name")

    path = get_db_path(db_name)

    if not os.path.exists(path):
        raise HTTPException(404, "Database does not exist")

    os.remove(path)

    return {
        "success": True,
        "message": f"Database '{db_name}' deleted successfully",
        "db_name": db_name,
    }


@router.post("/schema")
def get_schema(req: DBRequest):
    db_name = req.db_name

    if not is_valid_name(db_name):
        raise HTTPException(400, "Invalid database name")

    path = get_db_path(db_name)

    if not os.path.exists(path):
        raise HTTPException(404, "Database does not exist")

    conn = sqlite3.connect(path)
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()

    schema = []
    for (table,) in tables:
        # ── Column basics: cid, name, type, notnull, dflt_value, pk ──────────
        cursor.execute(f"PRAGMA table_info('{table}')")
        col_rows = cursor.fetchall()

        # ── Foreign keys: seq, id, table, from, to, on_update, on_delete ─────
        cursor.execute(f"PRAGMA foreign_key_list('{table}')")
        fk_rows = cursor.fetchall()
        # map  from_col  →  { table, column }
        fk_map = {row[3]: {"table": row[2], "column": row[4]} for row in fk_rows}

        # ── Unique columns (from non-PK unique indexes) ───────────────────────
        cursor.execute(f"PRAGMA index_list('{table}')")
        idx_list = cursor.fetchall()
        unique_cols = set()
        for idx in idx_list:
            idx_name, is_unique, origin = idx[1], idx[2], idx[3]
            # origin 'pk' is already captured via table_info; skip it
            if is_unique and origin != "pk":
                cursor.execute(f"PRAGMA index_info('{idx_name}')")
                for info_row in cursor.fetchall():
                    unique_cols.add(info_row[2])  # column name

        columns = []
        for c in col_rows:
            # c = (cid, name, type, notnull, dflt_value, pk)
            col_name = c[1]
            constraints = []
            if c[5]:                          # pk > 0  →  PRIMARY KEY
                constraints.append("PRIMARY KEY")
            if c[3]:                          # notnull = 1
                constraints.append("NOT NULL")
            if col_name in unique_cols:
                constraints.append("UNIQUE")
            if col_name in fk_map:
                ref = fk_map[col_name]
                constraints.append(f"FK → {ref['table']}.{ref['column']}")

            columns.append({
                "name":          col_name,
                "type":          c[2] or "TEXT",
                "primary_key":   bool(c[5]),
                "not_null":      bool(c[3]),
                "default_value": c[4],
                "unique":        col_name in unique_cols,
                "foreign_key":   fk_map.get(col_name),   # None or {table, column}
                "constraints":   constraints,             # human-readable list
            })

        schema.append({
            "table":   table,
            "columns": columns,
        })

    conn.close()

    return {
        "success": True,
        "db_name": db_name,
        "schema":  schema,
    }


def get_schema_for_model(req: DBRequest):
    db_name = req.db_name

    if not is_valid_name(db_name):
        raise HTTPException(status_code=400, detail="Invalid database name")

    path = get_db_path(db_name)

    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Database does not exist")

    conn = sqlite3.connect(path)
    cursor = conn.cursor()

    try:
        # Fetch actual CREATE TABLE statements for all user tables.
        # This is the most token-efficient and unambiguous format for an LLM to read.
        cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = cursor.fetchall()
        
        schema_text_parts = []
        schema = []

        for name, sql in tables:
            if sql:
                schema_text_parts.append(sql.strip() + ";")
                schema.append({"table": name, "schema": sql.strip()})
        conn.close()
        return {
            "success": True,
            "db_name": db_name,
            "schema": schema, # Can still be passed as JSON objects if needed
            "schema_text": "\n\n".join(schema_text_parts) # Perfect format for LLM context injection
        }
    finally:
        conn.close()

@router.post("/all-tables")
def get_all_tables(req: DBRequest):
    db_name = req.db_name
 
    if not is_valid_name(db_name):
        raise HTTPException(400, "Invalid database name")
 
    path = get_db_path(db_name)
 
    if not os.path.exists(path):
        raise HTTPException(404, "Database does not exist")
 
    conn = sqlite3.connect(path)
    try:
        cursor = conn.cursor()
 
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        table_names = [row[0] for row in cursor.fetchall()]
 
        tables = []
        for table in table_names:
            cursor.execute(f"SELECT * FROM \"{table}\" LIMIT 50")
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            tables.append({
                "table":        table,
                "columns":      columns,
                "rows":         [dict(zip(columns, row)) for row in rows],
                "total_shown":  len(rows),
                "capped":       len(rows) == 50,   # true means there may be more rows
            })
    finally:
        conn.close()
 
    return {
        "success":  True,
        "db_name":  db_name,
        "tables":   tables,
    }