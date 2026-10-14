from fastapi import APIRouter, Depends, File, Response, UploadFile, status
from typing import List
from app.models.expense import ExpenseCreate, ExpenseResponse, PaymentRejectionRequest
from app.models.user import User
from app.core.deps import get_current_user
from app.services.expense_service import ExpenseService

router = APIRouter(prefix="/expenses", tags=["Expense Management"])

@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(expense_data: ExpenseCreate, current_user: User = Depends(get_current_user)):
    return await ExpenseService.create_expense(expense_data, current_user)

@router.get("", response_model=List[ExpenseResponse])
async def get_expenses(current_user: User = Depends(get_current_user)):
    return await ExpenseService.get_house_expenses(current_user)

@router.post("/{expense_id}/payment-proof", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def submit_payment_proof(
    expense_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    return await ExpenseService.submit_payment_proof(expense_id, current_user, file)

@router.post("/{expense_id}/payment-proof/{member_id}/confirm", response_model=ExpenseResponse)
async def confirm_payment(
    expense_id: str,
    member_id: str,
    current_user: User = Depends(get_current_user),
):
    return await ExpenseService.confirm_payment(expense_id, member_id, current_user)

@router.post("/{expense_id}/payment-proof/{member_id}/request-replacement", response_model=ExpenseResponse)
async def request_payment_replacement(
    expense_id: str,
    member_id: str,
    request: PaymentRejectionRequest,
    current_user: User = Depends(get_current_user),
):
    return await ExpenseService.request_payment_replacement(
        expense_id,
        member_id,
        request.reason,
        current_user,
    )

@router.get("/{expense_id}/payment-proof/{member_id}")
async def get_payment_proof(
    expense_id: str,
    member_id: str,
    current_user: User = Depends(get_current_user),
):
    content, media_type = await ExpenseService.get_payment_proof(expense_id, member_id, current_user)
    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )