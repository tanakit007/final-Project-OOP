from beanie import init_beanie
from pymongo import AsyncMongoClient
from app.core.config import settings
from app.models.user import User

async def init_db():
    client = AsyncMongoClient(settings.MONGODB_URL)
    
    # ดึง database ตามชื่อที่ตั้งไว้ใน MONGODB_URL หรือกำหนดชื่อเป็น "roommate_db"
    database = client.get_database()
    
    await init_beanie(
        database=database,
        document_models=[User]
    )