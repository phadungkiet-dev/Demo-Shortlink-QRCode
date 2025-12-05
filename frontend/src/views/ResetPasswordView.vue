<script setup>
import { ref } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";
import { APP_CONFIG } from "@/config/constants";
import {
  Lock,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-vue-next";

// Config
const MIN_PASS_LEN = APP_CONFIG.VALIDATION.PASSWORD_MIN_LEN;

const route = useRoute();
const token = route.params.token;

const password = ref("");
const confirmPassword = ref("");
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const isLoading = ref(false);
const isSuccess = ref(false);
const errorMsg = ref(null);

// ตรวจสอบ Token เบื้องต้น
if (!token) {
  errorMsg.value = "Invalid or missing reset token.";
}

const handleSubmit = async () => {
  // Reset Error
  errorMsg.value = null;

  // Validation
  if (password.value !== confirmPassword.value) {
    errorMsg.value = "Passwords do not match.";
    return;
  }
  if (password.value.length < MIN_PASS_LEN) {
    errorMsg.value = `Password must be at least ${MIN_PASS_LEN} characters.`;
    return;
  }

  isLoading.value = true;

  try {
    await authStore.resetPassword(token, password.value, confirmPassword.value);
    isSuccess.value = true;
  } catch (error) {
    errorMsg.value =
      error.response?.data?.message ||
      error.message ||
      "Failed to reset password. Link might be expired.";
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div
    class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden"
  >
    <div
      class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50/50 rounded-full blur-3xl pointer-events-none"
    ></div>
    <div
      class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-50/50 rounded-full blur-3xl pointer-events-none"
    ></div>

    <div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
      <div class="text-center mb-8">
        <div
          class="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-gray-100 mb-4"
        >
          <KeyRound class="h-8 w-8 text-indigo-600" />
        </div>
        <h2 class="text-3xl font-extrabold text-gray-900 tracking-tight">
          Set New Password
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Create a strong password for your account.
        </p>
      </div>
    </div>

    <div
      class="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in-up"
    >
      <div
        class="bg-white py-8 px-4 shadow-2xl shadow-indigo-100/60 sm:rounded-[2.5rem] sm:px-10 border border-gray-100 transition-all hover:shadow-indigo-200/50"
      >
        <div v-if="isSuccess" class="text-center py-8">
          <div
            class="mx-auto flex items-center justify-center h-20 w-20 rounded-3xl bg-green-50 mb-6 shadow-xl shadow-green-100/50"
          >
            <CheckCircle class="h-10 w-10 text-green-600" />
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mb-3">All set!</h3>
          <p class="text-gray-500 mb-8 leading-relaxed">
            Your password has been successfully updated. <br />
            You can now sign in with your new password.
          </p>
          <router-link
            to="/?login=true"
            class="inline-flex items-center justify-center w-full h-[46px] bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/40 transition-all transform active:scale-[0.98] group"
          >
            Sign in now
            <ArrowRight
              class="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1"
            />
          </router-link>
        </div>

        <div
          v-else-if="errorMsg && !password && !isLoading"
          class="text-center py-8"
        >
          <div
            class="mx-auto flex items-center justify-center h-20 w-20 rounded-3xl bg-red-50 mb-6 shadow-xl shadow-red-100/50"
          >
            <AlertCircle class="h-10 w-10 text-red-500" />
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mb-3">Invalid Link</h3>
          <p class="text-gray-500 mb-8 font-medium">
            {{ errorMsg }}
          </p>
          <router-link
            to="/forgot-password"
            class="inline-flex items-center justify-center w-full h-[46px] bg-white border-2 border-indigo-100 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all active:scale-[0.98]"
          >
            Request new link
          </router-link>
        </div>

        <form v-else class="space-y-6" @submit.prevent="handleSubmit">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2 ml-1"
              >New Password</label
            >
            <div class="relative group">
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              >
                <Lock
                  class="h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
                />
              </div>
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                :minlength="MIN_PASS_LEN"
                class="block w-full h-[46px] pl-10 pr-12 bg-gray-50 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-medium"
                :placeholder="`Min ${MIN_PASS_LEN} characters`"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 px-4 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
              >
                <component :is="showPassword ? EyeOff : Eye" class="h-5 w-5" />
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2 ml-1"
              >Confirm Password</label
            >
            <div class="relative group">
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              >
                <Lock
                  class="h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
                />
              </div>
              <input
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                required
                :minlength="MIN_PASS_LEN"
                class="block w-full h-[46px] pl-10 pr-12 bg-gray-50 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-medium"
                placeholder="Repeat password"
              />
              <button
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute inset-y-0 right-0 px-4 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
              >
                <component
                  :is="showConfirmPassword ? EyeOff : Eye"
                  class="h-5 w-5"
                />
              </button>
            </div>
          </div>

          <transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
          >
            <div
              v-if="errorMsg"
              class="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium shadow-sm"
            >
              <AlertCircle class="h-5 w-5 shrink-0" />
              {{ errorMsg }}
            </div>
          </transition>

          <button
            type="submit"
            :disabled="isLoading || !password || !confirmPassword"
            class="w-full flex items-center justify-center h-[46px] px-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/40 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] gap-2"
          >
            <Loader2 v-if="isLoading" class="animate-spin h-5 w-5" />
            <span v-else>Update Password</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>