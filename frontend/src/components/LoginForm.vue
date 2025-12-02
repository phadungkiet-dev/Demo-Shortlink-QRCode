<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";
import { Loader2, Eye, EyeOff } from "lucide-vue-next";

const emit = defineEmits(["login-success"]);
const authStore = useAuthStore();

const email = ref("");
const password = ref("");
const rememberMe = ref(false);
const showPassword = ref(false);
const isLoading = ref(false);

const handleLogin = async () => {
  isLoading.value = true;
  try {
    await authStore.login(email.value, password.value, rememberMe.value);
    emit("login-success");
  } catch (error) {
    // Error ถูกจัดการโดย Store (Swal) แล้ว แค่หยุด Loading พอ
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <a
      :href="`/api/auth/google?rememberMe=${rememberMe}`"
      class="flex items-center justify-center gap-3 w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98] shadow-sm"
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
        <label class="block text-sm font-semibold text-gray-700 ml-1"
          >Email</label
        >
        <input
          v-model="email"
          type="email"
          required
          placeholder="name@example.com"
          class="block w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
        />
      </div>

      <div class="space-y-1.5">
        <label class="block text-sm font-semibold text-gray-700 ml-1"
          >Password</label
        >
        <div class="relative">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            placeholder="Enter your password"
            class="block w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all pr-12"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute inset-y-0 right-0 px-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <component :is="showPassword ? EyeOff : Eye" class="h-5 w-5" />
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center ml-1">
          <input
            id="remember-me"
            v-model="rememberMe"
            type="checkbox"
            class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
          />
          <label
            for="remember-me"
            class="ml-2 block text-sm text-gray-600 cursor-pointer select-none"
          >
            Remember me
          </label>
        </div>

        <router-link
          to="/forgot-password"
          class="text-sm font-semibold text-indigo-600 hover:text-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 rounded px-1"
          @click="$emit('login-success')"
          tabindex="-1"
        >
          Forgot password?
        </router-link>
      </div>

      <button
        type="submit"
        :disabled="isLoading"
        class="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
      >
        <Loader2 v-if="isLoading" class="h-5 w-5 animate-spin" />
        <span v-else>Sign in</span>
      </button>
    </form>
  </div>
</template>

