from typing import List
import asyncio
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from app.models.expense import Expense, ExpenseCreate, ExpenseResponse, PaymentReviewEvent
from app.models.house import House
from app.models.user import User
from app.services.split_strategy import EqualSplitStrategy, CustomSplitStrategy


PAYMENT_PROOF_DIR = Path(__file__).resolve().parents[2] / "uploads" / "payment_slips"
MAX_PAYMENT_PROOF_SIZE = 5 * 1024 * 1024
PAYMENT_PROOF_TYPES = {
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
}


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
    async def submit_payment_proof(
        expense_id: str,
        current_user: User,
        upload: UploadFile,
    ) -> ExpenseResponse:
        expense = await ExpenseService._get_accessible_expense(expense_id, current_user)
        user_id = str(current_user.id)
        if user_id == expense.paid_by_id:
            raise HTTPException(status_code=400, detail="ผู้สร้างบิลชำระส่วนของตนเองแล้ว")
        if user_id in expense.settled_users:
            raise HTTPException(status_code=400, detail="ยืนยันการชำระเงินรายการนี้แล้ว")

        content = await upload.read(MAX_PAYMENT_PROOF_SIZE + 1)
        if not content:
            raise HTTPException(status_code=400, detail="กรุณาเลือกไฟล์หลักฐานการโอน")
        if len(content) > MAX_PAYMENT_PROOF_SIZE:
            raise HTTPException(status_code=413, detail="ไฟล์หลักฐานต้องมีขนาดไม่เกิน 5 MB")

        extension = ExpenseService._payment_proof_extension(content)
        if not extension:
            raise HTTPException(status_code=415, detail="รองรับเฉพาะไฟล์ JPG, PNG, WEBP หรือ PDF")

        PAYMENT_PROOF_DIR.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid4().hex}{extension}"
        file_path = PAYMENT_PROOF_DIR / filename
        await asyncio.to_thread(file_path.write_bytes, content)

        previous_filename = expense.payment_proofs.get(user_id)
        previous_rejection = expense.payment_rejection_reasons.pop(user_id, None)
        previous_history_count = len(expense.payment_history)
        expense.payment_proofs[user_id] = filename
        expense.payment_history.append(PaymentReviewEvent(
            action="submitted",
            member_id=user_id,
            actor_id=user_id,
        ))
        try:
            await expense.save()
        except Exception:
            if previous_filename:
                expense.payment_proofs[user_id] = previous_filename
            else:
                expense.payment_proofs.pop(user_id, None)
            if previous_rejection:
                expense.payment_rejection_reasons[user_id] = previous_rejection
            del expense.payment_history[previous_history_count:]
            await asyncio.to_thread(lambda: file_path.unlink(missing_ok=True))
            raise

        if previous_filename:
            previous_path = PAYMENT_PROOF_DIR / previous_filename
            await asyncio.to_thread(lambda: previous_path.unlink(missing_ok=True))

        payer = await User.get(expense.paid_by_id)
        payer_name = payer.full_name if payer else "ไม่พบผู้จ่าย"
        return await ExpenseService.build_expense_response(expense, payer_name)

    @staticmethod
    async def confirm_payment(
        expense_id: str,
        member_id: str,
        current_user: User,
    ) -> ExpenseResponse:
        expense = await ExpenseService._get_accessible_expense(expense_id, current_user)
        if str(current_user.id) != expense.paid_by_id:
            raise HTTPException(status_code=403, detail="เฉพาะผู้สร้างบิลเท่านั้นที่ยืนยันการชำระเงินได้")
        if member_id not in expense.splits:
            raise HTTPException(status_code=400, detail="สมาชิกนี้ไม่ได้อยู่ในรายการหารบิล")
        if member_id in expense.settled_users:
            raise HTTPException(status_code=400, detail="ยืนยันการชำระเงินรายการนี้แล้ว")
        if member_id not in expense.payment_proofs:
            raise HTTPException(status_code=400, detail="สมาชิกยังไม่ได้ส่งหลักฐานการโอน")
        if member_id in expense.payment_rejection_reasons:
            raise HTTPException(status_code=400, detail="สมาชิกต้องส่งหลักฐานใหม่ก่อนยืนยัน")

        expense.settled_users.append(member_id)
        expense.payment_history.append(PaymentReviewEvent(
            action="confirmed",
            member_id=member_id,
            actor_id=str(current_user.id),
        ))
        await expense.save()
        return await ExpenseService.build_expense_response(expense, current_user.full_name)

    @staticmethod
    async def request_payment_replacement(
        expense_id: str,
        member_id: str,
        reason: str,
        current_user: User,
    ) -> ExpenseResponse:
        expense = await ExpenseService._get_accessible_expense(expense_id, current_user)
        if str(current_user.id) != expense.paid_by_id:
            raise HTTPException(status_code=403, detail="เฉพาะผู้สร้างบิลเท่านั้นที่ขอหลักฐานใหม่ได้")
        if member_id not in expense.splits:
            raise HTTPException(status_code=400, detail="สมาชิกนี้ไม่ได้อยู่ในรายการหารบิล")
        if member_id in expense.settled_users:
            raise HTTPException(status_code=400, detail="รายการนี้ยืนยันการชำระแล้ว")
        if member_id not in expense.payment_proofs:
            raise HTTPException(status_code=400, detail="สมาชิกยังไม่ได้ส่งหลักฐานการโอน")

        normalized_reason = reason.strip()
        if len(normalized_reason) < 5:
            raise HTTPException(status_code=422, detail="เหตุผลต้องมีอย่างน้อย 5 ตัวอักษร")

        expense.payment_rejection_reasons[member_id] = normalized_reason
        expense.payment_history.append(PaymentReviewEvent(
            action="replacement_requested",
            member_id=member_id,
            actor_id=str(current_user.id),
            reason=normalized_reason,
        ))
        await expense.save()
        return await ExpenseService.build_expense_response(expense, current_user.full_name)

    @staticmethod
    async def get_payment_proof(
        expense_id: str,
        member_id: str,
        current_user: User,
    ) -> tuple[bytes, str]:
        expense = await ExpenseService._get_accessible_expense(expense_id, current_user)
        if str(current_user.id) != expense.paid_by_id and str(current_user.id) != member_id:
            raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์ดูหลักฐานการโอนนี้")

        filename = expense.payment_proofs.get(member_id)
        if not filename or Path(filename).name != filename:
            raise HTTPException(status_code=404, detail="ไม่พบหลักฐานการโอน")
        file_path = PAYMENT_PROOF_DIR / filename
        if not file_path.is_file():
            raise HTTPException(status_code=404, detail="ไม่พบไฟล์หลักฐานการโอน")

        content = await asyncio.to_thread(file_path.read_bytes)
        return content, PAYMENT_PROOF_TYPES[file_path.suffix]

    @staticmethod
    async def _get_accessible_expense(expense_id: str, current_user: User) -> Expense:
        expense = await Expense.get(expense_id)
        if not expense:
            raise HTTPException(status_code=404, detail="ไม่พบบิลนี้")

        house = await House.find_one({"members_ids": str(current_user.id)})
        if not house or str(house.id) != expense.house_id:
            raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์เข้าถึงบิลนี้")
        if str(current_user.id) not in expense.splits:
            raise HTTPException(status_code=403, detail="คุณไม่ได้อยู่ในรายการหารบิลนี้")
        return expense

    @staticmethod
    def _payment_proof_extension(content: bytes) -> str | None:
        if content.startswith(b"\xff\xd8\xff"):
            return ".jpg"
        if content.startswith(b"\x89PNG\r\n\x1a\n"):
            return ".png"
        if len(content) >= 12 and content.startswith(b"RIFF") and content[8:12] == b"WEBP":
            return ".webp"
        if content.startswith(b"%PDF-"):
            return ".pdf"
        return None

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
            payment_proof_users=list(expense.payment_proofs),
            payment_rejection_reasons=expense.payment_rejection_reasons,
            payment_history=expense.payment_history,
            created_at=expense.created_at
        )