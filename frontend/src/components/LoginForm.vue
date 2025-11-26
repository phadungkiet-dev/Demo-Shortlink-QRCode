<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";
import { Loader2, Eye, EyeOff, LogIn } from "lucide-vue-next";

const emit = defineEmits(["login-success"]);

const email = ref("");
const password = ref("");
const showPassword = ref(false);
const isLoading = ref(false);
const authStore = useAuthStore();

const handleLogin = async () => {
  isLoading.value = true;
  try {
    await authStore.login(email.value, password.value);
    emit("login-success");
  } catch (error) {
    // Error handled by store
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <a
      href="/api/auth/google"
      class="flex items-center justify-center gap-3 w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98]"
    >
      <img
        class="h-5 w-5"
        src="https://www.svgrepo.com/show/475656/google-color.svg"
        alt="Google logo"
      />
      <span>Sign in with Google</span>
    </a>

    <div class="relative">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-gray-200"></div>
      </div>
      <div class="relative flex justify-center text-xs uppercase tracking-wide">
        <span class="px-3 bg-white text-gray-400">Or with email</span>
      </div>
    </div>

    <form @submit.prevent="handleLogin" class="space-y-5">
      <div class="space-y-1.5">
        <label
          for="email-login"
          class="block text-sm font-semibold text-gray-700 ml-1"
        >
          Email
        </label>
        <input
          id="email-login"
          v-model="email"
          type="email"
          required
          placeholder="Enter your email"
          class="block w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
        />
      </div>

      <div class="space-y-1.5">
        <label
          for="password-login"
          class="block text-sm font-semibold text-gray-700 ml-1"
        >
          Password
        </label>
        <div class="relative">
          <input
            id="password-login"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            placeholder="Enter your password"
            class="block w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 pr-11 transition-all duration-200"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <component :is="showPassword ? EyeOff : Eye" class="h-5 w-5" />
          </button>
        </div>
      </div>

      <button
        type="submit"
        :disabled="isLoading"
        class="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-indigo-500/40 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
      >
        <Loader2 v-if="isLoading" class="h-5 w-5 animate-spin" />
        <span v-else>Sign in</span>
      </button>
    </form>
  </div>
</template>

