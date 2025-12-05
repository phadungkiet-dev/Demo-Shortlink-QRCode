import { defineStore } from "pinia";
import api from "@/services/api";
import Swal from "sweetalert2";
import { APP_CONFIG } from "@/config/constants";

export const useLinkStore = defineStore("links", {
  state: () => ({
    myLinks: [],
    pagination: {
      page: APP_CONFIG.PAGINATION.DEFAULT_PAGE,
      totalPages: 1,
      total: 0,
    }, // กำหนดค่าเริ่มต้นกัน Error
    stats: {
      total: 0,
      active: 0,
      inactive: 0,
    },
    isLoading: false,
    lastCreatedLink: null,
  }),

  actions: {
    // ----------------------------------------------------------------
    // Fetch Links (ดึงข้อมูลลิงก์ + Search + Pagination)
    // ----------------------------------------------------------------
    async fetchMyLinks(
      page = APP_CONFIG.PAGINATION.DEFAULT_PAGE,
      limit = APP_CONFIG.PAGINATION.DEFAULT_LIMIT,
      search = "",
      status = "ALL"
    ) {
      this.isLoading = true;
      try {
        const response = await api.get("/links/me", {
          params: { page, limit, search, status },
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

        // 1. หาลิงก์ที่จะลบก่อน เพื่อเช็คสถานะ
        const linkToDelete = this.myLinks.find((l) => l.id === linkId);

        // Update UI ทันที (Optimistic Update)
        this.myLinks = this.myLinks.filter((link) => link.id !== linkId);

        // ลดจำนวนใน Stats ด้วย เพื่อความสมจริง
        // 3. อัปเดต Stats ให้ครบทุกค่า
        if (linkToDelete) {
          if (this.stats.total > 0) this.stats.total--;

          if (linkToDelete.disabled) {
            // ถ้าลิงก์ที่ลบเป็น Inactive -> ลดค่า Inactive
            if (this.stats.inactive > 0) this.stats.inactive--;
          } else {
            // ถ้าลิงก์ที่ลบเป็น Active -> ลดค่า Active
            if (this.stats.active > 0) this.stats.active--;
          }
        }

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
        this.fetchMyLinks(
          this.pagination?.page || APP_CONFIG.PAGINATION.DEFAULT_PAGE
        );

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
    // ----------------------------------------------------------------
    // Toggle Link Status (Enable/Disable)
    // ----------------------------------------------------------------
    async toggleLinkStatus(link) {
      try {
        // ยิง API ไปหา Backend
        const response = await api.patch(`/links/${link.id}`, {
          disabled: !link.disabled,
        });

        const updatedLink = response.data;

        // อัปเดตข้อมูลใน List (UI)
        this.updateLinkInStore(updatedLink);

        // อัปเดต Stats (Optimistic Update)
        // ถ้าสถานะใหม่เป็น Disabled (แปลว่าเดิมคือ Active) -> Active ลด, Inactive เพิ่ม
        if (updatedLink.disabled) {
          if (this.stats.active > 0) this.stats.active--;
          this.stats.inactive++;
        } else {
          // ถ้าสถานะใหม่เป็น Active (แปลว่าเดิมคือ Disabled) -> Active เพิ่ม, Inactive ลด
          this.stats.active++;
          if (this.stats.inactive > 0) this.stats.inactive--;
        }

        return updatedLink; // ส่งข้อมูลกลับไปเผื่อ Component อยากใช้
      } catch (error) {
        throw error; // โยน Error ออกไปให้ Component จัดการต่อ (ถ้าจำเป็น)
      }
    },

    async createShortlink(payload) {
      this.isLoading = true;
      try {
        // เรียก API เพื่อสร้างลิงก์
        const response = await api.post("/links", payload);
        const newLink = response.data;

        // เก็บผลลัพธ์ล่าสุดไว้ใน state (เผื่อใช้)
        this.lastCreatedLink = newLink;

        // ถ้า User ล็อกอินอยู่ และมีรายการลิงก์อยู่แล้ว (หน้า Dashboard)
        // เพิ่มลิงก์ใหม่เข้าไปใน list ทันที (Optimistic Update)
        // เพื่อให้หน้าจออัปเดตโดยไม่ต้องโหลดใหม่
        if (this.myLinks.length > 0) {
          this.myLinks.unshift(newLink); // เพิ่มไว้ตัวแรกสุด
          this.stats.total++;
          this.stats.active++;
        }

        return newLink; // ส่งข้อมูลลิงก์ที่สร้างได้กลับไปให้ Component (เพื่อแสดง Modal)
      } catch (error) {
        // จัดการ Error: แสดง Alert หรือโยน Error ต่อไปให้ Component จัดการเอง
        // ในที่นี้เราจะโยน Error กลับไปเพื่อให้ HomeView แสดงข้อความใน UI
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
  },
});
