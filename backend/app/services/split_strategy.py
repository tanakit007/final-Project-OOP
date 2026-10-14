from abc import ABC, abstractmethod
from typing import Dict, List
from fastapi import HTTPException

class SplitStrategy(ABC):
    @abstractmethod
    def calculate_splits(self, total_amount: float, member_ids: List[str], custom_splits: Dict[str, float] = None) -> Dict[str, float]:
        pass

class EqualSplitStrategy(SplitStrategy):
    """กลยุทธ์การหารเท่ากันทุกคนในบ้าน"""
    def calculate_splits(self, total_amount: float, member_ids: List[str], custom_splits: Dict[str, float] = None) -> Dict[str, float]:
        if not member_ids:
            raise HTTPException(status_code=400, detail="ไม่มีสมาชิกสำหรับหารค่าใช้จ่าย")
        
        share = round(total_amount / len(member_ids), 2)
        splits = {m_id: share for m_id in member_ids}
        
        # ปรับเศษปัดสตางค์ให้ตรงกับยอดรวมเป๊ะ
        diff = round(total_amount - sum(splits.values()), 2)
        if diff != 0:
            splits[member_ids[0]] = round(splits[member_ids[0]] + diff, 2)
            
        return splits

class CustomSplitStrategy(SplitStrategy):
    """กลยุทธ์การระบุยอดเงินของแต่ละคนตามจริง (เช่น ค่าไฟตามมิเตอร์ห้อง)"""
    def calculate_splits(self, total_amount: float, member_ids: List[str], custom_splits: Dict[str, float] = None) -> Dict[str, float]:
        if not custom_splits:
            raise HTTPException(status_code=400, detail="กรุณาระบุยอดเงินของสมาชิกแต่ละคน")
        
        if round(sum(custom_splits.values()), 2) != round(total_amount, 2):
            raise HTTPException(status_code=400, detail="ผลรวมยอดหารของแต่ละคนไม่ตรงกับยอดรวมบิล")
            
        return custom_splits