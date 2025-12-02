import { defineStore } from "pinia";
import api from "@/services/api";
import router from "@/router";
import Swal from "sweetalert2";
import { APP_CONFIG } from "@/config/constants";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null, // ข้อมูล User (id, email, role, provider)
    csrfToken: null, // Token ป้องกัน CSRF
    isAuthReady: false, // เช็คว่า Init เสร็จหรือยัง (กัน Router ทำงานก่อนรู้ผล)
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === APP_CONFIG.USER_ROLES.ADMIN,
  },

  actions: {
    // ----------------------------------------------------------------
    // Initialize Authentication (ทำงานตอนโหลดหน้าเว็บครั้งแรก)
    // ----------------------------------------------------------------
    async initAuth() {
      if (this.isAuthReady) return;

      try {
        // Step A: ขอ CSRF Token ก่อนเสมอ (จำเป็นมากสำหรับ POST request)
        const csrfResponse = await api.get("/auth/csrf");
        this.csrfToken = csrfResponse.data.csrfToken;

        // Step B: เช็คว่า Login อยู่ไหม (Get Me)
        const meResponse = await api.get("/auth/me");
        this.user = meResponse.data;
      } catch (error) {
        // ถ้า Error 401 (Unauthorized) แปลว่ายังไม่ได้ Login -> เรื่องปกติ ไม่ต้องโวยวาย
        // แต่ถ้าเป็น Error อื่น (เช่น Network Error) อาจจะ Log ไว้
        this.user = null;
        if (error.status !== 401) {
          console.error("Auth Init Error:", error);
        }
      } finally {
        // ไม่ว่าจะสำเร็จหรือล้มเหลว ถือว่า Init เสร็จแล้ว ปล่อยให้ Router ทำงานต่อได้
        this.isAuthReady = true;
      }
    },
    // ----------------------------------------------------------------
    // Login
    // ----------------------------------------------------------------
    async login(email, password, rememberMe = false) {
      try {
        // ส่ง Password ไป Backend (API จะจัดการ Session ให้เอง)
        const response = await api.post("/auth/login", {
          email,
          password,
          rememberMe,
        });
        this.user = response.data;

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Welcome back!",
          showConfirmButton: false,
          timer: 1500,
        });

        // ถ้ามี Query Param 'redirect' (เช่น พยายามเข้าหน้า Dashboard แต่โดนดีดออกมา) ก็ให้กลับไปหน้านั้น
        // ถ้าไม่มีก็ไป Dashboard ปกติ
        const redirectPath =
          router.currentRoute.value.query.redirect || "/dashboard";
        router.push(redirectPath);
      } catch (error) {
        // Error 401/400 จะถูก api.js แปลงมาเป็น error.message แล้ว
        console.error("Login failed:", error);
        const displayMsg = error.message || "Invalid credentials";

        Swal.fire({
          icon: "error",
          title: "Login Failed",
          text: displayMsg,
          confirmButtonColor: "#4F46E5",
        });
        throw error; // โยนต่อให้ Component (LoginForm) จัดการ UI (เช่น หยุด Loading)
      }
    },
    // ----------------------------------------------------------------
    // Register
    // ----------------------------------------------------------------
    async register(email, password, confirmPassword) {
      try {
        // Backend เราฉลาดพอที่จะ Auto Login ให้เลยหลังสมัครเสร็จ
        const response = await api.post("/auth/register", {
          email,
          password,
          confirmPassword,
        });

        this.user = response.data;

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Registration Successful!",
          showConfirmButton: false,
          timer: 1500,
        });

        router.push("/dashboard");
      } catch (error) {
        console.error("Registration failed:", error);
        // แสดง Error ที่ได้จาก Backend (เช่น Email ซ้ำ, รหัสไม่ตรง)
        const displayMsg =
          error.response?.data?.message ||
          error.message ||
          "Registration failed.";
        throw new Error(displayMsg);
      }
    },
    // ----------------------------------------------------------------
    // Logout
    // ----------------------------------------------------------------
    async logout() {
      try {
        await api.post("/auth/logout");
      } catch (error) {
        console.error("Logout error (ignorable):", error);
      } finally {
        // เคลียร์ State เสมอ แม้ API จะ Error (เพื่อ UX ที่ดี)
        this.logoutCleanup();

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Logged out successfully",
          showConfirmButton: false,
          timer: 1500,
        });

        router.push("/");
      }
    },

    // ----------------------------------------------------------------
    // Delete Account
    // ----------------------------------------------------------------
    async deleteAccount() {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "This will permanently delete your account and all links. This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete my account",
      });

      if (!result.isConfirmed) return;

      try {
        await api.delete("/auth/me");
        this.logoutCleanup(); // ล้างข้อมูลในเครื่อง
        router.push("/"); // ดีดกลับหน้าแรก
        Swal.fire("Deleted!", "Your account has been deleted.", "success");
      } catch (error) {
        Swal.fire(
          "Error",
          error.message || "Could not delete account.",
          "error"
        );
      }
    },

    // ----------------------------------------------------------------
    // Helper: Cleanup State (ใช้เมื่อ Logout หรือ Session Expired)
    // ----------------------------------------------------------------
    logoutCleanup() {
      this.user = null;
      // หมายเหตุ: ไม่จำเป็นต้องลบ csrfToken เพราะยังใช้ต่อได้สำหรับ Public Action (เช่น Login ใหม่)
    },
  },
});
