import { defineStore } from "pinia";
import api from "@/services/api"; // เรียกใช้ Axios ที่เราแต่งไว้
import router from "@/router";
import Swal from "sweetalert2";

export const useAuthStore = defineStore("auth", {
  // State: เปรียบเสมือนตัวแปร Global
  state: () => ({
    user: null, // เก็บข้อมูล User ปัจจุบัน (ถ้า Login แล้ว)
    csrfToken: null, // เก็บ CSRF Token สำหรับยิง POST Request
    isAuthReady: false, // Flag บอกว่า "เช็ค Session เสร็จหรือยัง" (สำคัญสำหรับ Router)
    myLinks: [], // เก็บรายการลิงก์ของ User (สำหรับหน้า Dashboard)
    isLoadingLinks: false,
  }),

  actions: {
    // -------------------------------------------------------------------
    // Auth Flow (Init, Login, Register, Logout)
    // -------------------------------------------------------------------

    // ถูกเรียกโดย router/index.js ก่อนโหลดหน้าเว็บ
    async initAuth() {
      if (this.isAuthReady) return; // ทำแค่ครั้งเดียวพอ

      try {
        // ขอ CSRF Token ก่อนเพื่อน (จำเป็นต้องมีก่อน Login)
        const csrfResponse = await api.get("/auth/csrf");
        this.csrfToken = csrfResponse.data.csrfToken;
        console.log("CSRF Token OK.");

        // เช็คว่ามี Session ค้างอยู่ไหม (User ปิด browser ไปแล้วเปิดใหม่)
        const meResponse = await api.get("/auth/me");
        this.user = meResponse.data; // ถ้ามี -> เก็บลง State
        console.log("User OK.", this.user.email);
      } catch (error) {
        // ถ้า 401 แปลว่าไม่ได้ Login (เป็นเรื่องปกติ)
        console.log("User not authenticated.");
        this.user = null;
      } finally {
        // เสร็จสิ้นกระบวนการ -> ปล่อย Router ทำงานต่อ
        this.isAuthReady = true;
      }
    },

    async login(email, password) {
      try {
        const response = await api.post("/auth/login", { email, password });
        this.user = response.data; // เก็บ User ลง State
        router.push("/dashboard"); // พาไปหน้า Dashboard
      } catch (error) {
        // แจ้งเตือน Error ด้วย SweetAlert2
        console.error("Login failed:", error);
        Swal.fire(
          "Login Failed",
          error.response?.data?.message || "Invalid credentials",
          "error"
        );
        throw error; // โยน Error ให้ Component จัดการต่อ (เช่น หยุด Spinner)
      }
    },

    async register(email, password, confirmPassword) {
      try {
        // ยิง API Register
        const response = await api.post("/auth/register", {
          email,
          password,
          confirmPassword,
        });

        // Backend เราทำ Auto-login ให้แล้ว ก็เก็บ User ได้เลย
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
        // โยน Error ไปให้ RegisterForm แสดงผล (เช่น "Email ซ้ำ")
        console.error("Registration failed:", error);
        throw new Error(
          error.response?.data?.message || "An unknown error occurred."
        );
      }
    },

    async logout() {
      try {
        await api.post("/auth/logout");
        this.logoutCleanup(); // ล้างข้อมูลในเครื่อง

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Logged out successfully",
          showConfirmButton: false,
          timer: 1500,
        });

        router.push("/");
      } catch (error) {
        console.error("Logout failed:", error);
        Swal.fire("Error", "Could not log out.", "error");
      }
    },

    // ฟังก์ชันล้าง State (ใช้ตอน Logout หรือ Session หมดอายุ)
    logoutCleanup() {
      this.user = null;
      this.myLinks = [];
      // ไม่ล้าง csrfToken เพราะ User อาจจะ Login ใหม่ หรือสร้างลิงก์ Anonymous ต่อ
    },

    // -------------------------------------------------------------------
    // Link Management (Dashboard Features)
    // -------------------------------------------------------------------
    async fetchMyLinks(page = 1, limit = 9) {
      if (!this.user) return;
      this.isLoadingLinks = true;
      try {
        const response = await api.get("/links/me", {
          params: { page, limit },
        });

        // เช็คว่า response.data เป็น Array หรือไม่ (เผื่อ Backend ยังเป็นตัวเก่า)
        if (Array.isArray(response.data)) {
          // กรณี Backend แบบเก่า (ส่งมาแค่ Array)
          this.myLinks = response.data;
          this.pagination = null;
        } else {
          // กรณี Backend แบบใหม่ (มี Pagination: { data, meta })
          this.myLinks = response.data.data || []; // ดึงไส้ในที่เป็น Array ออกมา
          this.pagination = response.data.meta;
        }
      } catch (error) {
        console.error("Failed to fetch links:", error);
        Swal.fire("Error", "Could not fetch your links.", "error");
      } finally {
        this.isLoadingLinks = false;
      }
    },

    async deleteLink(linkId) {
      // ถามยืนยันก่อนลบ (Safety)
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#4F46E5", // (สี Indigo)
        cancelButtonColor: "#D33",
        confirmButtonText: "Yes, delete it!",
      });

      if (!result.isConfirmed) {
        return;
      }

      try {
        await api.delete(`/links/${linkId}`);

        // Optimistic Update: ลบออกจาก List ทันที (ไม่ต้องรอโหลดใหม่)
        this.myLinks = this.myLinks.filter((link) => link.id !== linkId);

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Link deleted",
          showConfirmButton: false,
          timer: 1500,
        });
      } catch (error) {
        console.error("Failed to delete link:", error);
        Swal.fire("Error", "Could not delete the link.", "error");
      }
    },
    async renewLink(linkId) {
      try {
        // เรียก API (Backend จะจัดการ Logic การต่ออายุ)
        const response = await api.patch(`/links/${linkId}`, { renew: true });

        // Update ข้อมูลลิงก์นั้นใหม่ (เช่น วันหมดอายุใหม่) ทันที
        const index = this.myLinks.findIndex((link) => link.id === linkId);
        if (index !== -1) {
          this.myLinks[index] = response.data; // อัปเดตข้อมูล Link
        }

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Link renewed!",
          showConfirmButton: false,
          timer: 1500,
        });
      } catch (error) {
        console.error("Failed to renew link:", error);
        Swal.fire("Error", "Could not renew the link.", "error");
      }
    },
  },
});
