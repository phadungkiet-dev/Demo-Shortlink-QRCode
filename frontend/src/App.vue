<template>
  <!-- Global Auth Check Loading -->
  <div
    v-if="!authStore.isAuthReady"
    class="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50"
  >
    <div class="flex flex-col items-center">
      <Loader2 class="h-10 w-10 text-indigo-600 animate-spin" />
      <span class="mt-4 text-gray-700">Connecting...</span>
    </div>
  </div>

  <!-- App Ready -->
  <div v-else class="flex flex-col min-h-screen">
    <AppHeader />
    <main class="flex-grow">
      <router-view />
    </main>
    <footer class="bg-gray-800 text-white p-4 text-center text-sm">
      <p>
        &copy; {{ new Date().getFullYear() }} Shortlink & QR. (Vite + Vue 3)
      </p>
    </footer>
  </div>
</template>

<script setup>
import { useAuthStore } from "@/stores/useAuthStore";
import AppHeader from "@/components/AppHeader.vue";
import { Loader2 } from "lucide-vue-next";

const authStore = useAuthStore();
// (Auth flow 1) เมื่อ App ถูกสร้าง ให้เริ่ม initAuth()
// router.beforeEach จะรอจนกว่า isAuthReady = true
// (ดูที่ router/index.js)
</script>