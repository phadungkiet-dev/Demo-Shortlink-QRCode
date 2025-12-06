<script setup>
// Core vue
import { ref } from "vue";
import { useRouter } from "vue-router";
// Stores
import { useAuthStore } from "@/stores/useAuthStore";
// Icons
import {
  ArrowLeft,
  Mail,
  Loader2,
  CheckCircle,
  AlertCircle,
  KeyRound,
} from "lucide-vue-next";

// -------------------------------------------------------------------
// Setup & State
// -------------------------------------------------------------------
const router = useRouter();
const authStore = useAuthStore();

const email = ref("");
const isLoading = ref(false);
const isSent = ref(false); // สถานะว่าส่งเมลสำเร็จหรือยัง
const errorMsg = ref(null);

// -------------------------------------------------------------------
// Methods & Actions
// -------------------------------------------------------------------
const handleSubmit = async () => {
  isLoading.value = true;
  errorMsg.value = null;

  try {
    // Use Store Action instead of direct API call
    await authStore.forgotPassword(email.value);
    isSent.value = true;
  } catch (error) {
    errorMsg.value =
      error.response?.data?.message || error.message || "Something went wrong.";
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div
    class="min-h-[calc(100vh-64px)] bg-gray-50/50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden"
  >
    <div
      class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50/50 rounded-full blur-3xl pointer-events-none"
    ></div>
    <div
      class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-50/50 rounded-full blur-3xl pointer-events-none"
    ></div>

    <div
      class="sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in-up"
    >
      <div
        class="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100/60 border border-gray-100 overflow-hidden"
      >
        <div class="px-8 pt-10 pb-6 text-center">
          <div
            class="inline-flex items-center justify-center p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 shadow-sm"
          >
            <KeyRound class="w-8 h-8" />
          </div>
          <h2 class="text-2xl font-bold text-gray-900 tracking-tight">
            Forgot Password?
          </h2>
          <p class="text-gray-500 mt-2 text-sm">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <div class="px-8 pb-10">
          <div v-if="isSent" class="text-center">
            <div
              class="mx-auto flex items-center justify-center h-16 w-16 rounded-3xl bg-green-50 mb-6 shadow-xl shadow-green-100/50"
            >
              <CheckCircle class="h-8 w-8 text-green-600" />
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Link Sent!</h3>
            <p class="text-sm text-gray-500 mb-6">
              We have sent a password reset link to <br /><strong
                class="text-gray-900 font-semibold"
                >{{ email }}</strong
              >. Please check your inbox.
            </p>
            <router-link
              to="/"
              class="inline-flex items-center justify-center w-full h-[46px] bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-95 group"
            >
              <ArrowLeft
                class="mr-2 w-5 h-5 transition-transform group-hover:-translate-x-1"
              />
              Back to Login
            </router-link>
          </div>

          <form v-else class="space-y-6" @submit.prevent="handleSubmit">
            <div class="space-y-1.5">
              <label class="block text-sm font-bold text-gray-700 ml-1"
                >Email address</label
              >
              <div class="relative group">
                <div
                  class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                >
                  <Mail
                    class="h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
                  />
                </div>
                <input
                  v-model="email"
                  type="email"
                  required
                  class="block w-full h-[46px] pl-10 pr-4 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-medium"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <transition
              enter-active-class="transition ease-out duration-200"
              enter-from-class="opacity-0 -translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
            >
              <div
                v-if="errorMsg"
                class="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium shadow-sm"
              >
                <AlertCircle class="w-5 h-5 shrink-0" />
                <span>{{ errorMsg }}</span>
              </div>
            </transition>

            <button
              type="submit"
              :disabled="isLoading"
              class="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/40 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
            >
              <Loader2 v-if="isLoading" class="animate-spin h-5 w-5" />
              <span v-else>Send Reset Link</span>
            </button>
          </form>

          <div v-if="!isSent" class="mt-8">
            <div class="relative mb-6">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-100"></div>
              </div>
              <div class="relative flex justify-center text-xs uppercase">
                <span class="px-2 bg-white text-gray-400 font-medium">Or</span>
              </div>
            </div>
            <div class="text-center">
              <router-link
                to="/"
                class="font-bold text-indigo-600 hover:text-indigo-700 transition-colors group inline-flex items-center gap-2"
              >
                <ArrowLeft
                  class="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
                />
                Back to Login
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>