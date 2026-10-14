from beanie import Document
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class Duty(Document):
    house_id: str
    title: str                  # เช่น "ทิ้งขยะ", "กวาดถูห้องกลาง", "ล้างห้องน้ำ"
    assigned_user_id: str       # ID ของคนที่ได้รับมอบหมาย
    is_completed: bool = False
    due_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "duties"

# Schemas สำหรับ Request/Response
class DutyCreate(BaseModel):
    title: str
    assigned_user_id: str
    due_date: Optional[datetime] = None

class DutyResponse(BaseModel):
    id: str
    house_id: str
    title: str
    assigned_user_id: str
    assigned_user_name: str
    is_completed: bool
    due_date: Optional[datetime]
    created_at: datetime