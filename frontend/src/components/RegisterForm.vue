<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";
import { Loader2, AlertCircle, Eye, EyeOff, UserPlus } from "lucide-vue-next";

const emit = defineEmits(["register-success"]);

const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const isLoading = ref(false);
const errorMsg = ref(null);
const authStore = useAuthStore();

const handleRegister = async () => {
  if (password.value !== confirmPassword.value) {
    errorMsg.value = "Passwords do not match.";
    return;
  }

  isLoading.value = true;
  errorMsg.value = null;

  try {
    await authStore.register(
      email.value,
      password.value,
      confirmPassword.value
    );
    emit("register-success");
  } catch (error) {
    errorMsg.value = error.message || "An unknown error occurred.";
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
    >
      <div
        v-if="errorMsg"
        class="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700"
      >
        <AlertCircle class="h-5 w-5 shrink-0 mt-0.5" />
        <div class="text-sm font-medium">{{ errorMsg }}</div>
      </div>
    </transition>

    <form @submit.prevent="handleRegister" class="space-y-5">
      <div class="space-y-1.5">
        <label
          for="email-register"
          class="block text-sm font-semibold text-gray-700 ml-1"
        >
          Email address
        </label>
        <input
          id="email-register"
          v-model="email"
          type="email"
          required
          placeholder="name@example.com"
          class="block w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
        />
      </div>

      <div class="space-y-1.5">
        <label
          for="password-register"
          class="block text-sm font-semibold text-gray-700 ml-1"
        >
          Password
        </label>
        <div class="relative">
          <input
            id="password-register"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            placeholder="Create a password"
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
        <p class="text-xs text-gray-500 ml-1">At least 8 characters.</p>
      </div>

      <div class="space-y-1.5">
        <label
          for="confirm-password"
          class="block text-sm font-semibold text-gray-700 ml-1"
        >
          Confirm Password
        </label>
        <div class="relative">
          <input
            id="confirm-password"
            v-model="confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            required
            placeholder="Repeat password"
            class="block w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 pr-11 transition-all duration-200"
          />
          <button
            type="button"
            @click="showConfirmPassword = !showConfirmPassword"
            class="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <component
              :is="showConfirmPassword ? EyeOff : Eye"
              class="h-5 w-5"
            />
          </button>
        </div>
      </div>

      <button
        type="submit"
        :disabled="isLoading"
        class="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-indigo-500/40 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
      >
        <Loader2 v-if="isLoading" class="h-5 w-5 animate-spin" />
        <span v-else>Create Account</span>
      </button>
    </form>
  </div>
</template>