from fastapi import HTTPException, status
from app.models.house import House, HouseCreate, HouseJoin, HouseResponse, MemberDetail
from app.models.user import User

class HouseService:
    @staticmethod
    async def create_house(house_data: HouseCreate, current_user: User) -> HouseResponse:
        # สร้างบ้านใหม่โดยให้ current_user เป็น owner และ member คนแรก
        user_id_str = str(current_user.id)
        new_house = House(
            name=house_data.name,
            owner_id=user_id_str,
            members_ids=[user_id_str]
        )
        await new_house.insert()
        return await HouseService.build_house_response(new_house)

    @staticmethod
    async def join_house(join_data: HouseJoin, current_user: User) -> HouseResponse:
        house = await House.find_one(House.invite_code == join_data.invite_code.upper().strip())
        if not house:
            raise HTTPException(status_code=404, detail="ไม่พบบ้านจาก Invite Code นี้")

        user_id_str = str(current_user.id)
        if user_id_str in house.members_ids:
            raise HTTPException(status_code=400, detail="คุณเป็นสมาชิกในบ้านนี้อยู่แล้ว")

        house.members_ids.append(user_id_str)
        await house.save()
        return await HouseService.build_house_response(house)

    @staticmethod
    async def get_user_house(current_user: User) -> HouseResponse:
        user_id_str = str(current_user.id)
        # หาบ้านที่ user คนนี้เป็นสมาชิกอยู่
        house = await House.find_one({"members_ids": user_id_str})
        if not house:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="คุณยังไม่ได้เข้าร่วมบ้านใดๆ")
        return await HouseService.build_house_response(house)

    @staticmethod
    async def build_house_response(house: House) -> HouseResponse:
        # ดึงข้อมูลรายละเอียดของสมาชิกทุกคนในบ้าน
        members_detail = []
        for m_id in house.members_ids:
            u = await User.get(m_id)
            if u:
                members_detail.append(
                    MemberDetail(
                        id=str(u.id),
                        username=u.username,
                        full_name=u.full_name,
                        email=u.email,
                        promptpay_no=u.promptpay_no
                    )
                )
        return HouseResponse(
            id=str(house.id),
            name=house.name,
            invite_code=house.invite_code,
            owner_id=house.owner_id,
            members=members_detail,
            created_at=house.created_at
        )