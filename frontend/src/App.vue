<template>
  <div
    v-if="!authStore.isAuthReady"
    class="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50"
  >
    <div class="flex flex-col items-center">
      <Loader2 class="h-10 w-10 text-indigo-600 animate-spin" />
      <span class="mt-4 text-gray-700">Connecting...</span>
    </div>
  </div>

  <div v-else class="flex flex-col min-h-screen">
    <AppHeader />

    <main class="flex-grow relative">
      <div
        v-if="isRouteLoading"
        class="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-40"
      >
        <Loader2 class="h-12 w-12 text-indigo-600 animate-spin mb-4" />
        <p class="text-gray-500 font-medium animate-pulse">Loading...</p>
      </div>

      <div v-show="!isRouteLoading" class="animate-fade-in-up h-full">
        <router-view />
      </div>
    </main>

    <footer class="bg-gray-800 text-white p-4 text-center text-sm mt-auto">
      <p>
        &copy; {{ new Date().getFullYear() }} Shortlink & QR. (Vite + Vue 3)
      </p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";
import AppHeader from "@/components/AppHeader.vue";
import { Loader2 } from "lucide-vue-next";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const router = useRouter();

//  State สำหรับ Global Loader
const isRouteLoading = ref(false);

//  ดักจับการเปลี่ยนหน้า
router.beforeEach((to, from, next) => {
  // เริ่มโหลด
  isRouteLoading.value = true;
  next();
});

router.afterEach(() => {
  // โหลดเสร็จ -> หน่วงเวลา 0.8 วินาทีให้เห็น Effect
  setTimeout(() => {
    isRouteLoading.value = false;
  }, 500);
});
</script>

<style scoped>
/*  Animation  */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.5s ease-out forwards;
}
</style>