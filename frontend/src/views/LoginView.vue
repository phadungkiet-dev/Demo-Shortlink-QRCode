<template>
  <div class="container mx-auto px-4 py-16">
    <div class="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
      <h2 class="text-2xl font-bold text-center text-gray-900">
        Login to your account
      </h2>

      <!-- Google OAuth Button -->
      <!-- (สำคัญ) เราใช้ /api เพราะมันจะถูก proxy -->
      <a
        href="/api/auth/google"
        class="mt-6 w-full flex justify-center items-center gap-3 px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
      >
        <img
          class="h-5 w-5"
          src="https://www.svgrepo.com/show/475656/google-color.svg"
          alt="Google logo"
        />
        <span>Sign in with Google</span>
      </a>

      <div class="mt-6 relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-300"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      <!-- Local Login Form -->
      <form @submit.prevent="handleLogin" class="mt-6 space-y-6">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700"
            >Email address</label
          >
          <input
            id="email"
            v-model="email"
            type="email"
            required
            class="mt-1 block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700"
            >Password</label
          >
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="mt-1 block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full px-4 py-3 bg-indigo-600 text-white font-medium rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
        >
          <Loader2 vD-if="isLoading" class="h-5 w-5 animate-spin mr-2" />
          {{ isLoading ? "Signing in..." : "Sign in" }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";
import { Loader2 } from "lucide-vue-next";

const email = ref("");
const password = ref("");
const isLoading = ref(false);
const authStore = useAuthStore();

const handleLogin = async () => {
  isLoading.value = true;
  try {
    await authStore.login(email.value, password.value);
    // (Redirect อยู่ใน store/router)
  } catch (error) {
    // (Error handling อยู่ใน store)
  } finally {
    isLoading.value = false;
  }
};
</script>