<script setup>
import { ref, onMounted, computed } from "vue"; // +++ import computed
import {
  ShieldCheck,
  Users,
  Loader2,
  AlertCircle,
  Trash2,
  Search, // +++ import Search icon
} from "lucide-vue-next";
import api from "@/services/api";
import Swal from "sweetalert2";

// --- State ---
const users = ref([]);
const isLoading = ref(true);
const errorMsg = ref(null);
const isUpdating = ref([]);
const isDeleting = ref([]);

// +++ Search State +++
const searchQuery = ref("");

// +++ Filtered Users Logic +++
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

// --- Lifecycle ---
onMounted(() => {
  fetchUsers();
});

// --- API Methods ---
const fetchUsers = async () => {
  isLoading.value = true;
  errorMsg.value = null;
  try {
    const response = await api.get("/admin/users");
    users.value = response.data;
  } catch (error) {
    console.error("Failed to fetch users:", error);
    errorMsg.value = error.response?.data?.message || "Could not load users.";
  } finally {
    isLoading.value = false;
  }
};

const handleUpdateStatus = async (user, newStatus) => {
  const actionText = newStatus ? "Block" : "Unblock";
  isUpdating.value.push(user.id);

  try {
    const response = await api.patch(`/admin/users/${user.id}/status`, {
      isBlocked: newStatus,
    });

    const index = users.value.findIndex((u) => u.id === user.id);
    if (index !== -1) {
      users.value[index] = response.data;
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

const handleDeleteUser = async (userId, userEmail) => {
  const result = await Swal.fire({
    title: "Are you sure?",
    text: `You are about to PERMANENTLY delete: ${userEmail}`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#D33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, delete user",
  });

  if (!result.isConfirmed) return;

  isDeleting.value.push(userId);

  try {
    await api.delete(`/admin/users/${userId}`);
    users.value = users.value.filter((user) => user.id !== userId);

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
    Swal.fire(
      "Error",
      error.response?.data?.message || "Could not delete user.",
      "error"
    );
  } finally {
    isDeleting.value = isDeleting.value.filter((id) => id !== userId);
  }
};

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

<template>
  <div class="container mx-auto px-4 lg:px-8 py-12">
    <div
      class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4"
    >
      <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
        <ShieldCheck class="h-8 w-8 text-indigo-600" />
        User Management
      </h1>

      <div class="relative w-full sm:w-72">
        <div
          class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
        >
          <Search class="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search users by email, role..."
          class="block w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg leading-5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm transition-shadow"
        />
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-20">
      <Loader2 class="h-12 w-12 text-indigo-600 mx-auto animate-spin" />
      <p class="mt-4 text-gray-600">Loading users...</p>
    </div>

    <div
      v-else-if="errorMsg"
      class="text-center py-20 bg-white shadow rounded-lg p-8"
    >
      <AlertCircle class="h-12 w-12 text-red-500 mx-auto" />
      <h3 class="mt-4 text-xl font-bold text-red-700">Failed to load users</h3>
      <p class="mt-2 text-gray-600">{{ errorMsg }}</p>
    </div>

    <div
      v-else-if="filteredUsers.length > 0"
      class="bg-white shadow overflow-hidden rounded-lg border border-gray-200"
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
          <tr
            v-for="user in filteredUsers"
            :key="user.id"
            class="hover:bg-gray-50 transition-colors"
          >
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">
                {{ user.email }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="
                  user.provider === 'GOOGLE'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                "
                class="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full"
              >
                {{ user.provider }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="
                  user.role === 'ADMIN'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
                "
                class="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full"
              >
                {{ user.role }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="
                  user.isBlocked
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                "
                class="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full"
              >
                {{ user.isBlocked ? "Blocked" : "Active" }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(user.createdAt) }}
            </td>
            <td
              class="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-3"
            >
              <button
                @click="handleUpdateStatus(user, !user.isBlocked)"
                :disabled="isUpdating.includes(user.id)"
                :class="[
                  user.isBlocked ? 'bg-gray-300' : 'bg-indigo-600',
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50',
                ]"
                :title="user.isBlocked ? 'Unblock User' : 'Block User'"
              >
                <span
                  :class="user.isBlocked ? 'translate-x-0' : 'translate-x-5'"
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                ></span>
              </button>

              <button
                @click="handleDeleteUser(user.id, user.email)"
                :disabled="isDeleting.includes(user.id)"
                class="text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded-full hover:bg-red-50 transition-colors"
                title="Permanently Delete User"
              >
                <Trash2 v-if="!isDeleting.includes(user.id)" class="h-5 w-5" />
                <Loader2 v-else class="h-5 w-5 animate-spin" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-else
      class="p-12 bg-white border-2 border-dashed border-gray-300 rounded-lg text-center"
    >
      <Users class="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <h3 class="text-lg font-medium text-gray-900">No users found</h3>
      <p class="mt-1 text-sm text-gray-500">
        {{
          searchQuery
            ? `No results matching "${searchQuery}"`
            : "The database is empty or only you exist."
        }}
      </p>
      <button
        v-if="searchQuery"
        @click="searchQuery = ''"
        class="mt-4 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
      >
        Clear search
      </button>
    </div>
  </div>
</template>