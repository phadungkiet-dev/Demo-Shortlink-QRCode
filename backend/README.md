Shortlink & QR Code - Backend (Phase 1)

นี่คือ Backend API สำหรับระบบ Shortlink & QR Code พัฒนาด้วย Node.js, Express, Prisma, และ PostgreSQL

Tech Stack

Framework: Node.js, Express

ORM: Prisma

Database: PostgreSQL

Authentication: express-session (Session-based), passport (Local + Google OAuth), csurf (CSRF Protection)

Middleware: Helmet, CORS, Compression, Morgan, Express-Rate-Limit

Validation: Zod

Utilities: bcrypt, nanoid, node-cron, useragent

1. Installation

Clone Repository

git clone ...
cd backend


Install Dependencies

npm install


Setup Environment Variables
สร้างไฟล์ .env จาก .env.example

cp .env.example .env


แก้ไขค่าใน .env โดยเฉพาะ:

DATABASE_URL: Connection string ของ PostgreSQL

SESSION_SECRET: คีย์ลับสำหรับ Session

GOOGLE_CLIENT_ID และ GOOGLE_CLIENT_SECRET: (ถ้าต้องการทดสอบ Google OAuth)

Setup Database (Prisma)
รัน migration เพื่อสร้างตารางในฐานข้อมูล

npx prisma migrate dev


Seed Database (Optional)
สร้าง User (Admin/User) และ Link ตัวอย่าง

npm run prisma:seed


Admin: admin@local.dev / Admin#123

User: user@local.dev / User#123

Run Development Server

npm run dev


Server จะรันที่ http://localhost:3001 (หรือ Port ที่ตั้งใน .env)

2. API Testing (cURL)

สำคัญ: ระบบนี้ใช้ Session (Cookie) และ CSRF Token
คุณต้องดึง CSRF token ก่อน แล้วส่งไปใน Header x-csrf-token ของทุก Request (POST, PATCH, DELETE)

ตัวแปร (Bash)

BASE_URL="http://localhost:3001"
COOKIE_JAR="cookie.txt"


1. ตรวจสอบสถานะ (Health Check)

curl $BASE_URL/api/health


2. ขอ CSRF Token (สำคัญมาก)

คำสั่งนี้จะดึง CSRF token และบันทึก Session Cookie ลงใน cookie.txt

CSRF_TOKEN=$(curl -s -c $COOKIE_JAR $BASE_URL/api/auth/csrf | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)
echo "CSRF Token: $CSRF_TOKEN"


(ถ้าใช้ jq: CSRF_TOKEN=$(curl ... | jq -r .csrfToken))

3. ล็อกอิน (Local)

ใช้ Cookie ที่บันทึกไว้ และส่ง CSRF Token

curl -i -b $COOKIE_JAR -c $COOKIE_JAR \
-X POST $BASE_URL/api/auth/login \
-H "Content-Type: application/json" \
-H "x-csrf-token: $CSRF_TOKEN" \
-d '{
    "email": "user@local.dev",
    "password": "User#123"
}'


4. ดูข้อมูลตัวเอง (Get Me)

ต้องล็อกอินก่อน

curl -b $COOKIE_JAR $BASE_URL/api/auth/me


5. สร้าง Shortlink (ขณะล็อกอิน)

curl -i -b $COOKIE_JAR -c $COOKIE_JAR \
-X POST $BASE_URL/api/links \
-H "Content-Type: application/json" \
-H "x-csrf-token: $CSRF_TOKEN" \
-d '{
    "targetUrl": "[https://www.google.com/search?q=prisma](https://www.google.com/search?q=prisma)"
}'


6. สร้าง Shortlink (แบบไม่ล็อกอิน - Anonymous)

ลบ Cookie เก่าก่อน

ขอ CSRF ใหม่ (สำหรับ Anonymous Session)

rm $COOKIE_JAR
ANON_CSRF=$(curl -s -c $COOKIE_JAR $BASE_URL/api/auth/csrf | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)

curl -i -b $COOKIE_JAR \
-X POST $BASE_URL/api/links \
-H "Content-Type: application/json" \
-H "x-csrf-token: $ANON_CSRF" \
-d '{
    "targetUrl": "[https://github.com](https://github.com)"
}'


(ลิงก์นี้จะมีอายุ 7 วัน และถูกจำกัด Rate Limit)

7. ทดสอบ Redirect (GET /r/:slug)

(สมมติว่า slug google ถูกสร้างจาก seed)

curl -I $BASE_URL/r/google


(คุณจะเห็น HTTP/1.1 302 Found และ Location: https://google.com)

3. Postman / Insomnia

ดูไฟล์ Shortlink_API_Phase1.json

วิธีใช้งาน:

Import Collection

ไปที่ Request "1. Get CSRF Token"

รัน Request นี้ 1 ครั้ง

Collection มี Script ที่จะดึง csrfToken จาก Response body และ _csrf จาก Cookie ไปเก็บใน Environment Variables ({{csrfToken}} และ {{csrfCookie}})

Request อื่นๆ (เช่น Login, Create Link) ถูกตั้งค่าให้ดึงค่านี้ไปใช้ใน Header x-csrf-token และ Cookie อัตโนมัติ

4. Phase 2 Plan (Frontend)

Backend (Phase 1) พร้อมแล้วสำหรับ Phase 2

Stack: Vue 3 (Vite), TailwindCSS, SweetAlert2, qr-code-styling, lucide-vue-next

การเชื่อมต่อ:

Frontend ต้องรันบน http://localhost:5173 (ตามค่า CORS_ORIGIN)

Workflow การ Auth:

Frontend (App.vue onMount) ต้อง GET /api/auth/csrf เพื่อรับ Token

เก็บ Token นี้ไว้ (เช่นใน Pinia/Vuex store)

ใช้ Axios Interceptor เพื่อแนบ Token นี้ไปใน Header x-csrf-token ของทุก Request (POST, PATCH, DELETE)

Axios ต้องตั้งค่า withCredentials: true เพื่ออนุญาตการส่ง-รับ Cookies

หน้า: Login, Register (Local), Dashboard (My Links), Link Creation Modal, Stats Page.