<template>
  <div class="container mx-auto px-4 lg:px-8 py-12">
    <!-- 1. Header (ส่วนหัวของ Admin) -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
        <ShieldCheck class="h-8 w-8 text-indigo-600" />
        User Management
      </h1>

      <div class="relative w-full sm:w-64">
        <div
          class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
        >
          <Search class="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search users..."
          class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      <!-- (เราสามารถเพิ่มปุ่ม "Create User" ได้ในอนาคต) -->
    </div>

    <!-- 2. Loading State -->
    <div v-if="isLoading" class="text-center py-20">
      <Loader2 class="h-12 w-12 text-indigo-600 mx-auto animate-spin" />
      <p class="mt-4 text-gray-600">Loading users...</p>
    </div>

    <!-- 3. Error State -->
    <div
      v-else-if="errorMsg"
      class="text-center py-20 bg-white shadow rounded-lg p-8"
    >
      <AlertCircle class="h-12 w-12 text-red-500 mx-auto" />
      <h3 class="mt-4 text-xl font-bold text-red-700">Failed to load users</h3>
      <p class="mt-2 text-gray-600">{{ errorMsg }}</p>
    </div>

    <!-- 4. Main Table (เมื่อ 'users' มีข้อมูล) -->
    <div
      v-else-if="users.length > 0"
      class="bg-white shadow overflow-hidden rounded-lg"
    >
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              User (Email)
            </th>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Provider
            </th>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Role
            </th>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Status
            </th>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Joined On
            </th>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="user in filteredUsers" :key="user.id">
            <!-- Email -->
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">
                {{ user.email }}
              </div>
            </td>
            <!-- Provider -->
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="
                  user.provider === 'GOOGLE'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                "
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
              >
                {{ user.provider }}
              </span>
            </td>
            <!-- Role -->
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="
                  user.role === 'ADMIN'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                "
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
              >
                {{ user.role }}
              </span>
            </td>
            <!-- (ใหม่) Status -->
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="
                  user.isBlocked
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                "
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
              >
                {{ user.isBlocked ? "Blocked" : "Active" }}
              </span>
            </td>
            <!-- Joined On -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(user.createdAt) }}
            </td>
            <!-- (ใหม่) Actions (Block/Delete) -->
            <td
              class="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-4"
            >
              <!-- (ใหม่) Block/Unblock Toggle Switch -->
              <button
                @click="handleUpdateStatus(user, !user.isBlocked)"
                :disabled="isUpdating.includes(user.id)"
                :class="[
                  user.isBlocked ? 'bg-gray-200' : 'bg-indigo-600',
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50',
                ]"
                role="switch"
              >
                <span
                  :class="user.isBlocked ? 'translate-x-0' : 'translate-x-5'"
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                ></span>
              </button>

              <!-- (ใหม่) Delete Button (Action รอง) -->
              <button
                @click="handleDeleteUser(user.id, user.email)"
                :disabled="isDeleting.includes(user.id)"
                class="text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Permanently Delete User"
              >
                <Trash2 v-if="!isDeleting.includes(user.id)" class="h-4 w-4" />
                <Loader2 v-else class="h-4 w-4 animate-spin" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 5. Empty State (เมื่อ 'users' เป็น Array ว่าง) -->
    <div v-else class="p-10 bg-white shadow rounded-lg text-center">
      <Users class="h-12 w-12 text-gray-400 mx-auto" />
      <h3 class="mt-2 text-lg font-medium text-gray-900">
        No other users found
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        The database is empty, or only your admin account exists.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import {
  ShieldCheck,
  Users,
  Loader2,
  AlertCircle,
  Trash2,
  Search,
} from "lucide-vue-next";
import api from "@/services/api";
import Swal from "sweetalert2";

// --- State ---
const users = ref([]);
const isLoading = ref(true);
const errorMsg = ref(null);
const isUpdating = ref([]); // (Array of IDs... เพื่อ Disable ปุ่ม Toggle)
const isDeleting = ref([]); // (Array of IDs... เพื่อ Disable ปุ่ม Delete)
const searchQuery = ref("");

// --- Lifecycle ---
onMounted(() => {
  fetchUsers();
});

// --- API Methods ---

/**
 * (1) Fetch all users
 */
const fetchUsers = async () => {
  isLoading.value = true;
  errorMsg.value = null;
  try {
    // (สำคัญ) เรียก API (Task 4.1)
    const response = await api.get("/admin/users");
    users.value = response.data;
  } catch (error) {
    console.error("Failed to fetch users:", error);
    errorMsg.value = error.response?.data?.message || "Could not load users.";
  } finally {
    isLoading.value = false;
  }
};

/**
 * (2) (ใหม่) Block/Unblock a user
 */
const handleUpdateStatus = async (user, newStatus) => {
  const actionText = newStatus ? "Block" : "Unblock";
  isUpdating.value.push(user.id); // (Disable ปุ่ม Toggle)

  try {
    // (สำคัญ) เรียก API (Task 4.1)
    const response = await api.patch(`/admin/users/${user.id}/status`, {
      isBlocked: newStatus,
    });

    // (สำคัญ) อัปเดต State (Optimistic UI)
    // (หา Index ของ User ใน Array)
    const index = users.value.findIndex((u) => u.id === user.id);
    if (index !== -1) {
      // (อัปเดตข้อมูล User นั้น... โดยเฉพาะ 'isBlocked')
      users.value[index] = response.data;
    }

    // (แจ้งเตือนสำเร็จ)
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `User ${actionText}ed`,
      showConfirmButton: false,
      timer: 1500,
    });
  } catch (error) {
    console.error(`Failed to ${actionText} user:`, error);
    Swal.fire(
      "Error",
      error.response?.data?.message || `Could not ${actionText} user.`,
      "error"
    );
  } finally {
    isUpdating.value = isUpdating.value.filter((id) => id !== user.id);
  }
};

/**
 * (3) (เก็บไว้) Delete a user
 */
const handleDeleteUser = async (userId, userEmail) => {
  // 1. (สำคัญ) ขอคำยืนยันก่อน
  const result = await Swal.fire({
    title: "Are you sure?",
    text: `You are about to PERMANENTLY delete the user: ${userEmail}. This action cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#D33", // (สีแดง)
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, delete this user!",
  });

  if (!result.isConfirmed) {
    return; // ผู้ใช้กดยกเลิก
  }

  // 2. ถ้าผู้ใช้ยืนยัน...
  isDeleting.value.push(userId); // (Disable ปุ่มนี้)

  try {
    // (สำคัญ) เรียก API (Task 4.1)
    await api.delete(`/admin/users/${userId}`);

    // 3. (สำคัญ) อัปเดต State (Optimistic UI)
    users.value = users.value.filter((user) => user.id !== userId);

    // 4. แจ้งเตือนสำเร็จ
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "User deleted",
      showConfirmButton: false,
      timer: 1500,
    });
  } catch (error) {
    console.error("Failed to delete user:", error);
    // (แสดง Error ที่ Backend (Service) โยนมา)
    Swal.fire(
      "Error",
      error.response?.data?.message || "Could not delete user.",
      "error"
    );
  } finally {
    // 5. (สำคัญ) เอา ID ออกจาก Array 'isDeleting'
    isDeleting.value = isDeleting.value.filter((id) => id !== userId);
  }
};

const filteredUsers = computed(() => {
  if (!users.value) return [];
  if (!searchQuery.value) return users.value;

  const query = searchQuery.value.toLowerCase();
  return users.value.filter(
    (user) =>
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      user.provider.toLowerCase().includes(query)
  );
});

// --- Helper ---
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
</script>