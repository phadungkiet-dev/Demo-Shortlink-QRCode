<script setup>
import { useAuthStore } from "@/stores/useAuthStore";
import UserDashboard from "@/components/UserDashboard.vue";
import { Loader2 } from "lucide-vue-next";

const authStore = useAuthStore();
</script>

<template>
  <div class="min-h-screen bg-gray-50/50">
    <UserDashboard v-if="authStore.user" />

    <div v-else class="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 class="h-10 w-10 text-indigo-600 animate-spin mb-4" />
      <p class="text-gray-500 font-medium">Loading dashboard...</p>
    </div>
  </div>
</template>