<script setup>
import { onMounted, computed, ref, watch } from "vue";
import { useLinkStore } from "@/stores/useLinkStore";
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
  ExternalLink,
} from "lucide-vue-next";
import ResultModal from "@/components/ResultModal.vue";
import EditLinkModal from "@/components/EditLinkModal.vue";
import Swal from "sweetalert2";
import api from "@/services/api";

const linkStore = useLinkStore();

// UI States
const isRefreshing = ref(false);
const searchQuery = ref("");
let searchTimeout = null;

// Modal States
const isResultModalOpen = ref(false);
const isEditModalOpen = ref(false);
const selectedLink = ref(null);

// Stats
const totalLinks = computed(() => linkStore.stats.total);
const activeLinks = computed(() => linkStore.stats.active);
const inactiveLinks = computed(() => linkStore.stats.inactive);

const refreshIconClasses = computed(() => ({
  "animate-spin": isRefreshing.value,
}));

// Base Class สำหรับปุ่ม Action
const actionBtnClass =
  "flex items-center justify-center p-2 rounded-xl transition-colors active:scale-90";

// Helpers
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

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
};

// Search Logic
watch(searchQuery, (newVal) => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    linkStore.fetchMyLinks(1, 9, newVal);
  }, 500);
});

// Actions
const handleRefresh = async () => {
  isRefreshing.value = true;
  await linkStore.fetchMyLinks(linkStore.pagination.page, 9, searchQuery.value);
  isRefreshing.value = false;
};

const changePage = (newPage) => {
  if (newPage < 1 || newPage > linkStore.pagination.totalPages) return;
  linkStore.fetchMyLinks(newPage, 9, searchQuery.value);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const handleToggleDisable = async (link) => {
  try {
    const response = await api.patch(`/links/${link.id}`, {
      disabled: !link.disabled,
    });
    linkStore.updateLinkInStore(response.data);

    // Update Stats
    if (response.data.disabled) {
      linkStore.stats.active--;
      linkStore.stats.inactive++;
    } else {
      linkStore.stats.active++;
      linkStore.stats.inactive--;
    }

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: response.data.disabled ? "Link Disabled" : "Link Enabled",
      showConfirmButton: false,
      timer: 1000,
    });
  } catch (error) {
    /* handled by api */
  }
};

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text);
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: "Copied!",
    showConfirmButton: false,
    timer: 1000,
  });
};

// Modals
const handleShowQr = (link) => {
  selectedLink.value = link;
  isResultModalOpen.value = true;
};
const handleEdit = (link) => {
  selectedLink.value = link;
  isEditModalOpen.value = true;
};
const closeResultModal = () => {
  isResultModalOpen.value = false;
  setTimeout(() => (selectedLink.value = null), 300);
};

onMounted(() => linkStore.fetchMyLinks());
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-gray-50/50 pb-24">
    <div class="container mx-auto px-4 lg:px-8 py-10">
      <div
        class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1
            class="text-3xl font-bold text-gray-900 flex items-center gap-3 tracking-tight"
          >
            <LayoutDashboard class="h-8 w-8 text-indigo-600" /> Dashboard
          </h1>
          <p class="text-gray-500 mt-1">
            Manage your links and view analytics.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div class="relative group w-full md:w-64">
            <Search
              class="absolute left-3 top-2.5 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search links..."
              class="block w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
            />
          </div>
          <div class="flex gap-2">
            <button
              @click="handleRefresh"
              :disabled="isRefreshing"
              class="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 hover:border-indigo-200 shadow-sm active:scale-95 transition-all"
            >
              <RefreshCw class="h-5 w-5" :class="refreshIconClasses" />
            </button>
            <router-link
              to="/"
              class="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Plus class="h-4 w-4" /> <span>New Link</span>
            </router-link>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div
          class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
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
          class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
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
          class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
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
        v-if="linkStore.isLoading && !isRefreshing"
        class="py-20 flex flex-col items-center"
      >
        <Loader2 class="h-10 w-10 text-indigo-600 animate-spin mb-3" />
        <p class="text-gray-500">Loading links...</p>
      </div>

      <div
        v-else-if="!linkStore.myLinks.length"
        class="py-16 text-center bg-white border-2 border-dashed border-gray-200 rounded-3xl"
      >
        <Link2 class="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500">No links found.</p>
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="mt-4 text-indigo-600 hover:underline"
        >
          Clear search
        </button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div
          v-for="link in linkStore.myLinks"
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
            class="bg-gray-50/80 border border-gray-100 rounded-2xl p-3 flex items-center justify-between gap-2 mb-4 group-hover:border-indigo-100 transition-colors"
          >
            <a
              :href="link.shortUrl"
              target="_blank"
              class="text-lg font-bold text-indigo-600 truncate hover:underline flex items-center gap-1"
            >
              /{{ link.slug }}
              <ExternalLink
                class="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </a>
            <button
              @click="copyToClipboard(link.shortUrl)"
              class="p-2 text-gray-400 hover:text-indigo-600 bg-white rounded-xl shadow-sm active:scale-95 transition-all"
              title="Copy"
            >
              <Copy class="h-4 w-4" />
            </button>
          </div>

          <div class="flex items-center gap-4 text-xs text-gray-400 px-1 mb-5">
            <div class="flex items-center gap-1">
              <Clock class="h-3 w-3" /> {{ formatDate(link.createdAt) }}
            </div>
            <div
              class="flex items-center gap-1"
              :class="{ 'text-red-500': isExpired(link.expiredAt) }"
            >
              <Calendar class="h-3 w-3" />
              {{
                isExpired(link.expiredAt)
                  ? "Expired"
                  : formatDate(link.expiredAt)
              }}
            </div>
            <div
              class="ml-auto font-medium bg-gray-100 px-2 py-0.5 rounded text-gray-500"
            >
              {{ link._count?.clicks || 0 }} clicks
            </div>
          </div>

          <div
            class="grid grid-cols-6 gap-1 mt-auto border-t border-gray-50 pt-3"
          >
            <router-link
              :to="`/dashboard/link/${link.id}/stats`"
              :class="[
                actionBtnClass,
                'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50',
              ]"
              title="Analytics"
              ><BarChart2 class="h-4 w-4"
            /></router-link>
            <button
              @click="handleEdit(link)"
              :class="[
                actionBtnClass,
                'text-gray-400 hover:text-blue-600 hover:bg-blue-50',
              ]"
              title="Edit"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button
              @click="handleShowQr(link)"
              :class="[
                actionBtnClass,
                'text-gray-400 hover:text-purple-600 hover:bg-purple-50',
              ]"
              title="QR Code"
            >
              <QrCode class="h-4 w-4" />
            </button>
            <button
              @click="linkStore.renewLink(link.id)"
              :class="[
                actionBtnClass,
                'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50',
              ]"
              title="Renew"
            >
              <RefreshCw class="h-4 w-4" />
            </button>

            <button
              @click="handleToggleDisable(link)"
              :class="[
                actionBtnClass,
                'hover:bg-orange-50',
                link.disabled
                  ? 'text-gray-400 hover:text-emerald-600'
                  : 'text-gray-400 hover:text-orange-600',
              ]"
              :title="link.disabled ? 'Enable' : 'Disable'"
            >
              <component :is="link.disabled ? EyeOff : Eye" class="h-4 w-4" />
            </button>

            <button
              @click="linkStore.deleteLink(link.id)"
              :class="[
                actionBtnClass,
                'text-gray-400 hover:text-red-600 hover:bg-red-50',
              ]"
              title="Delete"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="linkStore.pagination.totalPages > 1"
        class="mt-10 flex justify-center items-center gap-4"
      >
        <button
          @click="changePage(linkStore.pagination.page - 1)"
          :disabled="linkStore.pagination.page <= 1"
          class="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
        >
          <ChevronLeft class="h-5 w-5" />
        </button>
        <span
          class="text-sm font-medium text-gray-600 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm"
          >Page {{ linkStore.pagination.page }} of
          {{ linkStore.pagination.totalPages }}</span
        >
        <button
          @click="changePage(linkStore.pagination.page + 1)"
          :disabled="
            linkStore.pagination.page >= linkStore.pagination.totalPages
          "
          class="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
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