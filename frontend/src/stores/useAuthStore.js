import { defineStore } from "pinia";
import api from "@/services/api";
import router from "@/router";
import Swal from "sweetalert2";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    csrfToken: null,
    isAuthReady: false, // (สำคัญ) Flag สำหรับบอกว่าเช็ค Auth เสร็จยัง
    myLinks: [],
    isLoadingLinks: false,
  }),

  actions: {
    // (Auth flow 2) ถูกเรียกโดย router.beforeEach
    async initAuth() {
      if (this.isAuthReady) return; // ทำแค่ครั้งเดียว

      try {
        // 1. ดึง CSRF Token ก่อน
        const csrfResponse = await api.get("/auth/csrf");
        this.csrfToken = csrfResponse.data.csrfToken;
        console.log("CSRF Token OK.");

        // 2. ตรวจสอบว่ามี session ค้างอยู่หรือไม่
        const meResponse = await api.get("/auth/me");
        this.user = meResponse.data;
        console.log("User OK.", this.user.email);
      } catch (error) {
        // (ปกติ) ถ้าไม่ได้ login จะ 401
        console.log("User not authenticated.");
        this.user = null;
      } finally {
        // (Auth flow 3) เสร็จสิ้นการตรวจสอบ
        this.isAuthReady = true;
      }
    },

    async login(email, password) {
      try {
        const response = await api.post("/auth/login", { email, password });
        this.user = response.data;
        router.push("/dashboard");
      } catch (error) {
        console.error("Login failed:", error);
        Swal.fire(
          "Login Failed",
          error.response?.data?.message || "Invalid credentials",
          "error"
        );
        throw error;
      }
    },

    async logout() {
      try {
        await api.post("/auth/logout");
        this.logoutCleanup();
        router.push("/");
      } catch (error) {
        console.error("Logout failed:", error);
        Swal.fire("Error", "Could not log out.", "error");
      }
    },

    // ล้าง State (ใช้ตอน logout หรือ 401)
    logoutCleanup() {
      this.user = null;
      this.myLinks = [];
      // (ไม่ล้าง csrfToken เพราะ anonymous ยังต้องใช้)
    },

    // --- Link Management ---
    async fetchMyLinks() {
      if (!this.user) return;
      this.isLoadingLinks = true;
      try {
        const response = await api.get("/links/me");
        this.myLinks = response.data;
      } catch (error) {
        console.error("Failed to fetch links:", error);
        Swal.fire("Error", "Could not fetch your links.", "error");
      } finally {
        this.isLoadingLinks = false;
      }
    },
  },
});
