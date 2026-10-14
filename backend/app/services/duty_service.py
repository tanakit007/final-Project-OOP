from typing import List
from fastapi import HTTPException
from app.models.duty import Duty, DutyCreate, DutyResponse
from app.models.house import House
from app.models.user import User

class DutyService:
    @staticmethod
    async def create_duty(duty_data: DutyCreate, current_user: User) -> DutyResponse:
        user_id_str = str(current_user.id)
        house = await House.find_one({"members_ids": user_id_str})
        if not house:
            raise HTTPException(status_code=400, detail="คุณต้องเข้าร่วมบ้านก่อนจึงจะสร้างเวรได้")

        if duty_data.assigned_user_id not in house.members_ids:
            raise HTTPException(status_code=400, detail="ผู้ที่ได้รับมอบหมายไม่ได้เป็นสมาชิกในบ้านนี้")

        new_duty = Duty(
            house_id=str(house.id),
            title=duty_data.title,
            assigned_user_id=duty_data.assigned_user_id,
            due_date=duty_data.due_date
        )
        await new_duty.insert()
        
        assigned_user = await User.get(duty_data.assigned_user_id)
        assigned_name = assigned_user.full_name if assigned_user else "ไม่พบผู้รับมอบหมาย"
        return await DutyService.build_duty_response(new_duty, assigned_name)

    @staticmethod
    async def get_house_duties(current_user: User) -> List[DutyResponse]:
        user_id_str = str(current_user.id)
        house = await House.find_one({"members_ids": user_id_str})
        if not house:
            raise HTTPException(status_code=400, detail="คุณยังไม่ได้เข้าร่วมบ้านใดๆ")

        duties = await Duty.find(Duty.house_id == str(house.id)).sort("-created_at").to_list()
        
        results = []
        for duty in duties:
            u = await User.get(duty.assigned_user_id)
            u_name = u.full_name if u else "ไม่พบผู้รับมอบหมาย"
            results.append(await DutyService.build_duty_response(duty, u_name))
        return results

    @staticmethod
    async def toggle_duty_complete(duty_id: str, current_user: User):
        duty = await Duty.get(duty_id)
        if not duty:
            raise HTTPException(status_code=404, detail="ไม่พบเวรนี้")

        house = await House.find_one({"members_ids": str(current_user.id)})
        if not house or duty.house_id != str(house.id):
            raise HTTPException(status_code=404, detail="เวรนี้ไม่มีอยู่")

        duty.is_completed = not duty.is_completed
        await duty.save()
        return {"message": "อัปเดตสถานะงานเรียบร้อยแล้ว", "is_completed": duty.is_completed}

    @staticmethod
    async def build_duty_response(duty: Duty, assigned_name: str) -> DutyResponse:
        return DutyResponse(
            id=str(duty.id),
            house_id=duty.house_id,
            title=duty.title,
            assigned_user_id=duty.assigned_user_id,
            assigned_user_name=assigned_name,
            is_completed=duty.is_completed,
            due_date=duty.due_date,
            created_at=duty.created_at
        )