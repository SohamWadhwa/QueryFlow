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
You are a specialized MySQL SQL generator. You provide ONLY the raw SQL code.

### Schema:
{schema_data}

### Rules:
1. Output MUST be valid MySQL syntax.
2. Output ONLY the SQL string. Do NOT use markdown code blocks.
3. Do NOT provide explanations, comments, or introductory text.
4. Use backticks for identifiers: `table_name`, `column_name`
5. Ensure the query is a single executable line.

### User Query:
{user_query}

### SQL Output:
"""

    return call_model(prompt)