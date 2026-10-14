from pymongo import AsyncMongoClient
from beanie import init_beanie
from app.core.config import settings
from app.models.user import User
from app.models.house import House
from app.models.expense import Expense  # <-- Import เพิ่ม

async def init_db():
    client = AsyncMongoClient(settings.MONGODB_URL)
    database = client.get_database("roommate_db")
    
    await init_beanie(
        database=database,
        document_models=[User, House, Expense]
    )