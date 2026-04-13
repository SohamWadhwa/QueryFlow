from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.config import settings
from routes.db_routes import router as db_router
from routes.query_routes import router as query_router
from root_db import initialize_root_db
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_root_db()
    yield

app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost",
    "http://localhost:8080",
    "http://",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "server is running",
        "model_name": settings.MODEL_NAME,
        "api_url": settings.API_URL,
        "db_dir": settings.DB_DIR
    }

app.include_router(db_router, prefix="/api/db", tags=["db"])
app.include_router(query_router, prefix="/api/query", tags=["query"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)