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

    //Action for Registering
    async register(email, password, confirmPassword) {
      try {
        const response = await api.post("/auth/register", {
          email,
          password,
          confirmPassword,
        });

        // Backend auto-logs in (Task 1), so we set the user
        this.user = response.data;

        // (เพิ่มใหม่) แจ้งเตือนสำเร็จ
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Registration Successful!",
          showConfirmButton: false,
          timer: 1500,
        });

        // Redirect to dashboard (same as login)
        router.push("/dashboard");
      } catch (error) {
        console.error("Registration failed:", error);
        // (สำคัญ) Throw Error กลับไปให้ RegisterForm.vue
        // เพื่อให้มันแสดง Error ในฟอร์ม (errorMsg.value)
        throw new Error(
          error.response?.data?.message || "An unknown error occurred."
        );
      }
    },

    async logout() {
      try {
        await api.post("/auth/logout");
        this.logoutCleanup();

        //  (เพิ่มใหม่) แจ้งเตือนสำเร็จ
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

    // +++ (เพิ่มใหม่) Action for Deleting a Link +++
    async deleteLink(linkId) {
      // 1. (สำคัญ) ขอคำยืนยันก่อน
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
        return; // ผู้ใช้กดยกเลิก
      }

      // 2. ถ้าผู้ใช้ยืนยัน...
      try {
        await api.delete(`/links/${linkId}`);

        // 3. (สำคัญ) อัปเดต State ในหน้าจอทันที (Optimistic UI)
        this.myLinks = this.myLinks.filter((link) => link.id !== linkId);

        // 4. แจ้งเตือนสำเร็จ
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
    // +++ (เพิ่มใหม่) Action for Renewing a Link +++
    async renewLink(linkId) {
      try {
        // 1. เรียก API (Backend จะจัดการ Logic การต่ออายุ)
        const response = await api.patch(`/links/${linkId}`, { renew: true });

        // 2. (สำคัญ) อัปเดต State ในหน้าจอทันที
        const index = this.myLinks.findIndex((link) => link.id === linkId);
        if (index !== -1) {
          this.myLinks[index] = response.data; // อัปเดตข้อมูล Link
        }

        // 3. แจ้งเตือนสำเร็จ
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
