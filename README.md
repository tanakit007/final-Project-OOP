# ระบบจัดการค่าใช้จ่ายและงานบ้านสำหรับเพื่อนร่วมห้อง

เว็บแอปสำหรับจัดการบ้านร่วมกัน แบ่งค่าใช้จ่าย ติดตามการโอนเงิน และมอบหมายงานบ้าน พัฒนาด้วย React และ FastAPI โดยใช้ MongoDB เป็นฐานข้อมูล

## ฟีเจอร์

- สมัครสมาชิกและเข้าสู่ระบบ
- สร้างบ้านหรือเข้าร่วมบ้านด้วยรหัสเชิญ
- เพิ่มค่าใช้จ่ายและแบ่งยอดเท่ากันหรือกำหนดยอดของสมาชิกแต่ละคน
- แนบสลิปการโอนสำหรับการชำระคืน (JPG, PNG, WEBP หรือ PDF ขนาดไม่เกิน 5 MB)
- ผู้สร้างรายการตรวจสอบสลิป ยืนยันการชำระ หรือขอให้สมาชิกส่งสลิปใหม่พร้อมเหตุผล
- ดูประวัติการส่งสลิป การขอส่งใหม่ และการยืนยันการชำระ
- สร้างงานบ้าน มอบหมายสมาชิก กำหนดวันครบกำหนด และติดตามสถานะ
- แสดงส่วนติดต่อผู้ใช้เป็นภาษาไทยและรองรับหน้าจอขนาดเล็ก

## เทคโนโลยี

- Frontend: React 18, Vite, React Router และ Axios
- Backend: Python, FastAPI, Beanie และ PyMongo Async
- Database: MongoDB

## สิ่งที่ต้องติดตั้ง

- Python 3.10 ขึ้นไป
- Node.js 20.19 ขึ้นไป หรือ 22.12 ขึ้นไป
- npm
- MongoDB ที่เข้าถึงได้จากเครื่อง เช่น MongoDB Atlas หรือ MongoDB ที่ติดตั้งในเครื่อง

## ตั้งค่าและเปิดใช้งาน

เปิด PowerShell สองหน้าต่าง โดยหน้าต่างหนึ่งใช้รัน Backend และอีกหน้าต่างใช้รัน Frontend

### 1. ตั้งค่า Backend

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

สร้างไฟล์ `backend\.env` โดยใส่ค่าการเชื่อมต่อ MongoDB และ secret key สำหรับลงนาม token:

```env
MONGODB_URL=mongodb+srv://<ชื่อผู้ใช้>:<รหัสผ่าน>@<คลัสเตอร์>/<ฐานข้อมูล>?retryWrites=true&w=majority
SECRET_KEY=<คีย์สุ่มที่คาดเดาได้ยาก>
```

แทนค่าตัวอย่างด้วยข้อมูลจริงจาก MongoDB ของคุณ หากยังไม่มี secret key สามารถสร้างค่าสุ่มได้ด้วย:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

แอปเลือกใช้ฐานข้อมูลชื่อ `roommate_db` ใน MongoDB ส่วน `MONGODB_URL` ต้องมีข้อมูลเชื่อมต่อที่ถูกต้องและบัญชีฐานข้อมูลต้องมีสิทธิ์เข้าถึงคลัสเตอร์

### ใช้ MongoDB Atlas หรือย้ายข้อมูลเดิม

หากต้องการให้แอปเริ่มบันทึกข้อมูลใหม่ลง Atlas ให้ทำตามนี้:

1. สร้างคลัสเตอร์ใน MongoDB Atlas
2. สร้าง Database User และกำหนดสิทธิ์อ่าน/เขียนฐานข้อมูล
3. เพิ่ม IP address ของเครื่องใน **Network Access** ของ Atlas
4. เลือก **Connect → Drivers** แล้วคัดลอก connection string
5. ใส่ connection string ใน `backend\.env` ที่ `MONGODB_URL` แล้วเปลี่ยนชื่อฐานข้อมูลใน URI เป็น `roommate_db`
6. รีสตาร์ต Backend

ตัวอย่างรูปแบบ URI (แทนค่าตัวอย่างด้วยข้อมูลจาก Atlas):

```env
MONGODB_URL=mongodb+srv://<ชื่อผู้ใช้>:<รหัสผ่านที่เข้ารหัส URL แล้ว>@<คลัสเตอร์>.mongodb.net/roommate_db?retryWrites=true&w=majority
```

การเปลี่ยน `MONGODB_URL` เพียงเปลี่ยนฐานข้อมูลที่แอปเชื่อมต่อ **ไม่ได้คัดลอกข้อมูลเดิมจากเครื่องไป Atlas** หากมีข้อมูลใน MongoDB ที่ติดตั้งในเครื่อง ให้ติดตั้ง [MongoDB Database Tools](https://www.mongodb.com/try/download/database-tools) แล้วสำรองและนำเข้าฐานข้อมูล `roommate_db` ด้วย PowerShell:

```powershell
mongodump --uri="mongodb://localhost:27017/roommate_db" --out "$env:USERPROFILE\mongo-backup"
mongorestore --uri="mongodb+srv://<ชื่อผู้ใช้>:<รหัสผ่านที่เข้ารหัส URL แล้ว>@<คลัสเตอร์>.mongodb.net/roommate_db?retryWrites=true&w=majority" "$env:USERPROFILE\mongo-backup\roommate_db"
```

คำสั่งตัวอย่างเก็บไฟล์สำรองไว้นอกโฟลเดอร์โปรเจกต์ เพื่อไม่ให้เผลอ commit ข้อมูลส่วนตัว หาก MongoDB ในเครื่องมีการยืนยันตัวตน ให้ใช้ URI ที่มีข้อมูลล็อกอินในการรัน `mongodump` ด้วย หลังนำเข้าข้อมูลแล้ว ตั้ง `MONGODB_URL` ใน `backend\.env` ให้ชี้ไปยัง Atlas แล้วรีสตาร์ต Backend ตรวจสอบฐานข้อมูลและ collections ใน Atlas ก่อนนำเข้าซ้ำ เพื่อหลีกเลี่ยงข้อมูลซ้ำหรือข้อผิดพลาดจากเอกสารที่มีอยู่แล้ว

อย่าใช้ `--drop` กับ `mongorestore` เว้นแต่ตั้งใจลบข้อมูลปลายทางเดิม และอย่าเผยแพร่ connection string ที่มีรหัสผ่านผ่านแชตหรือ Git หากรหัสผ่านที่เคยอยู่ใน `backend\.env` เป็นรหัสจริงและไฟล์นั้นเคยถูก push ขึ้น remote ให้เปลี่ยนรหัสผ่าน Database User ใน Atlas ก่อนใช้งานต่อ

เริ่ม Backend ขณะอยู่ในโฟลเดอร์ `backend`:

```powershell
uvicorn main:app --reload
```

Backend จะทำงานที่ `http://127.0.0.1:8000` และหน้าเอกสาร API อยู่ที่ `http://127.0.0.1:8000/docs`

### 2. ตั้งค่าและเริ่ม Frontend

ใน PowerShell อีกหน้าต่างหนึ่ง จากโฟลเดอร์โปรเจกต์:

```powershell
cd frontend
npm ci
npm run dev
```

เปิด URL ที่ Vite แสดงในเทอร์มินัล โดยปกติคือ `http://localhost:5173`

Frontend เชื่อมต่อกับ Backend ที่ `http://localhost:8000` โดยอัตโนมัติ หาก Backend ใช้ URL อื่น ให้สร้างไฟล์ `frontend\.env.local`:

```env
VITE_API_URL=http://localhost:8000
```

หลังแก้ไขค่า `VITE_API_URL` ให้เริ่ม Vite ใหม่

## เริ่มใช้งานครั้งแรก

1. สมัครบัญชี แล้วเข้าสู่ระบบ
2. สร้างบ้านใหม่หรือกรอกรหัสเชิญเพื่อเข้าร่วมบ้าน
3. แชร์รหัสเชิญให้เพื่อนร่วมห้องที่ต้องการเข้าบ้าน
4. เพิ่มค่าใช้จ่ายหรือสร้างงานบ้านจากหน้าแดชบอร์ด
5. เมื่อสมาชิกโอนเงินคืน ให้สมาชิกแนบสลิปในรายการนั้น
6. ผู้สร้างรายการตรวจสอบหลักฐาน แล้วเลือกยืนยันการชำระ หรือระบุเหตุผลเพื่อขอให้ส่งสลิปใหม่

## ที่จัดเก็บสลิปการโอน

ไฟล์สลิปถูกจัดเก็บใน `backend\uploads\payment_slips` และไม่ได้เปิดเป็นไฟล์สาธารณะ การดูไฟล์ต้องเรียกผ่าน API ที่ตรวจสอบ token และสิทธิ์ของผู้ใช้ โฟลเดอร์อัปโหลดถูกละเว้นจาก Git

การจัดเก็บแบบนี้เหมาะสำหรับการทดลองหรือใช้งานบนเครื่องที่มีดิสก์ถาวร แต่ระบบโฮสต์บางประเภทอาจลบไฟล์เมื่อปรับใช้เวอร์ชันใหม่หรือรีสตาร์ต ก่อนใช้งานจริงควรย้ายไปยังพื้นที่จัดเก็บไฟล์ส่วนตัวที่คงทน และสำรองข้อมูลตามความเหมาะสม

## หมายเหตุสำหรับการนำขึ้นใช้งานจริง

- ตั้ง `SECRET_KEY` เป็นค่าสุ่มที่ไม่ซ้ำและเก็บเป็นความลับ ห้ามใช้ค่าเริ่มต้นใน `backend/app/core/config.py`
- ตั้ง `CORS_ORIGINS` ให้เป็นโดเมน Frontend ที่ใช้งานจริง แทนการเปิดรับทุก origin
- ตั้งค่า MongoDB ให้จำกัดสิทธิ์ผู้ใช้และเครือข่ายที่เข้าถึงฐานข้อมูลได้
- กำหนด `VITE_API_URL` เป็น URL ของ Backend จริง และใช้ HTTPS
- เตรียมที่จัดเก็บสลิปแบบถาวรส่วนตัวก่อนใช้งานบนแพลตฟอร์มที่ไม่มี persistent disk

## โครงสร้างโฟลเดอร์

```text
backend/
  app/
    core/       การตั้งค่า ฐานข้อมูล และการตรวจสอบผู้ใช้
    models/     โมเดลและสคีมาข้อมูล
    routers/    เส้นทาง API
    services/   ตรรกะการทำงานของระบบ
  main.py       จุดเริ่มต้น FastAPI
  requirements.txt
frontend/
  src/
    pages/      หน้าเข้าสู่ระบบ บ้าน ค่าใช้จ่าย และงานบ้าน
    services/   การเรียก API
  package.json
render.yaml     Blueprint ของ Render (อยู่ที่ root repository)
README.md
```

## Deploy ด้วย Render และ Vercel

### Backend บน Render

ไฟล์ `render.yaml` อยู่ที่ **root ของ repository** ระดับเดียวกับโฟลเดอร์ `backend/` และ `frontend/` ให้เชื่อม repository ทั้งโปรเจกต์กับ Render แล้วสร้างบริการผ่าน **New → Blueprint** โดยใช้ไฟล์ `render.yaml` ที่ root นี้ หาก Render ถามตำแหน่ง Blueprint ให้ระบุ `render.yaml` ไม่ใช่ `backend/render.yaml`

ภายใน Blueprint กำหนด `rootDir: backend` ไว้แล้ว ซึ่งบอกให้ Render รันคำสั่งติดตั้ง dependencies และเริ่ม API ภายในโฟลเดอร์ Backend ไม่ได้หมายความว่าต้องย้ายไฟล์ Blueprint ไปไว้ใน `backend/`

หลังสร้าง Web Service แล้ว ให้กำหนด Environment Variables ใน Render:

- `MONGODB_URL`: connection string ของ MongoDB Atlas สำหรับฐานข้อมูล `roommate_db`
- `SECRET_KEY`: ใช้ค่าที่ Render สร้างจาก Blueprint หรือกำหนด secret แบบสุ่มที่ยาวและคาดเดายาก
- `CORS_ORIGINS`: โดเมนเว็บไซต์ Frontend ที่ deploy แล้ว เช่น `https://ชื่อโปรเจกต์.vercel.app` ไม่ต้องใส่ `/` ท้าย URL หากมีหลายโดเมนให้คั่นด้วย comma

อย่าอัปโหลด `backend\.env` ไป Render หรือ commit เข้า Git ให้ใช้ Environment Variables ของ Render แทน

หากแก้ไข `render.yaml` หรือค่า Environment Variables ภายหลัง ให้ push การเปลี่ยนแปลงขึ้น Git แล้วสั่ง deploy ใหม่ ห้ามใส่ URI จริง รหัสผ่าน หรือ secret ลงใน `render.yaml`

### Frontend บน Vercel

เมื่อเพิ่ม repository ใน Vercel ให้ตั้งค่า:

- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variable:** `VITE_API_URL` ตั้งเป็น URL ของ Backend บน Render เช่น `https://ชื่อบริการ.onrender.com`

หลัง deploy Frontend แล้ว ให้นำ URL จริงของ Vercel ไปตั้งเป็น `CORS_ORIGINS` ใน Render แล้ว deploy Backend ใหม่ หากเปลี่ยน Environment Variable ของ Vercel ต้อง build/deploy ใหม่เพื่อให้ Frontend ใช้ค่า `VITE_API_URL` ล่าสุด

การแนบสลิปปัจจุบันบันทึกไฟล์ไว้บนดิสก์ของ Backend จึงควรตั้ง persistent storage บน Render หรือย้ายไฟล์ไป private object storage ก่อนใช้งานจริง ตรวจสอบนโยบาย persistent disk และค่าใช้จ่ายของ Render สำหรับบริการที่เลือก
