import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Roommate Expense App"
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb+srv://<username>:<password>@cluster0.mongodb.net/roommate_db?retryWrites=true&w=majority")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "SUPER_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION_123456789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 วัน

    class Config:
        env_file = ".env"

settings = Settings()