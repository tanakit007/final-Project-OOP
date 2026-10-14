from typing import List
from fastapi import HTTPException
from app.models.expense import Expense, ExpenseCreate, ExpenseResponse
from app.models.house import House
from app.models.user import User
from app.services.split_strategy import EqualSplitStrategy, CustomSplitStrategy

class ExpenseService:
    @staticmethod
    async def create_expense(expense_data: ExpenseCreate, current_user: User) -> ExpenseResponse:
        user_id_str = str(current_user.id)
        
        # หาบ้านที่ user คนนี้อยู่
        house = await House.find_one({"members_ids": user_id_str})
        if not house:
            raise HTTPException(status_code=400, detail="คุณต้องเข้าร่วมบ้านก่อนจึงจะสร้างบิลได้")

        # เลือก Strategy ตามประเภทการหาร
        if expense_data.split_type == "EQUAL":
            strategy = EqualSplitStrategy()
        elif expense_data.split_type == "CUSTOM":
            strategy = CustomSplitStrategy()
        else:
            raise HTTPException(status_code=400, detail="ประเภทการหารเงินไม่ถูกต้อง (ต้องเป็น EQUAL หรือ CUSTOM)")

        # คำนวณยอดหารด้วย Strategy
        calculated_splits = strategy.calculate_splits(
            total_amount=expense_data.total_amount,
            member_ids=house.members_ids,
            custom_splits=expense_data.custom_splits
        )

        new_expense = Expense(
            house_id=str(house.id),
            title=expense_data.title,
            total_amount=expense_data.total_amount,
            paid_by_id=user_id_str,
            split_type=expense_data.split_type,
            splits=calculated_splits,
            settled_users=[user_id_str] # คนจ่ายเงินถือว่าชำระส่วนของตัวเองแล้ว
        )
        await new_expense.insert()
        return await ExpenseService.build_expense_response(new_expense, current_user.full_name)

    @staticmethod
    async def get_house_expenses(current_user: User) -> List[ExpenseResponse]:
        user_id_str = str(current_user.id)
        house = await House.find_one({"members_ids": user_id_str})
        if not house:
            raise HTTPException(status_code=400, detail="คุณยังไม่ได้เข้าร่วมบ้านใดๆ")

        expenses = await Expense.find(Expense.house_id == str(house.id)).sort("-created_at").to_list()
        
        results = []
        for exp in expenses:
            payer = await User.get(exp.paid_by_id)
            payer_name = payer.full_name if payer else "ไม่พบผู้จ่าย"
            results.append(await ExpenseService.build_expense_response(exp, payer_name))
        return results

    @staticmethod
    async def settle_expense(expense_id: str, current_user: User):
        """กดยืนยันการเคลียร์เงิน/จ่ายเงินคืน"""
        expense = await Expense.get(expense_id)
        if not expense:
            raise HTTPException(status_code=404, detail="ไม่พบบิลนี้")

        user_id_str = str(current_user.id)
        if user_id_str not in expense.splits:
            raise HTTPException(status_code=400, detail="คุณไม่ได้อยู่ในรายการหารบิลนี้")

        if user_id_str in expense.settled_users:
            raise HTTPException(status_code=400, detail="คุณชำระบิลนี้ไปแล้ว")

        expense.settled_users.append(user_id_str)
        await expense.save()
        return {"message": "บันทึกการชำระเงินเรียบร้อยแล้ว"}

    @staticmethod
    async def build_expense_response(expense: Expense, payer_name: str) -> ExpenseResponse:
        return ExpenseResponse(
            id=str(expense.id),
            house_id=expense.house_id,
            title=expense.title,
            total_amount=expense.total_amount,
            paid_by_name=payer_name,
            paid_by_id=expense.paid_by_id,
            split_type=expense.split_type,
            splits=expense.splits,
            settled_users=expense.settled_users,
            created_at=expense.created_at
        )