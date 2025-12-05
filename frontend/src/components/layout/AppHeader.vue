<script setup>
// Vue Core
import { ref, onMounted, onUnmounted } from "vue";
// Stores
import { useAuthStore } from "@/stores/useAuthStore";
// Components
import LoginModal from "@/components/LoginModal.vue";
import UserDropdown from "@/components/UserDropdown.vue";
// Icons
import { Link, Menu, X, LogIn } from "lucide-vue-next";

// -------------------------------------------------------------------
// Setup & State
// -------------------------------------------------------------------
const authStore = useAuthStore();
const isLoginModalOpen = ref(false);
const isMobileMenuOpen = ref(false);
const isScrolled = ref(false);

// -------------------------------------------------------------------
// Scroll Listener (For sticky header effect)
// -------------------------------------------------------------------
const handleScroll = () => {
  isScrolled.value = window.scrollY > 10;
};

onMounted(() => window.addEventListener("scroll", handleScroll));
onUnmounted(() => window.removeEventListener("scroll", handleScroll));
</script>

<template>
  <div>
    <header
      class="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300"
      :class="{ 'shadow-sm': isScrolled }"
    >
      <div class="container mx-auto px-4 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <router-link to="/" class="flex items-center gap-2 group z-50">
            <div
              class="bg-indigo-50 p-2 rounded-xl group-hover:bg-indigo-100 transition-colors duration-300"
            >
              <Link class="h-6 w-6 text-indigo-600" />
            </div>
            <span class="text-xl font-bold text-gray-900 tracking-tight">
              Shortlink<span class="text-indigo-600">.QR</span>
            </span>
          </router-link>

          <div class="hidden md:flex items-center gap-6">
            <template v-if="authStore.user">
              <UserDropdown mode="desktop" />
            </template>

            <template v-else>
              <button
                @click="isLoginModalOpen = true"
                class="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-95"
              >
                <LogIn class="w-4 h-4 mr-2" /> Sign in
              </button>
            </template>
          </div>

          <div class="flex md:hidden">
            <button
              @click="isMobileMenuOpen = !isMobileMenuOpen"
              class="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <component :is="isMobileMenuOpen ? X : Menu" class="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="-translate-y-2 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="-translate-y-2 opacity-0"
      >
        <div
          v-if="isMobileMenuOpen"
          class="md:hidden border-t border-gray-100 bg-white shadow-xl absolute w-full left-0 px-4 py-6 space-y-4"
        >
          <template v-if="authStore.user">
            <UserDropdown
              mode="mobile"
              @close-menu="isMobileMenuOpen = false"
            />
          </template>

          <template v-else>
            <p class="text-center text-sm text-gray-500">
              Sign in to manage your links.
            </p>
            <button
              @click="
                isMobileMenuOpen = false;
                isLoginModalOpen = true;
              "
              class="w-full flex justify-center items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md active:scale-95 transition-all"
            >
              <LogIn class="h-5 w-5" /> Sign in / Sign up
            </button>
          </template>
        </div>
      </transition>
    </header>

    <Teleport to="body">
      <LoginModal v-model="isLoginModalOpen" />
    </Teleport>
  </div>
</template>