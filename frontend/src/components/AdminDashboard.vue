<script setup>
// ... (Script ส่วนเดิม ไม่ต้องแก้ไข) ...
import { ref, onMounted, watch, computed } from "vue";
import {
  ShieldCheck,
  Users,
  Loader2,
  AlertCircle,
  Trash2,
  Search,
  CheckCircle,
  Ban,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Link as LinkIcon,
  UserCheck,
  UserX,
} from "lucide-vue-next";
import api from "@/services/api";
import Swal from "sweetalert2";

// Import Modals
import SetLimitModal from "@/components/SetLimitModal.vue";
import AdminUserLinksModal from "@/components/AdminUserLinksModal.vue";

// --- State ---
const users = ref([]);
const pagination = ref({ page: 1, totalPages: 1, total: 0 });
const isLoading = ref(true);
const errorMsg = ref(null);
const isUpdating = ref([]);
const isDeleting = ref([]);
const searchQuery = ref("");
let searchTimeout = null;

// --- Modal States ---
const isLimitModalOpen = ref(false);
const isLinksModalOpen = ref(false);
const selectedUser = ref(null);
const isSavingLimit = ref(false);

// [Modified] Computed Stats (คำนวณจากหน้าปัจจุบัน + Total)
const totalUsers = computed(() => pagination.value.total || 0);
// หมายเหตุ: Active/Blocked นับจากหน้าปัจจุบันเป็นตัวอย่าง
const activeUsersCount = computed(
  () => users.value.filter((u) => !u.isBlocked).length
);
const blockedUsersCount = computed(
  () => users.value.filter((u) => u.isBlocked).length
);

// --- Lifecycle ---
onMounted(() => {
  fetchUsers();
});

// --- Search Logic ---
watch(searchQuery, (newVal) => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    fetchUsers(1, newVal);
  }, 500);
});

// --- API Methods ---
const fetchUsers = async (page = 1, search = searchQuery.value) => {
  isLoading.value = true;
  errorMsg.value = null;
  try {
    const response = await api.get("/admin/users", {
      params: { page, limit: 10, search },
    });
    users.value = response.data.users || [];
    pagination.value = response.data.meta || {
      page: 1,
      totalPages: 1,
      total: 0,
    };
  } catch (error) {
    errorMsg.value = error.message || "Could not load users.";
  } finally {
    isLoading.value = false;
  }
};

const changePage = (newPage) => {
  if (newPage < 1 || newPage > pagination.value.totalPages) return;
  fetchUsers(newPage);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const handleUpdateStatus = async (user, newStatus) => {
  isUpdating.value.push(user.id);
  try {
    const response = await api.patch(`/admin/users/${user.id}/status`, {
      isBlocked: newStatus,
    });
    // Update local state
    const index = users.value.findIndex((u) => u.id === user.id);
    if (index !== -1) users.value[index] = response.data;

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `User ${newStatus ? "Blocked" : "Unblocked"}`,
      showConfirmButton: false,
      timer: 1500,
    });
  } catch (error) {
    // Error handled by api.js interceptor (show alert)
  } finally {
    isUpdating.value = isUpdating.value.filter((id) => id !== user.id);
  }
};

const handleDeleteUser = async (userId, userEmail) => {
  const result = await Swal.fire({
    title: "Delete User?",
    text: `Permanently delete ${userEmail}? This will remove all their links.`,
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
    // Refresh list (ถ้าลบคนสุดท้ายของหน้า ให้ถอยไปหน้าก่อนหน้า)
    if (users.value.length === 1 && pagination.value.page > 1) {
      fetchUsers(pagination.value.page - 1);
    } else {
      fetchUsers(pagination.value.page);
    }
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "User deleted",
      showConfirmButton: false,
      timer: 1500,
    });
  } catch (error) {
    // Error handled by api.js
  } finally {
    isDeleting.value = isDeleting.value.filter((id) => id !== userId);
  }
};

// --- Modal Handlers ---
const handleEditLimit = (user) => {
  selectedUser.value = user;
  isLimitModalOpen.value = true;
};
const handleViewLinks = (user) => {
  selectedUser.value = user;
  isLinksModalOpen.value = true;
};

const onSaveLimit = async (newLimit) => {
  if (!selectedUser.value) return;
  isSavingLimit.value = true;
  try {
    const response = await api.patch(
      `/admin/users/${selectedUser.value.id}/limit`,
      { limit: parseInt(newLimit) }
    );
    const index = users.value.findIndex((u) => u.id === selectedUser.value.id);
    if (index !== -1) users.value[index].linkLimit = response.data.linkLimit;

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Limit updated",
      showConfirmButton: false,
      timer: 1500,
    });
    isLimitModalOpen.value = false;
  } catch (error) {
    // Error handled by api.js
  } finally {
    isSavingLimit.value = false;
  }
};

// Helpers
const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
const getUserInitials = (email) =>
  email ? email.substring(0, 2).toUpperCase() : "U";
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
            <ShieldCheck class="h-8 w-8 text-indigo-600" /> User Management
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
            v-model="searchQuery"
            type="text"
            placeholder="Search users..."
            class="block w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div
          class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div class="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Total Users</p>
            <p class="text-2xl font-bold text-gray-900">{{ totalUsers }}</p>
          </div>
        </div>
        <div
          class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div class="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Active (Page)</p>
            <p class="text-2xl font-bold text-gray-900">
              {{ activeUsersCount }}
            </p>
          </div>
        </div>
        <div
          class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div class="p-3 bg-red-50 text-red-600 rounded-xl">
            <UserX class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Blocked (Page)</p>
            <p class="text-2xl font-bold text-gray-900">
              {{ blockedUsersCount }}
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="isLoading"
        class="py-20 flex flex-col items-center justify-center"
      >
        <Loader2 class="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p class="text-gray-500 font-medium">Loading users...</p>
      </div>

      <div v-else>
        <div
          v-if="users.length === 0"
          class="py-16 text-center bg-white border-2 border-dashed border-gray-200 rounded-3xl"
        >
          <Users class="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 class="text-lg font-medium text-gray-900">No users found</h3>
          <p class="text-gray-500 mt-1" v-if="searchQuery">
            No results for "{{ searchQuery }}"
          </p>
        </div>

        <div v-else>
          <div
            class="hidden md:block bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden"
          >
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50/50">
                  <tr>
                    <th
                      class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase"
                    >
                      User
                    </th>
                    <th
                      class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase"
                    >
                      Role
                    </th>
                    <th
                      class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase"
                    >
                      Limit
                    </th>
                    <th
                      class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase"
                    >
                      Status
                    </th>
                    <th
                      class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase"
                    >
                      Joined
                    </th>
                    <th
                      class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr
                    v-for="user in users"
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
                          <div class="text-xs text-gray-500 capitalize">
                            {{ user.provider.toLowerCase() }}
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
                        >{{ user.role }}</span
                      >
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div
                        class="text-sm font-bold text-gray-900 flex items-center gap-1"
                      >
                        {{ user.linkLimit || 10 }}
                        <span class="text-xs font-normal text-gray-500"
                          >links</span
                        >
                      </div>
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
                    <td
                      class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                    >
                      {{ formatDate(user.createdAt) }}
                    </td>
                    <td
                      class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                    >
                      <div class="flex items-center justify-end gap-2">
                        <button
                          @click="handleViewLinks(user)"
                          class="p-2 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                          title="View User Links"
                        >
                          <LinkIcon class="w-4 h-4" />
                        </button>
                        <button
                          @click="handleEditLimit(user)"
                          class="p-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                          title="Set Link Limit"
                        >
                          <Gauge class="w-4 h-4" />
                        </button>
                        <button
                          @click="handleUpdateStatus(user, !user.isBlocked)"
                          :disabled="isUpdating.includes(user.id)"
                          class="p-2 rounded-lg transition-colors border"
                          :class="
                            user.isBlocked
                              ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                              : 'text-orange-500 border-orange-200 hover:bg-orange-50'
                          "
                        >
                          <Loader2
                            v-if="isUpdating.includes(user.id)"
                            class="w-4 h-4 animate-spin"
                          />
                          <template v-else>
                            <CheckCircle
                              v-if="user.isBlocked"
                              class="w-4 h-4"
                            />
                            <Ban v-else class="w-4 h-4" />
                          </template>
                        </button>
                        <button
                          @click="handleDeleteUser(user.id, user.email)"
                          :disabled="isDeleting.includes(user.id)"
                          class="p-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="md:hidden grid grid-cols-1 gap-4">
            <div
              v-for="user in users"
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
                    <p class="text-xs text-gray-500 capitalize">
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
                  >{{ user.role }}</span
                >
              </div>
              <div
                class="flex items-center justify-between text-sm text-gray-500 py-2 border-t border-b border-gray-50"
              >
                <div class="flex items-center gap-2">
                  <Gauge class="w-4 h-4 text-gray-400" /><span
                    class="font-medium text-gray-900"
                    >{{ user.linkLimit || 10 }}</span
                  >
                  links
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
                    >{{ user.isBlocked ? "Blocked" : "Active" }}</span
                  >
                </div>
              </div>
              <div class="grid grid-cols-4 gap-2">
                <button
                  @click="handleViewLinks(user)"
                  class="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-indigo-200 text-indigo-600 bg-indigo-50 text-sm font-medium active:scale-95 transition-all"
                >
                  Links
                </button>
                <button
                  @click="handleEditLimit(user)"
                  class="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-200 text-blue-600 bg-blue-50 text-sm font-medium active:scale-95 transition-all"
                >
                  Limit
                </button>
                <button
                  @click="handleUpdateStatus(user, !user.isBlocked)"
                  :disabled="isUpdating.includes(user.id)"
                  class="flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all active:scale-95"
                  :class="
                    user.isBlocked
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-orange-50 text-orange-700 border-orange-200'
                  "
                >
                  {{ user.isBlocked ? "Unblock" : "Block" }}
                </button>
                <button
                  @click="handleDeleteUser(user.id, user.email)"
                  :disabled="isDeleting.includes(user.id)"
                  class="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 bg-red-50 text-sm font-medium transition-all active:scale-95"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="pagination.totalPages > 1"
          class="mt-8 flex justify-center items-center gap-4"
        >
          <button
            @click="changePage(pagination.page - 1)"
            :disabled="pagination.page <= 1"
            class="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 disabled:opacity-50"
          >
            <ChevronLeft class="h-5 w-5" />
          </button>
          <span
            class="text-sm font-medium text-gray-600 bg-white px-4 py-2 rounded-xl border border-gray-200"
            >Page {{ pagination.page }} of {{ pagination.totalPages }}</span
          >
          <button
            @click="changePage(pagination.page + 1)"
            :disabled="pagination.page >= pagination.totalPages"
            class="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 disabled:opacity-50"
          >
            <ChevronRight class="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <SetLimitModal
        v-model="isLimitModalOpen"
        :user="selectedUser"
        :is-loading="isSavingLimit"
        @save="onSaveLimit"
      />
      <AdminUserLinksModal v-model="isLinksModalOpen" :user="selectedUser" />
    </Teleport>
  </div>
</template>