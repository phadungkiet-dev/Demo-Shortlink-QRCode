import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // โหลดตัวแปร Environment ตาม Mode ปัจจุบัน
  // process.cwd() คือตำแหน่ง root ของ frontend
  const env = loadEnv(mode, process.cwd(), "");

  const API_TARGET = env.VITE_API_TARGET || "http://localhost:3001";
  const SL_PREFIX = env.VITE_SHORT_LINK_PREFIX || "sl";

  return {
    plugins: [vue()],
    resolve: {
      // ตั้ง Alias '@' แทนโฟลเดอร์ 'src'
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173, // Port ของ Frontend Dev Server
      // Proxy Configuration (ทำงานเฉพาะตอน npm run dev)
      // ช่วยแก้ปัญหา CORS และทำให้ Frontend เรียก /api ได้เหมือนอยู่โดเมนเดียวกัน
      proxy: {
        // Proxy API Requests
        "/api": {
          target: API_TARGET,
          changeOrigin: true,
          secure: false, // รองรับ Backend ที่เป็น HTTP หรือ Self-signed SSL
        },
        // Proxy Uploaded Images
        "/uploads": {
          target: API_TARGET,
          changeOrigin: true,
          secure: false,
        },
        // Proxy Shortlink Redirect (Dynamic RegExp)
        // ส่งต่อ /sl/xxxx ไปยัง Backend
        [`^/${SL_PREFIX}/`]: {
          target: API_TARGET,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
