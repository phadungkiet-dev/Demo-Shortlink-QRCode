import axios from "axios";
import { useAuthStore } from "@/stores/useAuthStore";
import Swal from "sweetalert2";
import router from "@/router";

const api = axios.create({
  // (สำคัญ) baseURL คือ /api ซึ่งจะถูก proxy โดย Vite
  baseURL: "/api",
  withCredentials: true,
});

// (สำคัญ) Request Interceptor สำหรับแนบ CSRF Token
api.interceptors.request.use((config) => {
  // ดึง store มาใช้แบบ dynamic
  const authStore = useAuthStore();

  if (authStore.csrfToken) {
    config.headers["x-csrf-token"] = authStore.csrfToken;
  }
  return config;
});

// (สำคัญ) Response Interceptor สำหรับ 401 (Session หมดอายุ)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // ถ้า Session หมดอายุ (401) และไม่ได้กำลังพยายาม login
    if (
      error.response &&
      error.response.status === 401 &&
      !error.config.url.endsWith("/auth/login") &&
      !error.config.url.endsWith("/auth/me")
    ) {
      console.warn("Session expired or unauthorized. Logging out.");
      const authStore = useAuthStore();
      authStore.logoutCleanup(); // ล้าง state ฝั่ง client

      // ซึ่ง router/index.js จะแสดง Login Modal เอง
      router.push({ name: "Home" });

      Swal.fire({
        title: "Session Expired",
        text: "Please log in again.",
        icon: "warning",
        timer: 3000,
      });
    }
    return Promise.reject(error);
  }
);

export default api;
