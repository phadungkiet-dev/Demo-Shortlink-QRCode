import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
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
        target: "http://localhost:3001", // Backend URL
        changeOrigin: true,
        secure: false,
      },
      // Proxy รูปภาพที่ Upload ไปหา Backend ด้วย
      "/uploads": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
