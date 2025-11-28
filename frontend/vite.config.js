import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // โหลดตัวแปร Environment ตาม Mode ปัจจุบัน (development/production)
  // process.cwd() คือตำแหน่ง root ของ frontend
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [vue()],
    resolve: {
      // ตั้ง Alias '@' แทนโฟลเดอร์ 'src' เพื่อให้ import ไฟล์ง่าย (เช่น @/components/...)
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173, // Port ของ Frontend
      // Proxy API Requests ไปหา Backend
      proxy: {
        "/api": {
          // อ่านจาก .env หรือใช้ Default
          target: env.VITE_API_TARGET || "http://localhost:3001",
          changeOrigin: true,
          secure: false, // Dev มักไม่มี SSL Certificate ที่ถูกต้อง
        },
        // Proxy รูปภาพที่ Upload
        "/uploads": {
          target: env.VITE_API_TARGET || "http://localhost:3001",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
