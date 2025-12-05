import { defineStore } from "pinia";
import api from "@/services/api";
import Swal from "sweetalert2";
import { APP_CONFIG } from "@/config/constants";

export const useAdminStore = defineStore("admin", {
  state: () => ({
    users: [],
    stats: { total: 0, active: 0, blocked: 0 },
    pagination: {
      page: 1,
      pageSize: 10,
      totalPages: 1,
      totalItems: 0,
    },
    isLoading: false,
  }),
  actions: {
    // Fetch Users
    async fetchUsers(page = 1, limit = 10, search = "", status = "ALL") {
      this.isLoading = true;
      try {
        const response = await api.get("/admin/users", {
          params: { page, limit, search, status },
        });
        this.users = response.data.data || [];
        this.pagination = response.data.meta;
        this.stats = response.data.stats;
      } catch (error) {
        console.error("Failed to fetch users:", error);
        this.users = [];
      } finally {
        this.isLoading = false;
      }
    },
    // Toggle Block Status
    async toggleUserBlock(user) {
      const newBlockedStatus = !user.isBlocked;
      const actionText = newBlockedStatus ? "Block" : "Unblock";

      const result = await Swal.fire({
        title: `${actionText} this user?`,
        text: `Are you sure you want to ${actionText.toLowerCase()} user ${
          user.email
        }?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: newBlockedStatus ? "#f87171" : "#34d399",
        confirmButtonText: actionText,
      });

      if (result.isConfirmed) {
        try {
          const response = await api.patch(`/admin/users/${user.id}/status`, {
            isBlocked: newBlockedStatus,
          });

          // Update Local State
          const index = this.users.findIndex((u) => u.id === user.id);
          if (index !== -1) {
            this.users[index].isBlocked = response.data.isBlocked;

            // Update Stats (Optimistic)
            if (response.data.isBlocked) {
              this.stats.active--;
              this.stats.blocked++;
            } else {
              this.stats.active++;
              this.stats.blocked--;
            }
          }

          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: `User ${actionText}ed`,
            showConfirmButton: false,
            timer: 1500,
          });
        } catch (error) {
          // Error handled by interceptor
        }
      }
    },
    // Delete User
    async deleteUser(user) {
      const result = await Swal.fire({
        title: "Delete User",
        text: `Permanently delete ${user.email}? This cannot be undone.`,
        icon: "error",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        confirmButtonText: "Yes, delete it!",
      });

      if (result.isConfirmed) {
        try {
          await api.delete(`/admin/users/${user.id}`);

          // Update Local State
          this.users = this.users.filter((u) => u.id !== user.id);
          this.stats.total--;
          if (user.isBlocked) this.stats.blocked--;
          else this.stats.active--;

          Swal.fire("Deleted!", "User has been deleted.", "success");
        } catch (error) {
          // Error handled
        }
      }
    },
    // Change Role
    async changeUserRole(user, newRole) {
      try {
        const response = await api.patch(`/admin/users/${user.id}/role`, {
          role: newRole,
        });

        const index = this.users.findIndex((u) => u.id === user.id);
        if (index !== -1) {
          this.users[index].role = response.data.role;
        }

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Role Updated",
          showConfirmButton: false,
          timer: 1500,
        });
      } catch (error) {
        // Error handled
      }
    },

    // Update User Limit
    async updateUserLimit(user, newLimit) {
      try {
        const response = await api.patch(`/admin/users/${user.id}/limit`, {
          limit: newLimit,
        });

        // Update Local State (Optimistic UI)
        const index = this.users.findIndex((u) => u.id === user.id);
        if (index !== -1) {
          this.users[index].linkLimit = response.data.linkLimit;
        }

        // Success Feedback
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Limit updated successfully",
          showConfirmButton: false,
          timer: 1500,
        });

        return true; // ส่งค่า true กลับไปบอก View ว่าสำเร็จ
      } catch (error) {
        // Error handled by interceptor
        return false;
      }
    },
  },
});
