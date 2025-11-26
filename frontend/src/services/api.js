import axios from "axios";
import { useAuthStore } from "@/stores/useAuthStore"; // เรียก Store มาใช้
import Swal from "sweetalert2";
import router from "@/router";

// สร้าง Axios Instance
const api = axios.create({
  // baseURL: '/api' -> จะถูก Vite Proxy ส่งต่อไปยัง http://localhost:3001/api
  baseURL: "/api",
  // สำคัญมาก! อนุญาตให้ส่ง Cookie (Session ID) ไปพร้อมกับ Request
  withCredentials: true,
});

// -------------------------------------------------------------------
// Request Interceptor (ทำก่อนส่งของออกไป)
// -------------------------------------------------------------------
api.interceptors.request.use((config) => {
  // ดึง Store มาใช้ (ต้องดึงข้างใน function เพราะ Pinia ต้องรอ init ก่อน)
  const authStore = useAuthStore();

  // ถ้ามี CSRF Token -> แนบไปใน Header 'x-csrf-token'
  if (authStore.csrfToken) {
    config.headers["x-csrf-token"] = authStore.csrfToken;
  }
  return config;
});

// -------------------------------------------------------------------
// Response Interceptor (ทำเมื่อได้รับของกลับมา)
// -------------------------------------------------------------------
api.interceptors.response.use(
  (response) => response, // ถ้าสำเร็จ ก็ส่งผ่านไปปกติ
  (error) => {
    // ถ้าเจอ Error 401 (Unauthorized / Session หมดอายุ)
    // และ *ไม่ใช่* การพยายาม Login หรือเช็ค Auth (ป้องกัน Loop)
    if (
      error.response &&
      error.response.status === 401 &&
      !error.config.url.endsWith("/auth/login") &&
      !error.config.url.endsWith("/auth/me")
    ) {
      console.warn("Session expired or unauthorized. Logging out.");

      const authStore = useAuthStore();
      authStore.logoutCleanup(); // ล้างข้อมูล User ในเครื่อง

      // ดีดกลับไปหน้าแรก (ซึ่งจะมีปุ่ม Login หรือ Modal ให้กด)
      router.push({ name: "Home" });

      Swal.fire({
        title: "Session Expired",
        text: "Please log in again.",
        icon: "warning",
        timer: 3000,
      });
    }
    return Promise.reject(error); // ส่ง Error ต่อให้ Component จัดการ (ถ้าต้องการ)
  }
);

export default api;
