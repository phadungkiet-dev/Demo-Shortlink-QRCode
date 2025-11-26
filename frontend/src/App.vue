<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";
import AppHeader from "@/components/AppHeader.vue";
import { Loader2, Link, Github, Twitter } from "lucide-vue-next";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const router = useRouter();

// State ควบคุม Loader ตอนเปลี่ยนหน้า
const isRouteLoading = ref(false);

// Hook ดักจับการเปลี่ยนหน้า
router.beforeEach((to, from, next) => {
  isRouteLoading.value = true;
  next();
});

router.afterEach(() => {
  // หน่วงเวลาเล็กน้อยเพื่อให้ Transition จบสวยๆ
  setTimeout(() => {
    isRouteLoading.value = false;
  }, 400);
});
</script>

<template>
  <div
    v-if="!authStore.isAuthReady"
    class="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center space-y-4"
  >
    <div class="flex items-center gap-2 animate-pulse">
      <div class="bg-indigo-50 p-2 rounded-lg">
        <Link class="h-8 w-8 text-indigo-600" />
      </div>
      <span class="text-2xl font-bold text-gray-900 tracking-tight">
        Shortlink<span class="text-indigo-600">.QR</span>
      </span>
    </div>
    <div class="flex items-center text-sm text-gray-500 font-medium">
      <Loader2 class="h-4 w-4 mr-2 animate-spin text-indigo-600" />
      Initializing...
    </div>
  </div>

  <div
    v-else
    class="flex flex-col min-h-screen bg-gray-50/50 font-sans text-slate-900"
  >
    <AppHeader />

    <main class="flex-grow relative flex flex-col">
      <div
        v-if="isRouteLoading"
        class="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm transition-all duration-300"
      >
        <div class="bg-white p-4 rounded-full shadow-xl ring-1 ring-gray-100">
          <Loader2 class="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
      </div>

      <router-view v-slot="{ Component }">
        <transition
          enter-active-class="transition ease-out duration-300"
          enter-from-class="opacity-0 translate-y-4"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition ease-in duration-200"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-4"
          mode="out-in"
        >
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="bg-white border-t border-gray-100 mt-auto">
      <div class="container mx-auto px-4 lg:px-8 py-8">
        <div
          class="flex flex-col md:flex-row justify-between items-center gap-4"
        >
          <div class="text-center md:text-left">
            <p class="text-sm text-gray-500 font-medium">
              &copy; {{ new Date().getFullYear() }} Shortlink.QR Inc.
            </p>
            <p class="text-xs text-gray-400 mt-1">
              Open-source link management for modern creators.
            </p>
          </div>

          <div class="flex items-center gap-6">
            <a
              href="https://github.com/phadungkiet-dev/Demo-Shortlink-QRCode"
              class="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span class="sr-only">GitHub</span>
              <Github class="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
/* Global styles หรือ Reset เล็กๆ น้อยๆ ถ้าจำเป็น */
body {
  @apply bg-gray-50; /* ตั้งพื้นหลัง default ให้เป็นสีเทาจางๆ เพื่อให้ card สีขาวเด่นขึ้น */
}
</style>