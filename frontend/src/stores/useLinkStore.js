import { defineStore } from "pinia";
import api from "@/services/api";
import Swal from "sweetalert2";

export const useLinkStore = defineStore("links", {
  state: () => ({
    myLinks: [],
    pagination: null,
    // +++ เพิ่ม state stats +++
    stats: {
      total: 0,
      active: 0,
      inactive: 0,
    },
    isLoading: false,
  }),

  actions: {
    async fetchMyLinks(page = 1, limit = 9, search = "") {
      this.isLoading = true;
      try {
        const response = await api.get("/links/me", {
          params: { page, limit, search },
        });

        // รับค่าจาก Backend โครงสร้างใหม่
        if (response.data.data) {
          this.myLinks = response.data.data;
          this.pagination = response.data.meta;
          // +++ รับค่า stats จาก Backend +++
          if (response.data.stats) {
            this.stats = response.data.stats;
          }
        } else {
          // Fallback กรณี Backend เก่า
          this.myLinks = response.data;
        }
      } catch (error) {
        console.error("Failed to fetch links:", error);
        Swal.fire("Error", "Could not fetch links.", "error");
        this.myLinks = [];
      } finally {
        this.isLoading = false;
      }
    },

    async deleteLink(linkId) {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#4F46E5",
        cancelButtonColor: "#D33",
        confirmButtonText: "Yes, delete it!",
      });

      if (!result.isConfirmed) return;

      try {
        await api.delete(`/links/${linkId}`);

        // ลบออกจาก list หน้าปัจจุบันทันที (Optimistic)
        this.myLinks = this.myLinks.filter((link) => link.id !== linkId);

        // อัปเดต Stats แบบ manual (เพื่อให้ตัวเลขลดลงทันทีโดยไม่ต้องโหลดใหม่)
        this.stats.total--;
        // (ถ้าจะให้แม่นยำเป๊ะๆ อาจจะต้อง fetchMyLinks ใหม่ แต่แค่นี้ก็พอถูไถ)

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Link deleted",
          showConfirmButton: false,
          timer: 1500,
        });
      } catch (error) {
        Swal.fire("Error", "Could not delete link.", "error");
      }
    },

    async renewLink(linkId) {
      try {
        const response = await api.patch(`/links/${linkId}`, { renew: true });
        const index = this.myLinks.findIndex((link) => link.id === linkId);
        if (index !== -1) {
          this.myLinks[index] = response.data;
        }

        // รีเฟรชข้อมูลเพื่อให้ Active count อัปเดต (หรือจะคำนวณมือก็ได้)
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
        Swal.fire("Error", "Renew failed.", "error");
      }
    },

    // Action สำหรับอัปเดต Link ใน Store (ใช้โดย Component อื่น)
    updateLinkInStore(updatedLink) {
      const index = this.myLinks.findIndex((l) => l.id === updatedLink.id);
      if (index !== -1) {
        this.myLinks[index] = { ...this.myLinks[index], ...updatedLink };
      }
    },
  },
});
