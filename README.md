# QueryFlow

QueryFlow is a database app where you fetch data using plain English only. You ask a question, an LLM translates it into SQL against your database's real schema, and you get the results back without writing a line of SQL.

The goal is a single natural-language interface that scales across different databases, so anyone can get answers from their data regardless of the engine behind it. Today it supports MySQL, with a FastAPI backend, a React and TypeScript frontend, and the Groq API for SQL generation. Support for additional databases is the main direction of the project (see the roadmap).

A human stays in the loop: every generated query is stored as pending, and you can approve, edit, or reject it before it runs.

## Features

- Create, list, and delete MySQL databases from the UI
- Browse each database's schema and a preview of every table (first 50 rows)
- Natural language to SQL using an LLM served through Groq, prompted with the real `SHOW CREATE TABLE` output for the selected database
- Approval workflow: generated SQL is saved as `pending`, then approved, edited, or rejected
- Manual SQL runner for queries you write yourself

## How it works

1. You pick a database and type a question, for example "total sales per customer in 2025".
2. The backend reads the database schema and sends it with your question to the Groq model.
3. The generated SQL is stored in a `pending_queries` table and shown to you.
4. You approve it (the query runs and results are returned), edit it (it goes back to pending), or reject it.

## Tech stack

| Layer | Technology |
| --- | --- |
| Backend | Python, FastAPI, Uvicorn, Pydantic Settings |
| LLM | Groq API |
| Database | MySQL (Aiven-hosted), `mysql-connector-python` |
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Axios |

## Project structure

```
QueryFlow/
├── main.py              FastAPI app, CORS, router registration
├── root_db.py           Creates the pending_queries table on startup
├── config/config.py     Settings loaded from .env
├── routes/
│   ├── db_routes.py     Database and schema endpoints
│   └── query_routes.py  Generate, approve, edit, reject, run-manual
├── utils/
│   ├── mysql_client.py  MySQL connection factory
│   ├── database.py      Query execution
│   ├── query_generator.py  Prompt construction
│   └── services.py      Groq client wrapper
└── frontend/            React app (Vite)
```

## Getting started

### Prerequisites

- Python 3.10+
- Node.js 18+ (or Bun)
- A MySQL server reachable over SSL (the project uses Aiven)
- A Groq API key

### Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the project root:

```env
AIVEN_HOST=your-host.aivencloud.com
AIVEN_PORT=3306
AIVEN_USER=your_user
AIVEN_PASSWORD=your_password
AIVEN_DATABASE=defaultdb

GROQ_API_KEY=your_groq_key
MODEL_NAME=your_groq_model_name

API_URL=http://localhost:11434/api/generate
OLLAMA_API_KEY=unused
DB_DIR=./databases
```

`API_URL` and `OLLAMA_API_KEY` are leftovers from an earlier Ollama integration and are still required by the settings class, but they are not used by the Groq code path.

Start the server:

```bash
python main.py
```

The API runs on `http://localhost:8000`, with interactive docs at `/docs`.

### Frontend

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

The app runs on `http://localhost:8080`.

## API overview

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/` | Health check and active config |
| POST | `/api/db/create` | Create a database |
| GET | `/api/db/list` | List user databases |
| POST | `/api/db/delete` | Drop a database |
| POST | `/api/db/schema` | Table and column metadata |
| POST | `/api/db/all-tables` | Preview rows from every table |
| POST | `/api/query/generate` | Generate SQL from a question and store it as pending |
| POST | `/api/query/approve` | Run a pending query |
| POST | `/api/query/edit` | Replace the SQL of a pending query |
| POST | `/api/query/reject` | Reject a pending query |
| POST | `/api/query/run-manual` | Run SQL directly |

## Known limitations

QueryFlow is under active improvement. Current gaps:

- Queries are not restricted to read-only statements, so approved or manual SQL can modify or drop data
- No authentication on any endpoint
- CORS is currently permissive
- No automated backend tests yet

Do not point it at a database you cannot afford to lose.

## Roadmap

- Multi-database support behind a common adapter interface (PostgreSQL, SQLite, and others), with dialect-aware SQL generation and schema introspection per engine
- Connect your own database by connection string instead of a single configured server
- Read-only, plain-English data fetching: SQL validation that allows only safe `SELECT` queries, with a row limit
- Schema-aware prompting that scales to large databases (relevant tables only, column descriptions)
- Backend test suite with the LLM and databases mocked
- Authentication and stricter CORS
- Query history and saved questions

## License

No license has been specified yet.
