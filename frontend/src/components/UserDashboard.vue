<script setup>
// ==========================================
// 1. IMPORTS
// ==========================================
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
  QrCode, // +++ (เพิ่ม) Import QrCode Icon +++
} from "lucide-vue-next";
// +++ (เพิ่ม) Import ResultModal +++
import ResultModal from "@/components/ResultModal.vue";

// ==========================================
// 2. STATE
// ==========================================
const authStore = useAuthStore();
const isRenewing = ref(false);
const isDeleting = ref(false);
const isRefreshing = ref(false);
const searchQuery = ref("");

// +++ (เพิ่ม) State สำหรับ QR Code Modal +++
const isResultModalOpen = ref(false);
const selectedLink = ref(null);

// ==========================================
// 3. COMPUTED & HELPERS
// ==========================================
// (ส่วนเดิมคงเดิม)
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

// ==========================================
// 4. ACTIONS
// ==========================================

// +++ (เพิ่ม) ฟังก์ชันเปิด Modal QR +++
const handleShowQr = (link) => {
  selectedLink.value = link;
  isResultModalOpen.value = true;
};

// +++ (เพิ่ม) ฟังก์ชันปิด Modal +++
const closeResultModal = () => {
  isResultModalOpen.value = false;
  setTimeout(() => {
    selectedLink.value = null;
  }, 200);
};

// (ฟังก์ชันเดิม: handleEdit, copyToClipboard, handleRefresh, handleRenew, handleDelete)
const handleEdit = async (link) => {
  const { value: newUrl } = await Swal.fire({
    title: "Edit Destination URL",
    input: "url",
    inputLabel: "Where should this short link go?",
    inputValue: link.targetUrl,
    showCancelButton: true,
    confirmButtonText: "Update Link",
    confirmButtonColor: "#4F46E5",
    cancelButtonColor: "#d33",
    inputValidator: (value) => {
      if (!value) return "Please enter a valid URL!";
    },
  });

  if (newUrl && newUrl !== link.targetUrl) {
    try {
      const response = await api.patch(`/links/${link.id}`, {
        targetUrl: newUrl,
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
        title: "Link updated successfully!",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (error) {
      console.error("Update failed:", error);
      Swal.fire(
        "Update Failed",
        error.response?.data?.message || "Could not update link.",
        "error"
      );
    }
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
      timer: 1500,
    });
  });
};

const handleRefresh = async () => {
  isRefreshing.value = true;
  try {
    await authStore.fetchMyLinks();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    console.error("Refresh failed:", error);
  } finally {
    isRefreshing.value = false;
  }
};

const handleRenew = async (linkId) => {
  isRenewing.value = true;
  try {
    await authStore.renewLink(linkId);
  } catch (error) {
    console.error("Error renewing link:", error);
  } finally {
    isRenewing.value = false;
  }
};

const handleDelete = async (linkId) => {
  isDeleting.value = true;
  try {
    await authStore.deleteLink(linkId);
  } catch (error) {
    console.error("Error deleting link:", error);
  } finally {
    isDeleting.value = false;
  }
};

onMounted(() => {
  authStore.fetchMyLinks();
});
</script>

<template>
  <div
    class="min-h-[calc(100vh-64px)] bg-gradient-to-b from-white via-indigo-50/30 to-white"
  >
    <div class="container mx-auto px-4 lg:px-8 py-12">
      <div
        class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"
      >
        <div>
          <h1 class="text-3xl font-bold text-gray-900 tracking-tight">
            My Links
          </h1>
          <p class="text-sm text-gray-500 mt-2">
            Manage your short links and track their performance.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div class="relative group w-full md:w-72">
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
              placeholder="Search by link or target..."
              class="block w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>

          <div class="flex gap-2 shrink-0">
            <button
              @click="handleRefresh"
              :disabled="isRefreshing || authStore.isLoadingLinks"
              class="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
              title="Refresh Data"
            >
              <RefreshCw class="h-5 w-5" :class="refreshIconClasses" />
            </button>

            <router-link
              to="/"
              class="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <Plus class="h-5 w-5" />
              <span>Create New</span>
            </router-link>
          </div>
        </div>
      </div>

      <div
        v-if="authStore.isLoadingLinks || isRefreshing"
        class="py-32 text-center"
      >
        <div
          class="inline-flex items-center justify-center p-4 bg-indigo-50 rounded-full mb-4 animate-pulse"
        >
          <Loader2 class="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
        <h3 class="text-lg font-medium text-gray-900">
          Updating your links...
        </h3>
      </div>

      <div
        v-else-if="filteredLinks.length === 0"
        class="py-24 text-center bg-white border-2 border-dashed border-gray-200 rounded-2xl"
      >
        <div
          class="inline-flex items-center justify-center p-6 bg-gray-50 rounded-full mb-4"
        >
          <Link2 class="h-10 w-10 text-gray-300" />
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">No links found</h3>
        <p class="text-gray-500 max-w-sm mx-auto">
          {{
            searchQuery
              ? `We couldn't find any links matching "${searchQuery}"`
              : "Create your first short link to get started."
          }}
        </p>
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="mt-6 text-indigo-600 hover:text-indigo-700 font-semibold text-sm hover:underline"
        >
          Clear search query
        </button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div
          v-for="link in filteredLinks"
          :key="link.id"
          class="bg-white rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 hover:-translate-y-1 flex flex-col overflow-hidden group"
        >
          <div
            class="p-5 flex items-start justify-between gap-3 border-b border-gray-50"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform"
              >
                <img
                  :src="getFaviconUrl(link.targetUrl)"
                  @error="
                    $event.target.src =
                      'https://www.svgrepo.com/show/508699/landscape-placeholder.svg'
                  "
                  alt="Icon"
                  class="w-6 h-6 object-contain"
                />
              </div>
              <div class="min-w-0">
                <h3
                  class="text-sm font-bold text-gray-900 truncate"
                  :title="link.targetUrl"
                >
                  {{ getDomain(link.targetUrl) }}
                </h3>
                <p
                  class="text-xs text-gray-500 truncate max-w-[180px] group-hover:text-indigo-500 transition-colors"
                >
                  {{ link.targetUrl }}
                </p>
              </div>
            </div>
            <div
              class="shrink-0 w-2.5 h-2.5 rounded-full ring-2 ring-white"
              :class="
                isExpired(link.expiredAt) ? 'bg-red-500' : 'bg-emerald-500'
              "
              :title="isExpired(link.expiredAt) ? 'Expired' : 'Active'"
            ></div>
          </div>

          <div
            class="p-6 flex-grow flex flex-col justify-center items-center bg-gradient-to-b from-white to-gray-50/50"
          >
            <div class="flex items-center gap-2 mb-1">
              <a
                :href="link.shortUrl"
                target="_blank"
                class="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 hover:to-indigo-800 truncate cursor-pointer"
              >
                /{{ link.slug }}
              </a>
              <button
                @click="copyToClipboard(link.shortUrl)"
                class="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Copy Link"
              >
                <Copy class="h-4 w-4" />
              </button>
            </div>
            <span
              class="text-[10px] uppercase tracking-widest text-gray-400 font-medium"
              >Short Link</span
            >
          </div>

          <div class="p-4 border-t border-gray-100 bg-white">
            <div
              class="flex justify-between items-center text-[11px] text-gray-500 mb-3 px-1"
            >
              <div class="flex items-center" title="Date Created">
                <Clock class="h-3 w-3 mr-1" />
                <span>Created: {{ formatShortDate(link.createdAt) }}</span>
              </div>
              <div
                class="flex items-center"
                :class="{
                  'text-red-500 font-medium': isExpired(link.expiredAt),
                }"
                title="Expiration Date"
              >
                <Calendar class="h-3 w-3 mr-1" />
                <span>{{
                  isExpired(link.expiredAt)
                    ? "Expired"
                    : formatShortDate(link.expiredAt)
                }}</span>
              </div>
            </div>

            <div class="grid grid-cols-5 gap-2">
              <router-link
                :to="`/dashboard/link/${link.id}/stats`"
                class="flex items-center justify-center py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                title="View Stats"
              >
                <BarChart2 class="h-3.5 w-3.5 mr-1" />
                Stats
              </router-link>

              <button
                @click="handleEdit(link)"
                class="flex items-center justify-center py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                title="Edit URL"
              >
                <Pencil class="h-3.5 w-3.5 mr-1" />
                Edit
              </button>

              <button
                @click="handleShowQr(link)"
                class="flex items-center justify-center py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors"
                title="Show QR Code"
              >
                <QrCode class="h-3.5 w-3.5 mr-1" />
                QR
              </button>

              <button
                @click="handleRenew(link.id)"
                :disabled="isRenewing"
                class="flex items-center justify-center py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors disabled:opacity-50"
                title="Renew"
              >
                <RefreshCw class="h-3.5 w-3.5 mr-1" :class="renewIconClasses" />
                Renew
              </button>

              <button
                @click="handleDelete(link.id)"
                :disabled="isDeleting"
                class="flex items-center justify-center py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors disabled:opacity-50"
                title="Delete"
              >
                <Trash2 class="h-3.5 w-3.5 mr-1" />
                Del
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <ResultModal
        :modelValue="isResultModalOpen"
        :link="selectedLink"
        @update:modelValue="closeResultModal"
      />
    </Teleport>
  </div>
</template>