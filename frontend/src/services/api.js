import axios from "axios";
import { useAuthStore } from "@/stores/useAuthStore";
import Swal from "sweetalert2";
import router from "@/router";
import { APP_CONFIG } from "@/config/constants";

// สร้าง Axios Instance
const api = axios.create({
  // baseURL: '/api' -> Vite Proxy จะส่งต่อไปที่ http://localhost:3001/api
  baseURL: APP_CONFIG.API.BASE_URL,
  // สำคัญมาก! อนุญาตให้ส่ง Cookie (Session ID) ไปพร้อมกับ Request
  withCredentials: true,
  // Timeout 10 วินาที (ป้องกันรอนานเกินไป)
  timeout: APP_CONFIG.API.TIMEOUT,
});

// -------------------------------------------------------------------
// Request Interceptor (ขาออก)
// -------------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    // ต้องเรียก Store ข้างในนี้ เพราะ Pinia ต้องรอ Init ก่อน
    const authStore = useAuthStore();

    // แนบ CSRF Token ไปใน Header (ถ้ามี)
    if (authStore.csrfToken) {
      config.headers["x-csrf-token"] = authStore.csrfToken;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// -------------------------------------------------------------------
// Response Interceptor (ขาเข้า)
// -------------------------------------------------------------------
api.interceptors.response.use(
  (response) => response, // ถ้าสำเร็จ (2xx) ส่งผ่านไปเลย
  (error) => {
    const authStore = useAuthStore();

    // ดึง Message จาก Backend ให้ถูกต้อง
    // Backend เราส่ง { message: "..." } มาเสมอใน AppError
    const serverMessage = error.response?.data?.message;
    let errorMessage = serverMessage || "Something went wrong.";
    const status = error.response?.status;

    // --- Case 1: 401 Unauthorized (Session หมดอายุ / ยังไม่ Login) ---
    // ยกเว้น endpoint /auth/me และ /auth/login เพื่อไม่ให้เกิด Infinite Loop
    if (status === 401) {
      // ถ้าเป็น Endpoint เช็คสถานะหรือ Login ไม่ต้องเด้ง Logout ซ้ำ

      const isAuthCheck =
        error.config.url.includes("/auth/me") ||
        error.config.url.includes("/auth/login");
        
      if (!isAuthCheck) {
        console.warn("Session expired. Logging out...");
        authStore.logoutCleanup();
        router.push("/?login=true");
        Swal.fire({
          icon: "warning",
          title: "Session Expired",
          text: "Please log in again.",
          timer: 3000,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
        });
      }
    }

    // --- Case 2: 403 Forbidden (ไม่มีสิทธิ์ เช่น User จะลบลิงก์คนอื่น) ---
    if (status === 403) {
      Swal.fire({
        icon: "error",
        title: "Access Denied",
        text: errorMessage,
      });
    }

    // --- Case 3: 429 Too Many Requests (Spam) ---
    if (status === 429) {
      errorMessage = "Too many requests. Please slow down.";
      Swal.fire({
        icon: "warning",
        title: "Whoa, slow down!",
        text: errorMessage,
        timer: 3000,
        toast: true,
        position: "top-end",
      });
    }

    // --- Case 4: 500 Server Error (ระบบพัง) ---
    if (status >= 500) {
      errorMessage = "Server error. Please try again later.";
      // (Optional) อาจจะไม่โชว์ Alert ทุกครั้ง ถ้าอยากให้ UX เนียนๆ
      // แต่ Log ลง Console ไว้ debug
      console.error("Server Error:", error);
    }

    // แปลง Error Object ให้ Component ใช้งานง่ายขึ้น
    // Component จะได้รับ error.message ที่เป็น string ตรงๆ หรือ object เดิม
    const customError = new Error(errorMessage);
    customError.originalError = error;
    customError.status = status;

    return Promise.reject(customError);
  }
);

export default api;
