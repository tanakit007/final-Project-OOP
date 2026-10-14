from fastapi import APIRouter, Depends, status
from app.models.house import HouseCreate, HouseJoin, HouseResponse
from app.models.user import User
from app.core.deps import get_current_user
from app.services.house_service import HouseService

router = APIRouter(prefix="/houses", tags=["House Management"])

@router.post("/create", response_model=HouseResponse, status_code=status.HTTP_201_CREATED)
async def create_house(house_data: HouseCreate, current_user: User = Depends(get_current_user)):
    return await HouseService.create_house(house_data, current_user)

@router.post("/join", response_model=HouseResponse)
async def join_house(join_data: HouseJoin, current_user: User = Depends(get_current_user)):
    return await HouseService.join_house(join_data, current_user)

@router.get("/my-house", response_model=HouseResponse)
async def get_my_house(current_user: User = Depends(get_current_user)):
    return await HouseService.get_user_house(current_user)