<script setup>
// Vue Core
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
// Stores
import { useAuthStore } from "@/stores/useAuthStore";
import { useLinkStore } from "@/stores/useLinkStore";
// Config
import { APP_CONFIG } from "@/config/constants";
// Components
import ResultModal from "@/components/ResultModal.vue";
import LoginModal from "@/components/LoginModal.vue";
// Icons
import {
  Loader2,
  Link2,
  AlertCircle,
  Zap,
  QrCode,
  BarChart3,
  ArrowRight,
  Info,
} from "lucide-vue-next";

// -------------------------------------------------------------------
// Setup & State Management
// -------------------------------------------------------------------
const authStore = useAuthStore();
const linkStore = useLinkStore();
const route = useRoute();
const router = useRouter();

// Form State
const targetUrl = ref("");
const customSlug = ref("");
const isSubmitting = ref(false);
const generatedLink = ref(null);
const errorMsg = ref(null);

// Modal State
const isLoginModalOpen = ref(false);

// -------------------------------------------------------------------
// Computed Properties
// -------------------------------------------------------------------
const isResultModalOpen = computed(() => !!generatedLink.value);

// -------------------------------------------------------------------
// Methods & Actions
// -------------------------------------------------------------------
const openLoginModal = () => {
  isLoginModalOpen.value = true;
};

const closeResultModal = () => {
  generatedLink.value = null;
  targetUrl.value = "";
  customSlug.value = "";
};

const handleSubmit = async () => {
  if (!targetUrl.value) return;

  isSubmitting.value = true;
  generatedLink.value = null;
  errorMsg.value = null;

  try {
    const payload = { targetUrl: targetUrl.value };

    // Feature: Custom Slug for logged-in users only
    if (authStore.user && customSlug.value) {
      payload.slug = customSlug.value;
    }

    // ยิง API สร้างลิงก์
    const result = await linkStore.createShortlink(payload);
    generatedLink.value = result; // ได้ผลลัพธ์ -> Modal จะเด้งขึ้นมาเอง (เพราะ computed isResultModalOpen)
  } catch (error) {
    // ใช้ error.message ที่เราทำไว้ใน api.js
    // แสดง Error ที่ได้จาก Backend (เช่น "Slug นี้มีคนใช้แล้ว")
    errorMsg.value =
      error.response?.data?.message || error.message || "An error occurred";
  } finally {
    isSubmitting.value = false;
  }
};

// -------------------------------------------------------------------
// Lifecycle Hooks
// -------------------------------------------------------------------
onMounted(() => {
  // Check for login trigger from router query (e.g., redirect from auth guard)
  if (route.query.login === "true") {
    isLoginModalOpen.value = true;
    // ลบ query param ออกเพื่อให้ URL สะอาด (Optional)
    router.replace({ query: null }); // Clean URL
  }
});
</script>

<template>
  <div
    class="min-h-[calc(100vh-64px)] bg-gradient-to-b from-white via-indigo-50/30 to-white flex flex-col"
  >
    <div
      class="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-16 pb-16 flex-grow"
    >
      <!-- Banner Warning -->
      <div class="max-w-3xl mx-auto mb-10 animate-fade-in-down">
        <div
          class="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm"
        >
          <Info class="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <h4 class="text-sm font-bold text-yellow-800">Demo Environment</h4>
            <p class="text-sm text-yellow-700 mt-0.5">
              This is a testing environment for educational purposes. All data
              (links, analytics, accounts) may be reset periodically. Please do
              not use for critical production workloads.
            </p>
          </div>
        </div>
      </div>

      <div
        class="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8 animate-fade-in-up"
      >
        <div
          class="inline-flex items-center justify-center p-1 pr-3 rounded-full bg-white border border-gray-200 shadow-sm mb-4"
        >
          <span
            class="bg-indigo-600 text-white px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide mr-2"
            >Update</span
          >
          <span class="text-xs sm:text-sm text-gray-600 font-medium"
            >Design custom QR codes in seconds</span
          >
        </div>

        <!-- Text header -->
        <h1
          class="text-4xl sm:text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight"
        >
          Streamline Links. <br class="hidden sm:block" />
          <span
            class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600"
          >
            Elevate Your Brand.
          </span>
        </h1>

        <p
          class="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0"
        >
          The ultimate link management platform for modern creators.
          <br class="hidden md:inline" />
          Shorten URLs, visualize performance, and share with confidence.
        </p>
      </div>

      <!-- Form send link for shortlink -->
      <div
        class="max-w-3xl mx-auto mt-10 sm:mt-12 relative z-10 animate-fade-in-up"
        style="animation-delay: 0.1s"
      >
        <div
          class="bg-white p-4 sm:p-6 rounded-3xl shadow-xl shadow-indigo-100/50 border border-gray-100 transform transition-all"
        >
          <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
            <div class="relative group">
              <div
                class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
              >
                <Link2
                  class="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors"
                />
              </div>
              <input
                type="url"
                v-model="targetUrl"
                placeholder="Paste your long link here..."
                required
                class="block w-full pl-12 pr-4 py-4 bg-gray-50 border-transparent rounded-2xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-base transition-all"
                :disabled="isSubmitting"
              />
            </div>

            <div v-if="authStore.user" class="relative group">
              <div
                class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
              >
                <span
                  class="text-gray-400 font-medium text-lg group-focus-within:text-indigo-500 transition-colors"
                  >{{ APP_CONFIG.ROUTES.SHORT_LINK_PREFIX }}/</span
                >
              </div>
              <input
                type="text"
                v-model="customSlug"
                :maxlength="APP_CONFIG.VALIDATION.SLUG_MAX_LEN"
                placeholder="Custom alias (optional)"
                class="block w-full pl-9 pr-4 py-4 bg-gray-50 border-transparent rounded-2xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-base transition-all"
                :disabled="isSubmitting"
              />
            </div>

            <div v-else class="flex items-center justify-between px-2 py-1">
              <p class="text-xs sm:text-sm text-gray-500">
                Looking for a branded alias?
                <button
                  type="button"
                  class="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline"
                  @click="openLoginModal"
                >
                  Sign in to personalize
                </button>
              </p>
            </div>

            <button
              type="submit"
              class="w-full px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
              :disabled="isSubmitting"
            >
              <Loader2 v-if="isSubmitting" class="h-6 w-6 animate-spin" />
              <span v-else>Shorten Now</span>
              <ArrowRight v-if="!isSubmitting" class="h-5 w-5" />
            </button>
          </form>
        </div>

        <transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
        >
          <div
            v-if="errorMsg"
            class="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center text-red-600 text-sm font-medium shadow-sm"
          >
            <AlertCircle class="h-5 w-5 mr-3 flex-shrink-0" />
            {{ errorMsg }}
          </div>
        </transition>
      </div>

      <!-- Grid column -->
      <div
        class="mt-16 lg:mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4"
      >
        <div
          class="group p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 hover:-translate-y-1 flex flex-col items-center text-center md:items-start md:text-left"
        >
          <div
            class="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors"
          >
            <Zap class="h-7 w-7 text-blue-600" />
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-3">Instant & Secure</h3>
          <p class="text-gray-500 leading-relaxed">
            Generate secure links instantly. Unlock permanent storage and
            advanced management tools by signing in.
          </p>
        </div>

        <div
          class="group p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 hover:-translate-y-1 flex flex-col items-center text-center md:items-start md:text-left"
        >
          <div
            class="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-100 transition-colors"
          >
            <QrCode class="h-7 w-7 text-purple-600" />
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-3">Branded QR Codes</h3>
          <p class="text-gray-500 leading-relaxed">
            Go beyond black and white. Customize QR codes with your brand
            colors, logos, and unique styles.
          </p>
        </div>

        <div
          class="group p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 hover:-translate-y-1 flex flex-col items-center text-center md:items-start md:text-left"
        >
          <div
            class="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-100 transition-colors"
          >
            <BarChart3 class="h-7 w-7 text-indigo-600" />
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-3">Deep Analytics</h3>
          <p class="text-gray-500 leading-relaxed">
            Make data-driven decisions. Monitor real-time clicks, geographic
            locations, and device types to optimize reach.
          </p>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <ResultModal
        :modelValue="isResultModalOpen"
        :link="generatedLink"
        @update:modelValue="closeResultModal"
      />
      <LoginModal v-model="isLoginModalOpen" />
    </Teleport>
  </div>
</template>