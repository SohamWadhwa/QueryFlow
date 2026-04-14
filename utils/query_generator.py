from pydantic import BaseModel
from utils.services import call_model
from routes.db_routes import get_schema_for_model, DBRequest
    
def generate_sql(db_name: str, user_query: str):
    req = DBRequest(db_name=db_name)

    schema_data = get_schema_for_model(req)["schema"]

    # print(schema_data)
    # prompt = f"""
    #     You are an SQL generator.

    #     Schema:
    #     {schema_data}

    #     Rules:
    #     - Only valid SQLite SQL
    #     - No explanation
    #     - No markdown
    #     - Only the SQL query as output
    #     - The SQL query must not contain any comments and unnecessary words
    #     - SQL query must be executable directly on the database without any modifications

    #     User query:
    #     {user_query}
    # """
    prompt = f"""
### System:
You are a specialized SQLite SQL generator. You provide ONLY the raw SQL code.

### Schema:
{schema_data}

### Rules:
1. Output MUST be in valid SQLite3 syntax.
2. Output ONLY the SQL string. Do NOT use markdown code blocks (no ```sql).
3. Do NOT provide explanations, comments, or introductory text.
4. IDENTIFIER QUOTING: If a table or column name contains spaces or is a reserved word, wrap it in square brackets [like_this].
5. Ensure the query is executable directly that is single line.
6. Do not include any escape characters or newlines in the output.
7. Always use lowercase for instance names (e.g., table and column names) in the output SQL.

### User Query:
{user_query}

### SQL Output:
"""

    return call_model(prompt)