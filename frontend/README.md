# Shortlink.QR - Frontend

Frontend Application สำหรับระบบย่อลิงก์และสร้าง QR Code พัฒนาด้วย **Vue 3** และ **Tailwind CSS** เน้นความเร็ว (Performance), ความสวยงาม (Modern UI), และประสบการณ์ผู้ใช้ที่ดี (UX)

## 🛠 Tech Stack

- **Framework:** Vue 3 (Composition API)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS v3, PostCSS
- **State Management:** Pinia
- **Routing:** Vue Router 4
- **HTTP Client:** Axios
- **UI Components:** Headless UI logic, Lucide Icons
- **Charts:** Chart.js, Vue-Chartjs
- **QR Code:** QR Code Styling
- **Alerts:** SweetAlert2

## 🚀 Getting Started

ทำตามขั้นตอนด้านล่างเพื่อรันโปรเจกต์ในเครื่องของคุณ (Local Development)

### 1. Prerequisites
- Node.js (v18+)
- Backend API ต้องรันอยู่ (ที่ `http://localhost:3001` หรือ URL อื่น)

### 2. Installation
ติดตั้ง Dependencies ทั้งหมด
```bash
cd frontend
npm install
```

### 3. Environment Configuration
สร้างไฟล์ .env จากไฟล์ตัวอย่าง และแก้ไขค่า Config
```bash
cp .env.example .env
```

# ค่า Config ที่สำคัญ:
- VITE_API_TARGET: URL ของ Backend API (Default: http://localhost:3001)
- VITE_SHORT_LINK_PREFIX: Prefix ของลิงก์ย่อ ต้องตรงกับ Backend (Default: sl)

### 4. Running the Application
รัน Server ในโหมด Development
```bash
npm run dev
```

Frontend จะรันที่: http://localhost:5173

## 📂 Project Structure
โครงสร้างโปรเจกต์ถูกจัดระเบียบตามหน้าที่ (Feature-based / Layer-based)
```text
frontend/
├── public/              # Static assets (Favicon, etc.)
├── src/
│   ├── assets/          # CSS, Images, Fonts
│   ├── components/      # Reusable UI Components (Modal, Button, Navbar)
│   ├── config/          # App Configuration (Constants)
│   ├── router/          # Vue Router configuration & Guards
│   ├── services/        # API Service layers (Axios instances)
│   ├── stores/          # Pinia Stores (Auth, Link Management)
│   ├── views/           # Page Components (Dashboard, Login, Stats)
│   ├── App.vue          # Root Component
│   └── main.js          # Entry point
├── .env.example         # Environment template
├── index.html           # HTML Entry point
├── tailwind.config.js   # Tailwind CSS configuration
└── vite.config.js       # Vite configuration & Proxy setup
```

## ✨ Key Features
- Authentication:
    - Login / Register (Email & Password)
    - Google OAuth Integration
    - "Remember Me" functionality (7 Days)
- Dashboard:
    - จัดการลิงก์ (สร้าง, แก้ไข, ลบ, เปิด/ปิดสถานะ)
    - ค้นหาและกรองลิงก์ (Active/Inactive)
    - Copy ลิงก์ย่อได้ทันที
- Analytics:
    - กราฟเส้นแสดงยอดคลิกย้อนหลัง 7 วัน (ตาม Timezone ผู้ใช้)
    - กราฟแท่งแสดง Top Referrers, Countries, Devices
- QR Code Generator:
    - สร้าง QR Code พร้อมโลโก้ตรงกลาง
    - ปรับแต่งสีและรูปแบบจุด (Dots/Corners)
    - ดาวน์โหลดเป็น PNG/JPEG/SVG
- System:
    - Responsive Design (รองรับมือถือและเดสก์ท็อป)
    - Loading State & Error Handling ที่สมบูรณ์

## ⚠️ Notes for Developers
- API Proxy: ในโหมด Dev (npm run dev), Vite จะ Proxy request ที่ขึ้นต้นด้วย /api, /uploads, และ /sl ไปยัง Backend ให้อัตโนมัติ (ตั้งค่าใน vite.config.js)