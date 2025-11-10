<template>
  <header class="bg-white shadow-sm">
    <nav
      class="container mx-auto px-4 lg:px-8 flex justify-between items-center h-16"
    >
      <router-link to="/" class="flex items-center gap-2">
        <Link class="h-6 w-6 text-indigo-600" />
        <span class="text-xl font-bold text-gray-800">Shortlink</span>
      </router-link>

      <div class="flex items-center gap-4">
        <router-link
          v-if="authStore.user"
          to="/dashboard"
          class="text-sm font-medium text-gray-600 hover:text-indigo-600"
        >
          Dashboard
        </router-link>

        <div v-if="authStore.user" class="flex items-center gap-3">
          <span class="text-sm text-gray-500 hidden sm:block">{{
            authStore.user.email
          }}</span>
          <button
            @click="authStore.logout()"
            class="text-sm font-medium text-gray-600 hover:text-indigo-600"
          >
            Logout
          </button>
        </div>

        <router-link
          v-if="!authStore.user"
          to="/login"
          class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-indigo-700"
        >
          Login
        </router-link>
      </div>
    </nav>
  </header>
</template>

<script setup>
import { useAuthStore } from "@/stores/useAuthStore";
import { Link } from "lucide-vue-next";

const authStore = useAuthStore();
</script>