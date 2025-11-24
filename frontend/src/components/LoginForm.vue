<template>
  <div>
    <a
      href="/api/auth/google"
      class="w-full flex justify-center items-center gap-3 px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
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

    <form @submit.prevent="handleLogin" class="mt-6 space-y-6">
      <div>
        <label for="email-login" class="block text-sm font-medium text-gray-700"
          >Email address</label
        >
        <input
          id="email-login"
          v-model="email"
          type="email"
          required
          class="mt-1 block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div>
        <label
          for="password-login"
          class="block text-sm font-medium text-gray-700"
          >Password</label
        >
        <div class="relative mt-1">
          <input
            id="password-login"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            class="block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 pr-10"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          >
            <component :is="showPassword ? EyeOff : Eye" class="h-5 w-5" />
          </button>
        </div>
      </div>

      <button
        type="submit"
        :disabled="isLoading"
        class="w-full px-4 py-3 bg-indigo-600 text-white font-medium rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
      >
        <Loader2 v-if="isLoading" class="h-5 w-5 animate-spin mr-2" />
        {{ isLoading ? "Signing in..." : "Sign in" }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";
import { Loader2, Eye, EyeOff } from "lucide-vue-next";

// เราจะ emit (ส่งสัญญาณ) บอก Component แม่ เมื่อ Login สำเร็จ
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
    // แจ้ง Component แม่ (เช่น Modal) ให้ปิดตัวเอง
    emit("login-success");
  } catch (error) {
    // Error handling อยู่ใน store แล้ว
  } finally {
    isLoading.value = false;
  }
};
</script>