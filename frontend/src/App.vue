<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "vue-router";
import AppHeader from "@/components/AppHeader.vue";
import { Loader2, Github } from "lucide-vue-next";

const authStore = useAuthStore();
const router = useRouter();
const isRouteLoading = ref(false);

// --- Router Guards (จัดการ Loading ระหว่างเปลี่ยนหน้า) ---
// ก่อนเปลี่ยนหน้า: ให้แสดง Loading
router.beforeEach((to, from, next) => {
  isRouteLoading.value = true;
  next();
});

// หลังเปลี่ยนหน้าเสร็จ: ปิด Loading
router.afterEach(() => {
  // หน่วงเวลาเล็กน้อยเพื่อให้ Transition นุ่มนวล
  setTimeout(() => {
    isRouteLoading.value = false;
  }, 300);
});
</script>

<template>
  <!-- 
    Initializing (กำลังเริ่มระบบ)
    แสดงหน้า Loading เต็มจอ ระหว่างรอเช็ค Session กับ Backend 
    (authStore.initAuth ยังไม่เสร็จ)
  -->
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

  <!-- 
    Ready (ระบบพร้อมใช้งาน) แสดง Layout หลักของเว็บไซต์
  -->
  <div v-else class="flex flex-col min-h-screen">
    <!-- Header: เมนูบนสุด (Sticky) -->
    <AppHeader />
    <!-- Main Content: พื้นที่แสดงผลของแต่ละหน้า -->
    <main class="flex-grow relative flex flex-col">
      <!-- Route Loading Overlay: แสดงเฉพาะตรงกลาง ระหว่างเปลี่ยนหน้า -->
      <div
        v-if="isRouteLoading"
        class="absolute inset-0 z-30 flex items-start justify-center pt-20 bg-white/50 backdrop-blur-[2px] transition-all duration-300"
      >
        <div class="bg-white p-3 rounded-full shadow-lg ring-1 ring-gray-100">
          <Loader2 class="h-6 w-6 text-indigo-600 animate-spin" />
        </div>
      </div>

      <!-- Router View: จุดที่หน้าเว็บจริงๆ (Home, Dashboard) จะถูกโหลดมาใส่ -->
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

    <!-- Footer: ส่วนล่างสุด -->
    <footer class="bg-white border-t border-gray-100 mt-auto">
      <div class="container mx-auto px-4 lg:px-8 py-8">
        <div
          class="flex flex-col md:flex-row justify-between items-center gap-4"
        >
          <div class="text-center md:text-left">
            <p class="text-sm text-gray-500 font-medium">
              &copy; {{ new Date().getFullYear() }} Shortlink.QR
            </p>
            <p class="text-xs text-gray-400 mt-1">
              Built for Security & Speed. Designed for Education.
            </p>
          </div>

          <a
            href="https://github.com/phadungkiet-dev/Demo-Shortlink-QRCode"
            target="_blank"
            rel="noopener noreferrer"
            class="text-gray-400 hover:text-gray-900 transition-colors p-2 hover:bg-gray-50 rounded-full"
          >
            <span class="sr-only">GitHub</span>
            <Github class="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>