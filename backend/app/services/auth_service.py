from fastapi import HTTPException, status
from app.models.user import User, UserRegister, UserLogin
from app.core.security import get_password_hash, verify_password, create_access_token

class AuthService:
    @staticmethod
    async def register_user(user_data: UserRegister) -> User:
        # ตรวจสอบอีเมลหรือ username ซ้ำ
        existing_email = await User.find_one(User.email == user_data.email)
        if existing_email:
            raise HTTPException(status_code=400, detail="อีเมลนี้ถูกใช้งานแล้ว")
        
        existing_username = await User.find_one(User.username == user_data.username)
        if existing_username:
            raise HTTPException(status_code=400, detail="Username นี้ถูกใช้งานแล้ว")

        # สร้าง User Object ใหม่
        hashed_pw = get_password_hash(user_data.password)
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_pw,
            full_name=user_data.full_name,
            promptpay_no=user_data.promptpay_no
        )
        await new_user.insert()
        return new_user

    @staticmethod
    async def authenticate_user(login_data: UserLogin) -> dict:
        user = await User.find_one(User.email == login_data.email)
        if not user or not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง"
            )
        
        access_token = create_access_token(data={"sub": str(user.id)})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "promptpay_no": user.promptpay_no
            }
        }