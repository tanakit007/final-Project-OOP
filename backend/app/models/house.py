from beanie import Document, Link
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
import random
import string

def generate_invite_code():
    # สร้าง Invite Code สุ่ม 6 หลัก เช่น "X8K9P2"
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

class House(Document):
    name: str
    invite_code: str = Field(default_factory=generate_invite_code, unique=True)
    owner_id: str
    members_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "houses"

# Schemas สำหรับ Request/Response
class HouseCreate(BaseModel):
    name: str

class HouseJoin(BaseModel):
    invite_code: str

class MemberDetail(BaseModel):
    id: str
    username: str
    full_name: str
    email: str
    promptpay_no: Optional[str] = None

class HouseResponse(BaseModel):
    id: str
    name: str
    invite_code: str
    owner_id: str
    members: List[MemberDetail]
    created_at: datetime