from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    AIVEN_HOST: str
    AIVEN_PORT: int = 3306
    AIVEN_USER: str
    AIVEN_PASSWORD: str
    AIVEN_DATABASE: str  

    DB_DIR: str = "./databases"
    API_URL: str
    MODEL_NAME: str
    OLLAMA_API_KEY: str
    GROQ_API_KEY: str

    class Config:
        env_file = ".env"

settings = Settings()