<script setup>
// Vue Core
import { ref } from "vue";
import { useRouter } from "vue-router";
// Stores
import { useAuthStore } from "@/stores/useAuthStore";
// Components
import AppHeader from "@/components/layout/AppHeader.vue"; 
import AppFooter from "@/components/layout/AppFooter.vue";
// Icons
import { Loader2 } from "lucide-vue-next";

// -------------------------------------------------------------------
// Setup & State
// -------------------------------------------------------------------
const authStore = useAuthStore();
const router = useRouter();

const isRouteLoading = ref(false);

// -------------------------------------------------------------------
// Logic & Listeners
// -------------------------------------------------------------------
// --- Router Guards (จัดการ Loading ระหว่างเปลี่ยนหน้า) ---
// ก่อนเปลี่ยนหน้า: ให้แสดง Loading Overlay
router.beforeEach((to, from, next) => {
  isRouteLoading.value = true;
  next();
});

// หลังเปลี่ยนหน้าเสร็จ: ปิด Loading Overlay
router.afterEach(() => {
  // หน่วงเวลาเล็กน้อยเพื่อให้ Transition นุ่มนวล
  setTimeout(() => {
    isRouteLoading.value = false;
  }, 300);
});
</script>

<template>
  <div
    v-if="!authStore.isAuthReady"
    class="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center space-y-4"
  >
    <div class="flex items-center gap-2 animate-pulse">
      <div class="bg-indigo-50 p-3 rounded-xl">
        <Loader2 class="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    </div>
    <p class="text-gray-500 text-sm font-medium">Initializing application...</p>
  </div>

  <div v-else class="flex flex-col min-h-screen">
    <!-- App Header -->
    <AppHeader />

    <main class="flex-grow relative flex flex-col">
      <div
        v-if="isRouteLoading"
        class="absolute inset-0 z-30 flex items-start justify-center pt-20 bg-white/50 backdrop-blur-[2px] transition-all duration-300"
      >
        <div class="bg-white p-3 rounded-full shadow-lg ring-1 ring-gray-100">
          <Loader2 class="h-6 w-6 text-indigo-600 animate-spin" />
        </div>
      </div>

      <!-- Main Content -->
      <router-view v-slot="{ Component }">
        <transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
          mode="out-in"
        >
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <!-- App Footer -->
    <AppFooter />
  </div>
</template>