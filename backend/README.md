# Shortlink.QR - Backend API
Backend Service สำหรับระบบย่อลิงก์และสร้าง QR Code พัฒนาด้วย Node.js และ PostgreSQL เน้นประสิทธิภาพ (Performance), ความปลอดภัย (Security) และความยืดหยุ่น (Flexibility)

## 🛠 Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** Passport.js (Local & Google OAuth), Session-based with Cookie
- **Security:** Helmet, CORS, CSURF, Express Rate Limit, Zod Validation
- **Logging:** Winston (Daily Rotate File)
- **Utilities:** GeoIP-lite, Node-Cron, Nanoid

## 🚀 Getting Started
ทำตามขั้นตอนด้านล่างเพื่อรันโปรเจกต์ในเครื่องของคุณ (Local Development)

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL Database

### 2. Installation
ติดตั้ง Dependencies ทั้งหมด
```bash
cd backend
npm install
```

### 3. Environment Configuration
สร้างไฟล์ .env จากไฟล์ตัวอย่าง และแก้ไขค่า Config ที่จำเป็น (โดยเฉพาะ DATABASE_URL)
```bash
cp .env.example .env
```

### 4. Database Setup (Prisma)
สร้างตารางใน Database (Migration)
```bash
npx prisma migrate dev --name init
```
ใส่ข้อมูลตัวอย่าง (Admin, Demo User, Links, Analytics Data)
```bash
npx prisma db prisma/seed.js
```

### 5. Running the Application
รัน Server ในโหมด Development (รองรับ Hot-reload)
```bash
npm run dev
```

Server จะรันที่: http://localhost:3001

## 📂 Project Structure
โครงสร้างโปรเจกต์ถูกออกแบบตามหลัก Separation of Concerns
```text
backend/
├── src/
│   ├── app.js           # Entry point & Middleware setup
│   ├── config/          # Configuration (Constants, Passport, Prisma)
│   ├── controllers/     # Request handlers (รับ Request -> เรียก Service -> ส่ง Response)
│   ├── services/        # Business logic & Database interaction
│   ├── routes/          # API Routes definitions
│   ├── middlewares/     # Auth guard, Rate limit, Error handling, Upload
│   ├── utils/           # Helper functions (Logger, Slug, Time, Email)
│   └── jobs/            # Cron jobs (Cleanup expired links)
├── prisma/
│   ├── schema.prisma    # Database schema definition
│   └── seed.js          # Seed data script (Mock data generation)
└── storage/             # Folder สำหรับเก็บไฟล์อัปโหลด (Logos)
```

## 🔗 Key Endpoints
```text
Method,Endpoint,Description,Auth Required
GET,/sl/:slug,Redirect ไปยังลิงก์ปลายทาง (Public),❌
POST,/api/auth/login,เข้าสู่ระบบ (Local),❌
POST,/api/links,สร้าง Shortlink ใหม่,⚠️ (Optional)
GET,/api/links/me,ดูรายการลิงก์ของฉัน,✅
GET,/api/links/:id/stats,ดูสถิติการคลิก (Analytics),✅
GET,/api/admin/users,ดูรายชื่อผู้ใช้ทั้งหมด (Admin Only),✅ (Admin)
```

## ⚠️ Important Notes
- Authentication: ระบบใช้ Session-based Authentication ร่วมกับ HttpOnly Cookies
- CSRF Protection: ทุก Request ที่เป็น State-changing (POST, PUT, DELETE) ไปยัง /api/* จำเป็นต้องแนบ CSRF Token ใน Header x-csrf-token
- Timezone: ระบบถูกตั้งค่าให้ Log และตัดรอบวัน Analytics ตามเวลา Asia/Bangkok
- Rate Limiting:
- Redirect (/sl/*): 600 req/min
- General API: 200 req/15min
- Create Link: 5 req/hour (สำหรับ Guest)