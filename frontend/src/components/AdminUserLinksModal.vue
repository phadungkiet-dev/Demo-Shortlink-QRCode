<script setup>
import { ref, watch } from "vue";
import {
  X,
  ExternalLink,
  Calendar,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-vue-next";
import api from "@/services/api";
import { APP_CONFIG } from "@/config/constants";

const props = defineProps({
  modelValue: Boolean,
  user: Object,
});

const emit = defineEmits(["update:modelValue"]);
const links = ref([]);
const pagination = ref({ page: 1, totalPages: 1 });
const isLoading = ref(false);
const searchQuery = ref("");
let searchTimeout = null;

// Watch ทั้ง User และ สถานะเปิด/ปิด Modal
watch([() => props.user, () => props.modelValue], ([newUser, isOpen]) => {
  if (isOpen && newUser) {
    fetchLinks(1);
  }
});

// Watch Search แยกต่างหาก (Debounce)
watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => fetchLinks(1), 500);
});

const fetchLinks = async (page = 1) => {
  if (!props.user) return;
  isLoading.value = true;
  try {
    const response = await api.get(`/admin/users/${props.user.id}/links`, {
      params: { page, limit: 5, search: searchQuery.value },
    });
    links.value = response.data.data;
    pagination.value = response.data.meta;
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};

const closeModal = () => {
  emit("update:modelValue", false);
  setTimeout(() => {
    links.value = [];
    searchQuery.value = "";
  }, 300);
};

const formatDate = (date) => new Date(date).toLocaleDateString("en-GB");
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-[100] flex items-center justify-center p-4"
  >
    <div
      class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      @click="closeModal"
    ></div>
    <div
      class="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
    >
      <div
        class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0"
      >
        <div>
          <h3 class="text-lg font-bold text-gray-900">User Links</h3>
          <p class="text-sm text-gray-500">
            Viewing links for
            <span class="font-semibold text-indigo-600">{{ user?.email }}</span>
          </p>
        </div>
        <button
          @click="closeModal"
          class="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-4 border-b border-gray-100 bg-white">
        <div class="relative">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            v-model="searchQuery"
            placeholder="Search this user's links..."
            class="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 bg-gray-50/30">
        <div
          v-if="isLoading"
          class="py-10 text-center text-gray-500 flex flex-col items-center"
        >
          <Loader2 class="h-8 w-8 text-indigo-600 animate-spin mb-2" />
          Loading...
        </div>
        <div
          v-else-if="links.length === 0"
          class="py-10 text-center text-gray-400"
        >
          No links found.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="link in links"
            :key="link.id"
            class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div class="flex justify-between items-start mb-2">
              <div class="min-w-0 flex-1 mr-4">
                <a
                  :href="link.shortUrl"
                  target="_blank"
                  class="text-indigo-600 font-bold hover:underline flex items-center gap-1"
                >
                  /{{ APP_CONFIG.ROUTES.SHORT_LINK_PREFIX }}/{{ link.slug }}
                  <ExternalLink class="h-3 w-3" />
                </a>
                <p class="text-xs text-gray-500 truncate mt-1">
                  {{ link.targetUrl }}
                </p>
              </div>
              <div class="text-right shrink-0">
                <span
                  class="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg"
                  >{{ link._count?.clicks || 0 }} clicks</span
                >
              </div>
            </div>
            <div class="flex items-center gap-2 text-[10px] text-gray-400">
              <Calendar class="h-3 w-3" /> {{ formatDate(link.createdAt) }}
              <span
                v-if="link.disabled"
                class="text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded ml-auto"
                >DISABLED</span
              >
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="pagination.totalPages > 1"
        class="p-3 border-t border-gray-100 bg-white flex justify-center gap-2 shrink-0"
      >
        <button
          @click="fetchLinks(pagination.page - 1)"
          :disabled="pagination.page <= 1"
          class="p-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <span class="text-xs font-medium self-center px-2"
          >Page {{ pagination.page }} / {{ pagination.totalPages }}</span
        >
        <button
          @click="fetchLinks(pagination.page + 1)"
          :disabled="pagination.page >= pagination.totalPages"
          class="p-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>