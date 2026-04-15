from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
import time
from utils.query_generator import generate_sql
from utils.database import run_query
from root_db import get_root_db_connection

router = APIRouter()

class QueryRequest(BaseModel):
    db_name: str
    user_query: str

def is_valid_name(name: str):
    return name.replace("_", "").isalnum()

def store_pending_query(db_name: str, sql_query: str):
    conn = get_root_db_connection()
    cursor = conn.cursor()

    query_id = str(uuid.uuid4())
    try:
        cursor.execute(
            "INSERT INTO pending_queries (id, db_name, `sql`, status) VALUES (%s, %s, %s, %s)",
            (query_id, db_name, sql_query, "pending")
        )
        
        conn.commit()
    finally:
        conn.close()

    return query_id

def approve_query(query_id: str):
    conn = get_root_db_connection()
    try:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT db_name, `sql` FROM pending_queries WHERE id = %s AND status = 'pending'",
            (query_id,)
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(404, "Pending query not found")

        db_name, sql = row

        # run_query may raise — conn must still be closed, hence the try/finally
        result = run_query(db_name, sql)

        cursor.execute(
            "UPDATE pending_queries SET status = 'approved' WHERE id = %s",
            (query_id,)
        )
        conn.commit()
    finally:
        conn.close()

    return result

def reject_query(query_id: str):
    conn = get_root_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE pending_queries SET status='rejected' WHERE id=%s",
            (query_id,)
        )
        conn.commit()
    finally:
        conn.close()

@router.post("/generate")
def generate_query(req: QueryRequest):
    if not is_valid_name(req.db_name):
        raise HTTPException(400, "Invalid database name")

    try:
        start = time.perf_counter()
        sql_query = generate_sql(req.db_name, req.user_query)
        end = time.perf_counter()
        print(f"Generated SQL in {end - start:.2f} seconds")
        query_id = store_pending_query(req.db_name, sql_query)

    except Exception as e:
        raise HTTPException(500, str(e))

    return {
        "sql_query": sql_query,
        "query_id": query_id,
        "status": "pending"
    }

@router.post("/approve")
def approve(query_id: str):
    print(f"Approving query with ID: {query_id}")
    result = approve_query(query_id)
    print(f"Query result: {result}")
    return {"result": result}

@router.post("/edit")
def edit(query_id: str, new_sql: str):
    conn = get_root_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE pending_queries SET `sql`=%s, status='pending' WHERE id=%s",
            (new_sql, query_id)
        )
        conn.commit()
    finally:
        conn.close()

    return {"status": "updated and pending approval"}

@router.post("/reject")
def reject(query_id: str):
    reject_query(query_id)
    return {"status": "rejected"}

class ManualQueryRequest(BaseModel):
    db_name: str
    sql: str

@router.post("/run-manual")
def run_manual_query(req: ManualQueryRequest):
    if not is_valid_name(req.db_name):
        raise HTTPException(400, "Invalid database name")
    try:
        result = run_query(req.db_name, req.sql)
        return {"result": result, "sql": req.sql}
    except Exception as e:
        raise HTTPException(500, str(e))