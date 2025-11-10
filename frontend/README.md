Shortlink & QR Code - Frontend (Phase 2 - Vite)

นี่คือ Frontend (Phase 2) ที่สร้างด้วย Vite, Vue 3, Pinia, และ Tailwind CSS (แบบ Multi-file project)

Tech Stack

Framework: Vue 3 (Composition API)

Build Tool: Vite

State Management: Pinia

Routing: Vue Router

Styling: Tailwind CSS v3

API Client: Axios

UI Libs: lucide-vue-next, sweetalert2, qr-code-styling

1. Installation

(สำคัญ) Backend (Phase 1) ต้องรันก่อน!

เปิด Terminal 1

cd backend

npm run dev

(Backend ต้องรันที่ http://localhost:3001)

2. Running Frontend

Install Dependencies

เปิด Terminal 2

cd frontend

npm install

Run Development Server

npm run dev


Access the Application

เปิดเบราว์เซอร์ไปที่ http://localhost:5173

(Vite จะรันที่ Port 5173 ตามที่ตั้งค่าใน vite.config.js)

3. สถาปัตยกรรม (Architecture)

Vite Proxy: เราใช้ vite.config.js เพื่อ proxy request ทั้งหมดที่ขึ้นต้นด้วย /api ไปยัง http://localhost:3001.

Pinia (src/stores/useAuthStore.js): เป็นศูนย์กลางจัดการ State ทั้งหมด (User, CSRF Token, Auth Status)

API (src/services/api.js): Axios ถูกตั้งค่าให้ใช้ baseURL: '/api' (ซึ่งจะถูก proxy) และแนบ CSRF Token จาก Pinia Store อัตโนมัติ

Router (src/router/index.js): router.beforeEach จะเรียก authStore.initAuth() เพื่อตรวจสอบสถานะล็อกอินก่อนเสมอ ทำให้มั่นใจว่า User State ถูกต้องก่อนที่ User จะเห็นหน้าเว็บ