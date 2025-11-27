<script setup>
import { ref, onMounted, computed } from "vue";
import {
  ShieldCheck,
  Users,
  Loader2,
  AlertCircle,
  Trash2,
  Search,
  MoreVertical,
  CheckCircle,
  Ban,
  Mail,
  Calendar,
} from "lucide-vue-next";
import api from "@/services/api";
import Swal from "sweetalert2";

// --- State ---
const users = ref([]);
const isLoading = ref(true);
const errorMsg = ref(null);
const isUpdating = ref([]);
const isDeleting = ref([]);
const searchQuery = ref("");

// --- Computed ---
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
    title: "Delete User?",
    text: `This will permanently delete ${userEmail} and all their links.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, delete",
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
    Swal.fire(
      "Error",
      error.response?.data?.message || "Could not delete user.",
      "error"
    );
  } finally {
    isDeleting.value = isDeleting.value.filter((id) => id !== userId);
  }
};

// --- Helpers ---
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getUserInitials = (email) => {
  if (!email) return "U";
  return email.substring(0, 2).toUpperCase();
};
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-gray-50/50 pb-24">
    <div class="container mx-auto px-4 lg:px-8 py-10">
      <div
        class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8"
      >
        <div>
          <h1
            class="text-3xl font-bold text-gray-900 flex items-center gap-3 tracking-tight"
          >
            <ShieldCheck class="h-8 w-8 text-indigo-600" />
            User Management
          </h1>
          <p class="text-gray-500 mt-2">
            Control user access and manage accounts.
          </p>
        </div>

        <div class="relative w-full md:w-72">
          <div
            class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
          >
            <Search
              class="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors"
            />
          </div>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search users..."
            class="block w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>
      </div>

      <div
        v-if="isLoading"
        class="py-20 flex flex-col items-center justify-center"
      >
        <Loader2 class="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p class="text-gray-500 font-medium">Loading users...</p>
      </div>

      <div
        v-else-if="errorMsg"
        class="py-16 text-center bg-white shadow-sm rounded-3xl border border-red-100"
      >
        <AlertCircle class="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 class="text-lg font-bold text-red-700">Failed to load users</h3>
        <p class="text-gray-600 mt-1">{{ errorMsg }}</p>
      </div>

      <div v-else>
        <div
          v-if="filteredUsers.length === 0"
          class="py-16 text-center bg-white border-2 border-dashed border-gray-200 rounded-3xl"
        >
          <Users class="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 class="text-lg font-medium text-gray-900">No users found</h3>
          <p class="text-gray-500 mt-1">
            {{
              searchQuery
                ? `No results for "${searchQuery}"`
                : "Database is empty."
            }}
          </p>
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="mt-4 text-indigo-600 font-medium hover:underline"
          >
            Clear search
          </button>
        </div>

        <div v-else>
          <div
            class="hidden md:block bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden"
          >
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50/50">
                <tr>
                  <th
                    class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    User
                  </th>
                  <th
                    class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Role
                  </th>
                  <th
                    class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Joined
                  </th>
                  <th
                    class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  v-for="user in filteredUsers"
                  :key="user.id"
                  class="hover:bg-gray-50/50 transition-colors"
                >
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div
                        class="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-200 shrink-0"
                      >
                        {{ getUserInitials(user.email) }}
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">
                          {{ user.email }}
                        </div>
                        <div
                          class="text-xs text-gray-500 flex items-center gap-1 mt-0.5"
                        >
                          <span class="capitalize">{{
                            user.provider.toLowerCase()
                          }}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border"
                      :class="
                        user.role === 'ADMIN'
                          ? 'bg-purple-50 text-purple-700 border-purple-100'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      "
                    >
                      {{ user.role }}
                    </span>
                  </td>

                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border items-center gap-1.5"
                      :class="
                        user.isBlocked
                          ? 'bg-red-50 text-red-700 border-red-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      "
                    >
                      <span
                        class="w-1.5 h-1.5 rounded-full"
                        :class="
                          user.isBlocked ? 'bg-red-500' : 'bg-emerald-500'
                        "
                      ></span>
                      {{ user.isBlocked ? "Blocked" : "Active" }}
                    </span>
                  </td>

                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ formatDate(user.createdAt) }}
                  </td>

                  <td
                    class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                  >
                    <div class="flex items-center justify-end gap-2">
                      <button
                        @click="handleUpdateStatus(user, !user.isBlocked)"
                        :disabled="isUpdating.includes(user.id)"
                        class="p-2 rounded-lg transition-colors border"
                        :class="
                          user.isBlocked
                            ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                            : 'text-orange-500 border-orange-200 hover:bg-orange-50'
                        "
                        :title="user.isBlocked ? 'Unblock User' : 'Block User'"
                      >
                        <CheckCircle v-if="user.isBlocked" class="w-4 h-4" />
                        <Ban v-else class="w-4 h-4" />
                      </button>

                      <button
                        @click="handleDeleteUser(user.id, user.email)"
                        :disabled="isDeleting.includes(user.id)"
                        class="p-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Delete User"
                      >
                        <Loader2
                          v-if="isDeleting.includes(user.id)"
                          class="w-4 h-4 animate-spin"
                        />
                        <Trash2 v-else class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="md:hidden grid grid-cols-1 gap-4">
            <div
              v-for="user in filteredUsers"
              :key="user.id"
              class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4"
            >
              <div class="flex justify-between items-start">
                <div class="flex items-center gap-3">
                  <div
                    class="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-200"
                  >
                    {{ getUserInitials(user.email) }}
                  </div>
                  <div>
                    <p class="text-sm font-bold text-gray-900">
                      {{ user.email }}
                    </p>
                    <p
                      class="text-xs text-gray-500 capitalize flex items-center gap-1"
                    >
                      {{ user.provider.toLowerCase() }}
                    </p>
                  </div>
                </div>
                <span
                  class="px-2 py-1 text-[10px] font-bold uppercase rounded-md border"
                  :class="
                    user.role === 'ADMIN'
                      ? 'bg-purple-50 text-purple-700 border-purple-100'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  "
                >
                  {{ user.role }}
                </span>
              </div>

              <div
                class="flex items-center justify-between text-sm text-gray-500 py-2 border-t border-b border-gray-50"
              >
                <div class="flex items-center gap-2">
                  <Calendar class="w-4 h-4 text-gray-400" />
                  <span>{{ formatDate(user.createdAt) }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="w-2 h-2 rounded-full"
                    :class="user.isBlocked ? 'bg-red-500' : 'bg-emerald-500'"
                  ></span>
                  <span
                    :class="
                      user.isBlocked
                        ? 'text-red-600 font-medium'
                        : 'text-emerald-600 font-medium'
                    "
                  >
                    {{ user.isBlocked ? "Blocked" : "Active" }}
                  </span>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <button
                  @click="handleUpdateStatus(user, !user.isBlocked)"
                  :disabled="isUpdating.includes(user.id)"
                  class="flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all active:scale-95"
                  :class="
                    user.isBlocked
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                  "
                >
                  <CheckCircle v-if="user.isBlocked" class="w-4 h-4" />
                  <Ban v-else class="w-4 h-4" />
                  <span>{{ user.isBlocked ? "Unblock" : "Block" }}</span>
                </button>

                <button
                  @click="handleDeleteUser(user.id, user.email)"
                  :disabled="isDeleting.includes(user.id)"
                  class="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50 font-medium text-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  <Loader2
                    v-if="isDeleting.includes(user.id)"
                    class="w-4 h-4 animate-spin"
                  />
                  <Trash2 v-else class="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>