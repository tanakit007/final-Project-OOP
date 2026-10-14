from beanie import Document
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, List, Literal, Optional


class PaymentReviewEvent(BaseModel):
    action: Literal["submitted", "replacement_requested", "confirmed"]
    member_id: str
    actor_id: str
    reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PaymentRejectionRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


class Expense(Document):
    house_id: str
    title: str                  # เช่น "ค่าน้ำ-ค่าไฟ เดือน ต.ค.", "ค่าเน็ต"
    total_amount: float
    paid_by_id: str             # ID ของคนที่ออกเงินไปก่อน
    split_type: str             # "EQUAL" หรือ "CUSTOM"
    splits: Dict[str, float]    # {"user_id": amount_due}
    settled_users: List[str] = Field(default_factory=list) # รายชื่อ user_id ที่ยืนยันการจ่ายแล้ว
    payment_proofs: Dict[str, str] = Field(default_factory=dict)
    payment_rejection_reasons: Dict[str, str] = Field(default_factory=dict)
    payment_history: List[PaymentReviewEvent] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "expenses"

# Schemas สำหรับ Request/Response
class ExpenseCreate(BaseModel):
    title: str
    total_amount: float
    split_type: str = "EQUAL"   # "EQUAL" หรือ "CUSTOM"
    custom_splits: Optional[Dict[str, float]] = None # ใช้กรณี split_type = "CUSTOM"


class ExpenseResponse(BaseModel):
    id: str
    house_id: str
    title: str
    total_amount: float
    paid_by_name: str
    paid_by_id: str
    split_type: str
    splits: Dict[str, float]
    settled_users: List[str]
    payment_proof_users: List[str] = Field(default_factory=list)
    payment_rejection_reasons: Dict[str, str] = Field(default_factory=dict)
    payment_history: List[PaymentReviewEvent] = Field(default_factory=list)
    created_at: datetime