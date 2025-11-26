<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  Link,
  Menu,
  X,
  LogIn,
  // ลบ icons ที่ไม่ใช้แล้วออก (เพราะย้ายไป UserDropdown หมดแล้ว)
} from "lucide-vue-next";
import LoginModal from "./LoginModal.vue";
import UserDropdown from "./UserDropdown.vue";

const authStore = useAuthStore();
const isLoginModalOpen = ref(false);
const isMobileMenuOpen = ref(false);
const isScrolled = ref(false);

// --- Actions ---

const openLoginModal = () => {
  isLoginModalOpen.value = true;
};

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

// ฟังก์ชันนี้ไม่จำเป็นแล้ว เพราะ UserDropdown จัดการเอง
// const handleMobileLogout = ...

// --- Scroll Effect ---
const handleScroll = () => {
  isScrolled.value = window.scrollY > 10;
};

onMounted(() => {
  window.addEventListener("scroll", handleScroll);
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});
</script>

<template>
  <div>
    <header
      class="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 transition-all duration-300"
      :class="{ 'shadow-sm': isScrolled }"
    >
      <div class="container mx-auto px-4 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <router-link to="/" class="flex items-center gap-2 group z-50">
            <div
              class="bg-indigo-50 p-2 rounded-lg group-hover:bg-indigo-100 transition-colors"
            >
              <Link class="h-5 w-5 text-indigo-600" />
            </div>
            <span class="text-lg font-bold text-gray-900 tracking-tight">
              Shortlink<span class="text-indigo-600">.QR</span>
            </span>
          </router-link>

          <div class="hidden md:flex items-center gap-6">
            <template v-if="authStore.user">
              <router-link
                v-if="authStore.user.role === 'ADMIN'"
                to="/admin/users"
                class="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
              >
                Manage Users
              </router-link>

              <router-link
                to="/dashboard"
                class="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
              >
                Dashboard
              </router-link>

              <div class="h-5 w-px bg-gray-200"></div>

              <UserDropdown />
            </template>

            <template v-else>
              <button
                @click="openLoginModal"
                class="inline-flex items-center justify-center px-5 py-2 text-sm font-semibold text-white transition-all bg-indigo-600 rounded-full hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <LogIn class="w-4 h-4 mr-2" />
                Log in
              </button>
            </template>
          </div>

          <div class="flex md:hidden items-center">
            <button
              @click="toggleMobileMenu"
              class="p-2 -mr-2 text-gray-600 rounded-md hover:bg-gray-100 focus:outline-none active:bg-gray-200 transition-colors"
              aria-label="Toggle Menu"
            >
              <Menu v-if="!isMobileMenuOpen" class="h-6 w-6" />
              <X v-else class="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="transform -translate-y-2 opacity-0"
        enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform -translate-y-2 opacity-0"
      >
        <div
          v-if="isMobileMenuOpen"
          class="md:hidden border-t border-gray-100 bg-white shadow-lg absolute w-full left-0"
        >
          <div class="px-4 py-4 space-y-3">
            <template v-if="authStore.user">
              <UserDropdown
                mode="mobile"
                @close-menu="isMobileMenuOpen = false"
              />
            </template>

            <template v-else>
              <p class="text-center text-sm text-gray-500 mb-4">
                Sign in to manage your links and track analytics.
              </p>
              <button
                @click="
                  isMobileMenuOpen = false;
                  openLoginModal();
                "
                class="w-full flex justify-center items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-md active:scale-95 transition-all"
              >
                <LogIn class="h-5 w-5" />
                Log in / Sign up
              </button>
            </template>
          </div>
        </div>
      </transition>
    </header>

    <Teleport to="body">
      <LoginModal v-model="isLoginModalOpen" />
    </Teleport>
  </div>
</template>