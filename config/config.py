from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    DB_DIR: str
    API_URL: str
    MODEL_NAME: str
    OLLAMA_API_KEY: str

    class Config:
        env_file = ".env"

settings = Settings()