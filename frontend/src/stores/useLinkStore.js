import { defineStore } from "pinia";
import api from "@/services/api";
import Swal from "sweetalert2";

export const useLinkStore = defineStore("links", {
  state: () => ({
    myLinks: [],
    pagination: { page: 1, totalPages: 1, total: 0 }, // กำหนดค่าเริ่มต้นกัน Error
    stats: {
      total: 0,
      active: 0,
      inactive: 0,
    },
    isLoading: false,
  }),

  actions: {
    // ----------------------------------------------------------------
    // Fetch Links (ดึงข้อมูลลิงก์ + Search + Pagination)
    // ----------------------------------------------------------------
    async fetchMyLinks(page = 1, limit = 9, search = "") {
      this.isLoading = true;
      try {
        const response = await api.get("/links/me", {
          params: { page, limit, search },
        });

        // รองรับโครงสร้าง Response ใหม่ { data, meta, stats }
        if (response.data.data) {
          this.myLinks = response.data.data;
          this.pagination = response.data.meta;

          // อัปเดตสถิติภาพรวม (ถ้ามีส่งมา)
          if (response.data.stats) {
            this.stats = response.data.stats;
          }
        } else {
          // Fallback กรณี Backend ส่งมาแบบเก่า
          this.myLinks = response.data;
        }
      } catch (error) {
        console.error("Failed to fetch links:", error);
        // ไม่ต้อง Alert ทุกครั้งถ้าแค่โหลดไม่ขึ้น (อาจจะเน็ตหลุด)
        // แต่ถ้าอยากแจ้งเตือน ให้ใช้ error.message ที่เราทำไว้
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: error.message || "Could not load links.",
        });
        this.myLinks = [];
      } finally {
        this.isLoading = false;
      }
    },
    // ----------------------------------------------------------------
    // Delete Link
    // ----------------------------------------------------------------
    async deleteLink(linkId) {
      const result = await Swal.fire({
        title: "Delete this link?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete it!",
      });

      if (!result.isConfirmed) return;

      try {
        await api.delete(`/links/${linkId}`);

        // Update UI ทันที (Optimistic Update)
        this.myLinks = this.myLinks.filter((link) => link.id !== linkId);

        // ลดจำนวนใน Stats ด้วย เพื่อความสมจริง
        if (this.stats.total > 0) this.stats.total--;
        // (หมายเหตุ: Active/Inactive อาจจะไม่เป๊ะ ต้องโหลดใหม่ถึงจะชัวร์ แต่แบบนี้ UX ดีกว่า)

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Link deleted",
          showConfirmButton: false,
          timer: 1500,
        });
      } catch (error) {
        Swal.fire("Error", error.message || "Could not delete link.", "error");
      }
    },
    // ----------------------------------------------------------------
    // Renew Link
    // ----------------------------------------------------------------
    async renewLink(linkId) {
      try {
        const response = await api.patch(`/links/${linkId}`, { renew: true });

        // อัปเดตข้อมูลใน List (เช่น วันหมดอายุ, สถานะ Disabled)
        const index = this.myLinks.findIndex((link) => link.id === linkId);
        if (index !== -1) {
          this.myLinks[index] = { ...this.myLinks[index], ...response.data };
        }

        // รีเฟรชข้อมูลใหม่เพื่อให้ Stats (Active/Inactive) อัปเดตถูกต้อง
        // (เพราะการ Renew อาจเปลี่ยนจาก Inactive -> Active)
        this.fetchMyLinks(this.pagination?.page || 1);

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Link renewed!",
          showConfirmButton: false,
          timer: 1500,
        });
      } catch (error) {
        Swal.fire("Error", error.message || "Renew failed.", "error");
      }
    },

    // ----------------------------------------------------------------
    // Update Link in Store (Helper)
    // ----------------------------------------------------------------
    // ใช้โดย Component อื่น (เช่น EditLinkModal) เมื่อแก้ไขเสร็จ
    // เพื่อให้หน้า Dashboard อัปเดตทันทีโดยไม่ต้องโหลดใหม่
    updateLinkInStore(updatedLink) {
      const index = this.myLinks.findIndex((l) => l.id === updatedLink.id);
      if (index !== -1) {
        this.myLinks[index] = { ...this.myLinks[index], ...updatedLink };
      }
    },
  },
});
