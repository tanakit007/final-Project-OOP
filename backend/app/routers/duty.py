from fastapi import APIRouter, Depends, status
from typing import List
from app.models.duty import DutyCreate, DutyResponse
from app.models.user import User
from app.core.deps import get_current_user
from app.services.duty_service import DutyService

router = APIRouter(prefix="/duties", tags=["Duty Management"])

@router.post("", response_model=DutyResponse, status_code=status.HTTP_201_CREATED)
async def create_duty(duty_data: DutyCreate, current_user: User = Depends(get_current_user)):
    return await DutyService.create_duty(duty_data, current_user)

@router.get("", response_model=List[DutyResponse])
async def get_duties(current_user: User = Depends(get_current_user)):
    return await DutyService.get_house_duties(current_user)

@router.patch("/{duty_id}/toggle")
async def toggle_duty(duty_id: str, current_user: User = Depends(get_current_user)):
    return await DutyService.toggle_duty_complete(duty_id, current_user)