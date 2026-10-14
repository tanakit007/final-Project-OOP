from fastapi import APIRouter, Depends, status
from typing import List
from app.models.expense import ExpenseCreate, ExpenseResponse
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

@router.post("/{expense_id}/settle")
async def settle_expense(expense_id: str, current_user: User = Depends(get_current_user)):
    return await ExpenseService.settle_expense(expense_id, current_user)