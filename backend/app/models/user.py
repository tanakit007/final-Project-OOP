from beanie import Document
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

class User(Document):
    username: str = Field(..., unique=True)
    email: EmailStr = Field(..., unique=True)
    hashed_password: str
    full_name: str
    promptpay_no: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"

# Schemas สำหรับ Validate Request/Response
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    promptpay_no: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    full_name: str
    promptpay_no: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse