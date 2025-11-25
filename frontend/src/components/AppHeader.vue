<template>
  <div>
    <header class="bg-white shadow-sm">
      <nav
        class="container mx-auto px-4 lg:px-8 flex justify-between items-center h-16"
      >
        <router-link to="/" class="flex items-center gap-2">
          <Link class="h-6 w-6 text-indigo-600" />
          <QrCode class="h-6 w-6 text-indigo-600" />
          <span class="text-xl font-bold text-gray-800">Shortlink-QRcode</span>
        </router-link>

        <div class="flex items-center gap-4">
          <router-link
            v-if="authStore.user"
            to="/dashboard"
            class="text-sm font-medium text-gray-600 hover:text-indigo-600"
          >
            Dashboard
          </router-link>

          <router-link
            v-if="authStore.user?.role === 'ADMIN'"
            to="/admin/users"
            class="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-md hover:bg-indigo-100 transition-colors"
          >
            Manage Users
          </router-link>

          <!-- (เพิ่มใหม่) 2. เพิ่ม Avatar/Dropdown Component ใหม่ -->
          <UserDropdown v-if="authStore.user" />

          <button
            v-if="!authStore.user"
            @click="openLoginModal"
            class="p-2 rounded-full text-gray-600 hover:text-indigo-600 hover:bg-gray-100"
            aria-label="Login"
          >
            <User class="h-5 w-5" />
          </button>
        </div>
      </nav>
    </header>
    <Teleport to="body">
      <LoginModal v-model="isLoginModalOpen" />
    </Teleport>
    <!-- <LoginModal v-model="isLoginModalOpen" /> -->
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";
import { Link, QrCode, User } from "lucide-vue-next";
import LoginModal from "./LoginModal.vue"; // (Req #3) Import Modal
import UserDropdown from "./UserDropdown.vue"; // (เพิ่มใหม่) 1. Import

const authStore = useAuthStore();
// State สำหรับควบคุม Modal
const isLoginModalOpen = ref(false);
const openLoginModal = () => {
  console.log("User button clicked! State is now true.");
  isLoginModalOpen.value = true;
};
</script>