from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import init_db
from app.core.config import settings
from app.routers import auth, house, expense, duty  # <-- Import duty เพิ่ม

app = FastAPI(title="Roommate Expense API")

allowed_origins = [
    origin.strip()
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    await init_db()

app.include_router(auth.router)
app.include_router(house.router)
app.include_router(expense.router)
app.include_router(duty.router)  # <-- Register router

@app.get("/")
def read_root():
    return {"message": "Welcome to Roommate Expense API"}