from fastapi import APIRouter, status
from app.models.user import UserRegister, UserLogin, Token, UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    user = await AuthService.register_user(user_data)
    return UserResponse(
        id=str(user.id),
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        promptpay_no=user.promptpay_no
    )

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin):
    return await AuthService.authenticate_user(login_data)