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
} from "lucide-vue-next";
import ResultModal from "@/components/ResultModal.vue";

// 2. STATE
const authStore = useAuthStore();
const isRenewing = ref(false);
const isDeleting = ref(false);
const isRefreshing = ref(false);
const searchQuery = ref("");

// State for QR Modal
const isResultModalOpen = ref(false);
const selectedLink = ref(null);

// 3. COMPUTED & HELPERS
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

// 4. ACTIONS
const handleShowQr = (link) => {
  selectedLink.value = link;
  isResultModalOpen.value = true;
};

const closeResultModal = () => {
  isResultModalOpen.value = false;
  setTimeout(() => {
    selectedLink.value = null;
  }, 200);
};

const handleEdit = async (link) => {
  const { value: newUrl } = await Swal.fire({
    title: "Edit Destination",
    input: "url",
    inputLabel: "New Target URL",
    inputValue: link.targetUrl,
    showCancelButton: true,
    confirmButtonText: "Update",
    confirmButtonColor: "#4F46E5",
    cancelButtonColor: "#ef4444",
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
        title: "Updated!",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (error) {
      Swal.fire(
        "Error",
        error.response?.data?.message || "Update failed",
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

onMounted(() => {
  authStore.fetchMyLinks();
});
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-gray-50/50 pb-24">
    <div class="container mx-auto px-4 lg:px-8 py-10">
      <div
        class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10"
      >
        <div>
          <h1 class="text-3xl font-bold text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p class="text-gray-500 mt-2">
            Manage your links and view analytics.
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
              placeholder="Search links..."
              class="block w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>

          <div class="flex gap-2 shrink-0">
            <button
              @click="handleRefresh"
              :disabled="isRefreshing || authStore.isLoadingLinks"
              class="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw class="h-5 w-5" :class="refreshIconClasses" />
            </button>

            <router-link
              to="/"
              class="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:scale-95"
            >
              <Plus class="h-5 w-5" />
              <span>New Link</span>
            </router-link>
          </div>
        </div>
      </div>

      <div
        v-if="authStore.isLoadingLinks && !isRefreshing"
        class="py-20 flex flex-col items-center justify-center"
      >
        <Loader2 class="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p class="text-gray-500 font-medium">Loading your dashboard...</p>
      </div>

      <div
        v-else-if="filteredLinks.length === 0"
        class="py-20 text-center bg-white border-2 border-dashed border-gray-200 rounded-3xl"
      >
        <div
          class="inline-flex items-center justify-center w-16 h-16 bg-gray-50 rounded-full mb-4"
        >
          <Link2 class="h-8 w-8 text-gray-300" />
        </div>
        <h3 class="text-lg font-bold text-gray-900">No links found</h3>
        <p class="text-gray-500 mt-1 max-w-xs mx-auto">
          {{
            searchQuery
              ? `No results for "${searchQuery}"`
              : "Create your first short link to get started."
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

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div
          v-for="link in filteredLinks"
          :key="link.id"
          class="group bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 hover:-translate-y-1 flex flex-col"
        >
          <div class="flex items-start justify-between gap-3 mb-4">
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden"
              >
                <img
                  :src="getFaviconUrl(link.targetUrl)"
                  @error="
                    $event.target.src =
                      'https://www.svgrepo.com/show/508699/landscape-placeholder.svg'
                  "
                  alt="Icon"
                  class="w-5 h-5 object-contain opacity-80"
                />
              </div>
              <div class="min-w-0">
                <h3
                  class="text-sm font-bold text-gray-900 truncate"
                  :title="link.targetUrl"
                >
                  {{ getDomain(link.targetUrl) }}
                </h3>
                <p class="text-xs text-gray-400 truncate">
                  {{ link.targetUrl }}
                </p>
              </div>
            </div>

            <div
              class="w-2 h-2 rounded-full ring-4 ring-white shrink-0 mt-2"
              :class="
                isExpired(link.expiredAt) ? 'bg-red-500' : 'bg-emerald-500'
              "
              :title="isExpired(link.expiredAt) ? 'Expired' : 'Active'"
            ></div>
          </div>

          <div
            class="bg-gray-50/80 border border-gray-100 rounded-2xl p-3 flex items-center justify-between gap-2 mb-4 group-hover:border-indigo-100 group-hover:bg-indigo-50/30 transition-colors"
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
              class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all active:scale-95"
              title="Copy Link"
            >
              <Copy class="h-4 w-4" />
            </button>
          </div>

          <div class="flex items-center gap-4 text-xs text-gray-400 px-1 mb-6">
            <div class="flex items-center gap-1">
              <Clock class="h-3 w-3" />
              <span>{{ formatShortDate(link.createdAt) }}</span>
            </div>
            <div
              class="flex items-center gap-1"
              :class="{ 'text-red-500 font-medium': isExpired(link.expiredAt) }"
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
            class="grid grid-cols-5 gap-1 mt-auto border-t border-gray-50 pt-4"
          >
            <router-link
              :to="`/dashboard/link/${link.id}/stats`"
              class="flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              title="Statistics"
            >
              <BarChart2 class="h-4 w-4" />
              <span class="text-[10px] font-medium">Stats</span>
            </router-link>

            <button
              @click="handleEdit(link)"
              class="flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              title="Edit URL"
            >
              <Pencil class="h-4 w-4" />
              <span class="text-[10px] font-medium">Edit</span>
            </button>

            <button
              @click="handleShowQr(link)"
              class="flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-colors"
              title="QR Code"
            >
              <QrCode class="h-4 w-4" />
              <span class="text-[10px] font-medium">QR</span>
            </button>

            <button
              @click="handleRenew(link.id)"
              :disabled="isRenewing"
              class="flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-50"
              title="Renew Expiry"
            >
              <RefreshCw class="h-4 w-4" :class="renewIconClasses" />
              <span class="text-[10px] font-medium">Renew</span>
            </button>

            <button
              @click="handleDelete(link.id)"
              :disabled="isDeleting"
              class="flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
              title="Delete Link"
            >
              <Trash2 class="h-4 w-4" />
              <span class="text-[10px] font-medium">Del</span>
            </button>
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