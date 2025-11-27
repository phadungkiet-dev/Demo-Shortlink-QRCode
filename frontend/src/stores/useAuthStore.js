import { defineStore } from "pinia";
import api from "@/services/api";
import router from "@/router";
import Swal from "sweetalert2";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    csrfToken: null,
    isAuthReady: false,
  }),

  actions: {
    async initAuth() {
      if (this.isAuthReady) return;

      try {
        const csrfResponse = await api.get("/auth/csrf");
        this.csrfToken = csrfResponse.data.csrfToken;

        const meResponse = await api.get("/auth/me");
        this.user = meResponse.data;
      } catch (error) {
        this.user = null;
      } finally {
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

    async register(email, password, confirmPassword) {
      try {
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
        throw new Error(
          error.response?.data?.message || "An unknown error occurred."
        );
      }
    },

    async logout() {
      try {
        await api.post("/auth/logout");
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
      } catch (error) {
        console.error("Logout failed:", error);
        Swal.fire("Error", "Could not log out.", "error");
      }
    },

    logoutCleanup() {
      this.user = null;
    },

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
        Swal.fire("Error", "Could not delete account.", "error");
      }
    },
  },
});
