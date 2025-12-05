<script setup>
// Vue Core
import { onMounted, onUnmounted, ref, watch, computed } from "vue";
import Swal from "sweetalert2";
// Stores
import { useAuthStore } from "@/stores/useAuthStore";
import { useAdminStore } from "@/stores/useAdminStore";
// Config
import { APP_CONFIG } from "@/config/constants";
// Components
import SetLimitModal from "@/components/SetLimitModal.vue";
import AdminUserLinksModal from "@/components/AdminUserLinksModal.vue";
// Icons
import {
  Users,
  Filter,
  Search,
  RefreshCw,
  Trash2,
  CheckCircle2,
  UserX,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Ban,
  Unplug,
  Settings,
  ShieldCheck,
  Link as LinkIcon,
} from "lucide-vue-next";

// -------------------------------------------------------------------
// Setup & State Management
// -------------------------------------------------------------------
const authStore = useAuthStore();
const adminStore = useAdminStore();

// UI States
const searchQuery = ref("");
const filterStatus = ref("ALL"); // Enum: ALL, ACTIVE, BLOCKED
let searchTimeout = null;

// Dropdown State
const isFilterOpen = ref(false);
const filterDropdownRef = ref(null);

// Modal States
const isSetLimitModalOpen = ref(false);
const isAdminUserLinksModalOpen = ref(false);
const selectedUser = ref(null);
const isSavingLimit = ref(false); // For loading state in SetLimitModal

// -------------------------------------------------------------------
// Computed Properties
// -------------------------------------------------------------------
const refreshIconClasses = computed(() => ({
  "animate-spin": adminStore.isLoading,
}));

const filterOptions = [
  { value: "ALL", label: "All Users", icon: Users, iconClass: "text-gray-400" },
  {
    value: "ACTIVE",
    label: "Active",
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
  },
  {
    value: "BLOCKED",
    label: "Blocked",
    icon: UserX,
    iconClass: "text-red-500",
  },
];

const currentFilterLabel = computed(
  () =>
    filterOptions.find((o) => o.value === filterStatus.value)?.label ||
    "All Users"
);

// -------------------------------------------------------------------
// Methods & Actions
// -------------------------------------------------------------------
// --- Data Fetching ---
const loadData = (page = adminStore.pagination.page) => {
  // Security Check
  if (authStore.user?.role !== APP_CONFIG.USER_ROLES.ADMIN) return;

  adminStore.fetchUsers(
    page,
    adminStore.pagination.pageSize,
    searchQuery.value,
    filterStatus.value
  );
};

const handleRefresh = () => loadData(adminStore.pagination.page);

const changePage = (newPage) => {
  if (newPage < 1 || newPage > adminStore.pagination.totalPages) return;
  loadData(newPage);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// --- Filtering & Search ---
const clearFiltersAndSearch = () => {
  searchQuery.value = "";
  filterStatus.value = "ALL";
  isFilterOpen.value = false;
};

const handleSelectFilter = (value) => {
  filterStatus.value = value;
  isFilterOpen.value = false;
};

const closeFilterDropdown = (e) => {
  if (filterDropdownRef.value && !filterDropdownRef.value.contains(e.target)) {
    isFilterOpen.value = false;
  }
};

// --- Helpers ---
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getUserInitials = (email) => {
  if (!email) return "U";
  const parts = email.split("@")[0].split(".");
  if (parts.length > 1 && parts[0].length > 0 && parts[1].length > 0) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
};

// --- User Actions ---
const handleChangeRole = (user) => {
  // Toggle Role
  const newRole =
    user.role === APP_CONFIG.USER_ROLES.ADMIN
      ? APP_CONFIG.USER_ROLES.USER
      : APP_CONFIG.USER_ROLES.ADMIN;

  adminStore.changeUserRole(user, newRole);
};

// --- Modals ---
const handleSetLimit = (user) => {
  selectedUser.value = user;
  isSetLimitModalOpen.value = true;
};

const handleViewLinks = (user) => {
  selectedUser.value = user;
  isAdminUserLinksModalOpen.value = true;
};

const handleSaveLimit = async (newLimit) => {
  if (!selectedUser.value) return;

  isSavingLimit.value = true; // เริ่มโหลด (หมุนติ้วๆ ที่ปุ่ม)

  try {
    // เรียก Action จาก Store
    const success = await adminStore.updateUserLimit(
      selectedUser.value,
      newLimit
    );

    if (success) {
      // ถ้าสำเร็จ ให้ปิด Modal
      isSetLimitModalOpen.value = false;
    }
  } finally {
    isSavingLimit.value = false; // หยุดโหลด
  }
};

// -------------------------------------------------------------------
// Watchers & Lifecycle
// -------------------------------------------------------------------
watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => loadData(1), 500); // Debounce
});

watch(filterStatus, () => loadData(1));

onMounted(() => {
  loadData();
  document.addEventListener("click", closeFilterDropdown);
});

onUnmounted(() => {
  document.removeEventListener("click", closeFilterDropdown);
});
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-gray-50/50 pb-24">
    <div
      v-if="
        !authStore.user || authStore.user.role !== APP_CONFIG.USER_ROLES.ADMIN
      "
      class="flex flex-col items-center justify-center h-[60vh]"
    >
      <Loader2 class="h-10 w-10 text-indigo-600 animate-spin mb-4" />
      <p class="text-gray-500 font-medium">
        Loading admin dashboard or access denied...
      </p>
    </div>

    <div v-else class="container mx-auto px-4 lg:px-8 py-10">
      <div
        class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1
            class="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3 tracking-tight"
          >
            <ShieldCheck class="h-7 w-7 sm:h-8 sm:w-8 text-indigo-600" />
            User Management
          </h1>
          <p class="text-gray-500 text-sm sm:text-base mt-1">
            Manage all users, block/unblock, and set link limits.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div class="relative min-w-[160px] z-20" ref="filterDropdownRef">
            <button
              @click="isFilterOpen = !isFilterOpen"
              class="w-full h-[46px] flex items-center justify-between px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:border-indigo-300 hover:ring-4 hover:ring-indigo-500/10 transition-all focus:outline-none focus:border-indigo-500 active:scale-[0.98]"
            >
              <div class="flex items-center gap-2.5 truncate">
                <Filter class="h-4 w-4 text-gray-400 shrink-0" />
                <span class="truncate">{{ currentFilterLabel }}</span>
              </div>
              <ChevronDown
                :class="[
                  'h-4 w-4 text-gray-400 transition-transform duration-200 shrink-0 ml-2',
                  isFilterOpen ? 'rotate-180' : '',
                ]"
              />
            </button>

            <transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="translate-y-1 opacity-0 scale-95"
              enter-to-class="translate-y-0 opacity-100 scale-100"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="translate-y-0 opacity-100 scale-100"
              leave-to-class="translate-y-1 opacity-0 scale-95"
            >
              <div
                v-if="isFilterOpen"
                class="absolute left-0 top-full mt-2 w-full min-w-[180px] bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden ring-1 ring-black/5"
              >
                <div class="p-1.5 space-y-0.5">
                  <button
                    v-for="option in filterOptions"
                    :key="option.value"
                    @click="handleSelectFilter(option.value)"
                    :class="[
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                      filterStatus === option.value
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    ]"
                  >
                    <component
                      :is="option.icon"
                      class="h-4 w-4 shrink-0"
                      :class="option.iconClass"
                    />
                    {{ option.label }}
                    <Check
                      v-if="filterStatus === option.value"
                      class="ml-auto h-3.5 w-3.5 text-indigo-600"
                    />
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <div class="relative group flex-1 md:w-64 z-10">
            <div
              class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
            >
              <Search
                class="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors"
              />
            </div>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search users..."
              class="block w-full h-[46px] pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm transition-all placeholder-gray-400 text-gray-900"
            />
          </div>

          <div class="flex gap-2 z-10">
            <button
              @click="handleRefresh"
              :disabled="adminStore.isLoading"
              class="h-[46px] w-[46px] flex items-center justify-center bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 hover:border-indigo-300 hover:ring-4 hover:ring-indigo-500/10 shadow-sm active:scale-95 transition-all disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw class="h-5 w-5" :class="refreshIconClasses" />
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div
          @click="filterStatus = 'ALL'"
          class="bg-white p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 group"
          :class="
            filterStatus === 'ALL'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
              : 'border-gray-100 shadow-sm hover:border-indigo-200'
          "
        >
          <div
            class="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform"
          >
            <Users class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Total Users</p>
            <p class="text-2xl font-bold text-gray-900">
              {{ adminStore.stats.total }}
            </p>
          </div>
        </div>
        <div
          @click="filterStatus = 'ACTIVE'"
          class="bg-white p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 group"
          :class="
            filterStatus === 'ACTIVE'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
              : 'border-gray-100 shadow-sm hover:border-emerald-200'
          "
        >
          <div
            class="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform"
          >
            <CheckCircle2 class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Active Users</p>
            <p class="text-2xl font-bold text-gray-900">
              {{ adminStore.stats.active }}
            </p>
          </div>
        </div>
        <div
          @click="filterStatus = 'BLOCKED'"
          class="bg-white p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 group"
          :class="
            filterStatus === 'BLOCKED'
              ? 'border-red-500 ring-2 ring-red-500/20 shadow-md'
              : 'border-gray-100 shadow-sm hover:border-red-200'
          "
        >
          <div
            class="p-3 bg-red-50 text-red-600 rounded-xl group-hover:scale-110 transition-transform"
          >
            <UserX class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Blocked Users</p>
            <p class="text-2xl font-bold text-gray-900">
              {{ adminStore.stats.blocked }}
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="!adminStore.users.length && !adminStore.isLoading"
        class="py-20 text-center bg-white border-2 border-dashed border-gray-200 rounded-3xl"
      >
        <Users class="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p class="text-lg font-medium text-gray-900 mb-2">
          No users found matching your criteria.
        </p>
        <p class="text-gray-500 mb-4">
          Try adjusting your search query or filters.
        </p>
        <button
          v-if="searchQuery || filterStatus !== 'ALL'"
          @click="clearFiltersAndSearch"
          class="inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 font-medium rounded-xl hover:bg-indigo-100 transition-colors"
        >
          Clear Search & Filters
        </button>
      </div>

      <div
        v-else
        class="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
      >
        <div class="overflow-x-auto min-h-[300px]">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  User (Provider)
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  Role
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  Links (Limit)
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  Joined At
                </th>
                <th
                  class="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody
              v-if="adminStore.isLoading"
              class="bg-white divide-y divide-gray-100"
            >
              <tr>
                <td colspan="6" class="p-10 text-center text-gray-500">
                  <Loader2
                    class="h-8 w-8 text-indigo-500 animate-spin mx-auto mb-3"
                  />Loading users...
                </td>
              </tr>
            </tbody>

            <tbody v-else class="bg-white divide-y divide-gray-100">
              <tr
                v-for="user in adminStore.users"
                :key="user.id"
                class="hover:bg-gray-50 transition-colors"
                :class="{ 'bg-red-50/50': user.isBlocked }"
              >
                <td class="px-6 py-4 whitespace-nowrap text-left">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div
                        class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm border border-indigo-200"
                      >
                        {{ getUserInitials(user.email) }}
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ user.email }}
                      </div>
                      <div class="text-xs text-gray-500 capitalize">
                        Provider: {{ user.provider.toLowerCase() }}
                      </div>
                    </div>
                  </div>
                </td>

                <td class="px-6 py-4 whitespace-nowrap text-left">
                  <button
                    @click="handleChangeRole(user)"
                    :disabled="user.id === authStore.user.id"
                    :class="[
                      'px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full transition-all active:scale-95',
                      user.role === APP_CONFIG.USER_ROLES.ADMIN
                        ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                        : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
                    ]"
                    title="Click to toggle role"
                  >
                    {{ user.role }}
                  </button>
                </td>

                <td class="px-6 py-4 whitespace-nowrap text-left">
                  <span
                    :class="[
                      'px-3 inline-flex text-xs leading-5 font-semibold rounded-full items-center gap-1',
                      user.isBlocked
                        ? 'bg-red-100 text-red-800'
                        : 'bg-emerald-100 text-emerald-800',
                    ]"
                  >
                    <UserX v-if="user.isBlocked" class="h-3 w-3" />
                    <Check v-else class="h-3 w-3" />
                    {{ user.isBlocked ? "Blocked" : "Active" }}
                  </span>
                </td>

                <td
                  class="px-6 py-4 whitespace-nowrap text-left text-sm font-medium text-gray-500"
                >
                  {{ user._count.links }}
                  <span class="text-gray-400">/ {{ user.linkLimit }}</span>
                </td>

                <td
                  class="px-6 py-4 whitespace-nowrap text-left text-sm text-gray-500"
                >
                  {{ formatDate(user.createdAt) }}
                </td>

                <td
                  class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium"
                >
                  <div class="flex justify-center space-x-2">
                    <button
                      @click="handleViewLinks(user)"
                      class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="View User Links"
                    >
                      <LinkIcon class="h-4 w-4" />
                    </button>
                    <button
                      @click="handleSetLimit(user)"
                      class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Set Link Limit"
                    >
                      <Settings class="h-4 w-4" />
                    </button>
                    <button
                      @click="adminStore.toggleUserBlock(user)"
                      :disabled="user.role === APP_CONFIG.USER_ROLES.ADMIN"
                      :class="[
                        'p-2 rounded-lg transition-colors',
                        user.isBlocked
                          ? 'text-emerald-500 hover:bg-emerald-50'
                          : 'text-red-500 hover:bg-red-50',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                      ]"
                      :title="user.isBlocked ? 'Unblock' : 'Block'"
                    >
                      <component
                        :is="user.isBlocked ? Unplug : Ban"
                        class="h-4 w-4"
                      />
                    </button>
                    <button
                      @click="adminStore.deleteUser(user)"
                      :disabled="user.role === APP_CONFIG.USER_ROLES.ADMIN"
                      class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete User"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        v-if="adminStore.pagination.totalPages > 1 && !adminStore.isLoading"
        class="mt-10 flex justify-center items-center gap-4"
      >
        <button
          @click="changePage(adminStore.pagination.page - 1)"
          :disabled="adminStore.pagination.page <= 1"
          class="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
        >
          <ChevronLeft class="h-5 w-5" />
        </button>
        <span
          class="text-sm font-medium text-gray-600 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm"
          >Page {{ adminStore.pagination.page }} of
          {{ adminStore.pagination.totalPages }}</span
        >
        <button
          @click="changePage(adminStore.pagination.page + 1)"
          :disabled="
            adminStore.pagination.page >= adminStore.pagination.totalPages
          "
          class="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
        >
          <ChevronRight class="h-5 w-5" />
        </button>
      </div>
    </div>

    <Teleport to="body">
      <SetLimitModal
        v-model="isSetLimitModalOpen"
        :user="selectedUser"
        :is-loading="isSavingLimit"
        @save="handleSaveLimit"
      />
      <AdminUserLinksModal
        v-model="isAdminUserLinksModalOpen"
        :user="selectedUser"
      />
    </Teleport>
  </div>
</template>