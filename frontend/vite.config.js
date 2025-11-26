import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    // ตั้งชื่อเล่น (Alias) ให้ @ แทนโฟลเดอร์ src
    // ช่วยให้การ import ไฟล์ดูสะอาดตาและจัดการง่าย
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // รัน Frontend ที่ Port 5173 (ตรงกับ CORS_ORIGIN ที่เราตั้งใน Backend .env)
    port: 5173,

    // (สำคัญมาก) Proxy API requests ไปยัง Backend เพื่อแก้ปัญหา CORS ในระหว่าง Development
    proxy: {
      "/api": {
        target: "http://localhost:3001", // ส่งต่อ Request ไปหา Backend
        changeOrigin: true,
        secure: false, // รองรับ http ธรรมดา (ไม่บังคับ https)
      },
    },
  },
});
