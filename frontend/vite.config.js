import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // รัน Frontend ที่ Port 5173 (ตรงกับ CORS_ORIGIN ของ Backend)
    port: 5173,

    // (สำคัญมาก) Proxy API requests ไปยัง Backend เพื่อแก้ปัญหา CORS
    proxy: {
      "/api": {
        target: "http://localhost:3001", // Backend API
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
