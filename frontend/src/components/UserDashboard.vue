<script setup>
import { onMounted, computed, ref } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";
import api from "@/services/api";
import Swal from "sweetalert2";
import {
  Loader2,
  Link2,
  Calendar,
  Plus,
  RefreshCw,
  Search,
  Copy,
  BarChart2,
  Trash2,
  Clock,
  Pencil,
  QrCode,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
} from "lucide-vue-next";
import ResultModal from "@/components/ResultModal.vue";
import EditLinkModal from "@/components/EditLinkModal.vue"; // Import Modal ใหม่

const authStore = useAuthStore();
const isRenewing = ref(false);
const isDeleting = ref(false);
const isToggling = ref(false); // State สำหรับปุ่ม Disable
const isRefreshing = ref(false);
const searchQuery = ref("");

// Modals State
const isResultModalOpen = ref(false);
const isEditModalOpen = ref(false); // State เปิดปิด Edit Modal
const selectedLink = ref(null);

// --- 1. Computed Stats (จำนวนลิงก์) ---
const totalLinks = computed(() => authStore.myLinks.length);
const activeLinks = computed(
  () =>
    authStore.myLinks.filter((l) => !l.disabled && !isExpired(l.expiredAt))
      .length
);
const inactiveLinks = computed(
  () =>
    authStore.myLinks.filter((l) => l.disabled || isExpired(l.expiredAt)).length
);

// --- Helpers ---
// [Refactor] แยก Class Logic มาไว้ตรงนี้
const refreshIconClasses = computed(() => ({
  "animate-spin": isRefreshing.value || authStore.isLoadingLinks,
}));
const renewIconClasses = computed(() => ({ "animate-spin": isRenewing.value }));

const filteredLinks = computed(() => {
  if (!searchQuery.value) return authStore.myLinks;
  const query = searchQuery.value.toLowerCase();
  return authStore.myLinks.filter(
    (link) =>
      link.targetUrl.toLowerCase().includes(query) ||
      link.shortUrl.toLowerCase().includes(query) ||
      link.slug.toLowerCase().includes(query)
  );
});

const getFaviconUrl = (url) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch (e) {
    return "https://www.svgrepo.com/show/508699/landscape-placeholder.svg";
  }
};

const getDomain = (url) => {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch (e) {
    return url;
  }
};

const isExpired = (dateString) => new Date(dateString) < new Date();

const formatShortDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
};

// --- Actions ---

const handleShowQr = (link) => {
  selectedLink.value = link;
  isResultModalOpen.value = true;
};

// 2. เปิด Edit Modal แทน Swal
const handleEdit = (link) => {
  selectedLink.value = link;
  isEditModalOpen.value = true;
};

const closeResultModal = () => {
  isResultModalOpen.value = false;
  setTimeout(() => {
    selectedLink.value = null;
  }, 200);
};

// 3. Disable/Enable Link
const handleToggleDisable = async (link) => {
  isToggling.value = true;
  const newState = !link.disabled;

  try {
    // ต้องมั่นใจว่า Backend รองรับ field 'disabled' ในการ update แล้ว
    const response = await api.patch(`/links/${link.id}`, {
      disabled: newState,
    });

    const index = authStore.myLinks.findIndex((l) => l.id === link.id);
    if (index !== -1) {
      authStore.myLinks[index] = {
        ...authStore.myLinks[index],
        ...response.data,
      };
    }

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: newState ? "Link Disabled" : "Link Enabled",
      showConfirmButton: false,
      timer: 1000,
    });
  } catch (error) {
    Swal.fire("Error", "Could not update status", "error");
  } finally {
    isToggling.value = false;
  }
};

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Copied!",
      showConfirmButton: false,
      timer: 1000,
    });
  });
};

const handleRefresh = async () => {
  isRefreshing.value = true;
  try {
    await authStore.fetchMyLinks();
  } finally {
    isRefreshing.value = false;
  }
};

const handleRenew = async (linkId) => {
  isRenewing.value = true;
  try {
    await authStore.renewLink(linkId);
  } finally {
    isRenewing.value = false;
  }
};

const handleDelete = async (linkId) => {
  isDeleting.value = true;
  try {
    await authStore.deleteLink(linkId);
  } finally {
    isDeleting.value = false;
  }
};

const changePage = (newPage) => {
  if (newPage < 1 || newPage > (authStore.pagination?.totalPages || 1)) return;
  authStore.fetchMyLinks(newPage); // เรียก Store ให้ดึงข้อมูลหน้านั้นๆ
  // เลื่อนหน้าจอขึ้นไปด้านบนสุดของรายการ
  window.scrollTo({ top: 0, behavior: "smooth" });
};

onMounted(() => {
  authStore.fetchMyLinks();
});
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-gray-50/50 pb-24">
    <div class="container mx-auto px-4 lg:px-8 py-10">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div
          class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4"
        >
          <div class="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Link2 class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Total Links</p>
            <p class="text-2xl font-bold text-gray-900">{{ totalLinks }}</p>
          </div>
        </div>

        <div
          class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4"
        >
          <div class="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Active</p>
            <p class="text-2xl font-bold text-gray-900">{{ activeLinks }}</p>
          </div>
        </div>

        <div
          class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4"
        >
          <div class="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <AlertCircle class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Inactive</p>
            <p class="text-2xl font-bold text-gray-900">{{ inactiveLinks }}</p>
          </div>
        </div>
      </div>

      <div
        class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1
            class="text-3xl font-bold text-gray-900 flex items-center gap-3 tracking-tight"
          >
            <LayoutDashboard class="h-8 w-8 text-indigo-600" />
            Dashboard
          </h1>
          <p class="text-gray-500 mt-2">
            Manage your links and view analytics.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div class="relative group w-full md:w-64">
            <div
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
            >
              <Search
                class="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors"
              />
            </div>
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Search..."
              class="block w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>

          <div class="flex gap-2 shrink-0">
            <button
              @click="handleRefresh"
              :disabled="isRefreshing || authStore.isLoadingLinks"
              class="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-95"
            >
              <RefreshCw class="h-5 w-5" :class="refreshIconClasses" />
            </button>
            <router-link
              to="/"
              class="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Plus class="h-4 w-4" />
              <span>New</span>
            </router-link>
          </div>
        </div>
      </div>

      <div
        v-if="authStore.isLoadingLinks && !isRefreshing"
        class="py-20 flex flex-col items-center"
      >
        <Loader2 class="h-8 w-8 text-indigo-600 animate-spin mb-3" />
        <p class="text-gray-500 text-sm">Loading links...</p>
      </div>

      <div
        v-else-if="filteredLinks.length === 0"
        class="py-16 text-center bg-white border-2 border-dashed border-gray-200 rounded-3xl"
      >
        <Link2 class="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500">No links found.</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div
          v-for="link in filteredLinks"
          :key="link.id"
          class="group bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 hover:-translate-y-1 flex flex-col relative overflow-hidden"
          :class="{ 'opacity-75 grayscale-[0.5]': link.disabled }"
        >
          <div
            v-if="link.disabled"
            class="absolute top-0 right-0 bg-gray-100 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider z-10"
          >
            Disabled
          </div>

          <div class="flex items-start justify-between gap-3 mb-4">
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0"
              >
                <img
                  :src="getFaviconUrl(link.targetUrl)"
                  class="w-5 h-5 object-contain opacity-80"
                  @error="
                    $event.target.src =
                      'https://www.svgrepo.com/show/508699/landscape-placeholder.svg'
                  "
                />
              </div>
              <div class="min-w-0">
                <h3 class="text-sm font-bold text-gray-900 truncate">
                  {{ getDomain(link.targetUrl) }}
                </h3>
                <p class="text-xs text-gray-400 truncate">
                  {{ link.targetUrl }}
                </p>
              </div>
            </div>
            <div
              class="w-2.5 h-2.5 rounded-full ring-4 ring-white shrink-0 mt-1"
              :class="
                link.disabled
                  ? 'bg-gray-400'
                  : isExpired(link.expiredAt)
                  ? 'bg-red-500'
                  : 'bg-emerald-500'
              "
            ></div>
          </div>

          <div
            class="bg-gray-50/80 border border-gray-100 rounded-2xl p-3 flex items-center justify-between gap-2 mb-4"
          >
            <a
              :href="link.shortUrl"
              target="_blank"
              class="text-lg font-bold text-indigo-600 truncate hover:underline decoration-2 underline-offset-2"
            >
              /{{ link.slug }}
            </a>
            <button
              @click="copyToClipboard(link.shortUrl)"
              class="p-2 text-gray-400 hover:text-indigo-600 bg-white rounded-xl shadow-sm active:scale-95"
            >
              <Copy class="h-4 w-4" />
            </button>
          </div>

          <div class="flex items-center gap-4 text-xs text-gray-400 px-1 mb-5">
            <div class="flex items-center gap-1">
              <Clock class="h-3 w-3" />
              <span>{{ formatShortDate(link.createdAt) }}</span>
            </div>
            <div
              class="flex items-center gap-1"
              :class="{ 'text-red-500': isExpired(link.expiredAt) }"
            >
              <Calendar class="h-3 w-3" />
              <span>{{
                isExpired(link.expiredAt)
                  ? "Expired"
                  : formatShortDate(link.expiredAt)
              }}</span>
            </div>
          </div>

          <div
            class="grid grid-cols-6 gap-1 mt-auto border-t border-gray-50 pt-3"
          >
            <router-link
              :to="`/dashboard/link/${link.id}/stats`"
              class="action-btn hover:text-indigo-600 hover:bg-indigo-50"
              title="Stats"
            >
              <BarChart2 class="h-4 w-4" />
            </router-link>

            <button
              @click="handleEdit(link)"
              class="action-btn hover:text-blue-600 hover:bg-blue-50"
              title="Edit"
            >
              <Pencil class="h-4 w-4" />
            </button>

            <button
              @click="handleShowQr(link)"
              class="action-btn hover:text-purple-600 hover:bg-purple-50"
              title="QR"
            >
              <QrCode class="h-4 w-4" />
            </button>

            <button
              @click="handleRenew(link.id)"
              class="action-btn hover:text-emerald-600 hover:bg-emerald-50"
              title="Renew"
            >
              <RefreshCw class="h-4 w-4" :class="renewIconClasses" />
            </button>

            <button
              @click="handleToggleDisable(link)"
              class="action-btn hover:bg-orange-50"
              :class="
                link.disabled
                  ? 'text-gray-400 hover:text-emerald-600'
                  : 'text-orange-500 hover:text-orange-600'
              "
              :title="link.disabled ? 'Enable Link' : 'Disable Link'"
            >
              <EyeOff v-if="link.disabled" class="h-4 w-4" />
              <Eye v-else class="h-4 w-4" />
            </button>

            <button
              @click="handleDelete(link.id)"
              class="action-btn hover:text-red-600 hover:bg-red-50"
              title="Delete"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div
        v-if="authStore.pagination && authStore.pagination.totalPages > 1"
        class="mt-10 flex justify-center items-center gap-4"
      >
        <button
          @click="changePage(authStore.pagination.page - 1)"
          :disabled="authStore.pagination.page <= 1"
          class="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft class="h-5 w-5" />
        </button>

        <span
          class="text-sm font-medium text-gray-600 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm"
        >
          Page {{ authStore.pagination.page }} of
          {{ authStore.pagination.totalPages }}
        </span>

        <button
          @click="changePage(authStore.pagination.page + 1)"
          :disabled="
            authStore.pagination.page >= authStore.pagination.totalPages
          "
          class="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight class="h-5 w-5" />
        </button>
      </div>
    </div>

    <Teleport to="body">
      <ResultModal
        :modelValue="isResultModalOpen"
        :link="selectedLink"
        @update:modelValue="closeResultModal"
      />
      <EditLinkModal v-model="isEditModalOpen" :link="selectedLink" />
    </Teleport>
  </div>
</template>

<style scoped>
.action-btn {
  @apply flex items-center justify-center p-2 rounded-xl text-gray-400 transition-colors active:scale-90;
}
</style>