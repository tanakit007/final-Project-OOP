from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import init_db
from app.routers import auth
from app.routers import house

app = FastAPI(title="Roommate Expense API")

# ตั้งค่า CORS สำหรับเชื่อมต่อ React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ปรับเป็น URL ของ Vercel เมื่อ Deploy
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    await init_db()

app.include_router(auth.router)
app.include_router(house.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Roommate Expense API"}