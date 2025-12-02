<script setup>
import { ref } from "vue";
import {
  ArrowLeft,
  Mail,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-vue-next";
import api from "@/services/api";
import { useRouter } from "vue-router";

const router = useRouter();
const email = ref("");
const isLoading = ref(false);
const isSent = ref(false); // สถานะว่าส่งเมลสำเร็จหรือยัง
const errorMsg = ref(null);

const handleSubmit = async () => {
  isLoading.value = true;
  errorMsg.value = null;

  try {
    await api.post("/auth/forgot-password", { email: email.value });
    isSent.value = true;
  } catch (error) {
    // แสดง Error จาก Backend (เช่น หาอีเมลไม่เจอ)
    errorMsg.value =
      error.response?.data?.message || error.message || "Something went wrong.";
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div
    class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8"
  >
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Reset your password
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Enter your email address and we will send you a link to reset your
        password.
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-fade-in-up">
      <div
        class="bg-white py-8 px-4 shadow-2xl shadow-indigo-100/60 sm:rounded-[2.5rem] sm:px-10 border border-gray-100 transition-all hover:shadow-indigo-200/60"
      >
        <div v-if="isSent" class="text-center py-6">
          <div
            class="mx-auto flex items-center justify-center h-16 w-16 rounded-3xl bg-green-50 mb-6 shadow-xl shadow-green-100/50"
          >
            <CheckCircle class="h-8 w-8 text-green-600" />
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mb-2">Link Sent!</h3>
          <p class="mt-2 text-sm text-gray-500">
            We have sent a password reset link to <br /><strong
              class="text-gray-900 font-semibold"
              >{{ email }}</strong
            >. Please check your inbox.
          </p>
          <div class="mt-8">
            <router-link
              to="/"
              class="font-bold text-indigo-600 hover:text-indigo-700 transition-colors group"
            >
              <span class="inline-flex items-center gap-2">
                <ArrowLeft
                  class="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
                />
                Back to Login
              </span>
            </router-link>
          </div>
        </div>

        <form v-else class="space-y-6" @submit.prevent="handleSubmit">
          <div>
            <label
              for="email"
              class="block text-sm font-semibold text-gray-700 mb-2"
              >Email address</label
            >
            <div class="mt-1 relative rounded-xl shadow-sm group">
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              >
                <Mail
                  class="h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
                />
              </div>
              <input
                id="email"
                v-model="email"
                type="email"
                required
                class="block w-full h-[46px] pl-10 pr-4 bg-gray-50 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div
            v-if="errorMsg"
            class="flex items-center gap-3 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm font-medium border border-red-100 shadow-sm animate-fade-in"
          >
            <AlertCircle class="w-5 h-5 shrink-0" />
            <span class="font-medium text-red-800">{{ errorMsg }}</span>
          </div>

          <div>
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full flex justify-center h-[46px] px-8 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/40 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] items-center gap-2"
            >
              <Loader2 v-if="isLoading" class="animate-spin h-5 w-5" />
              <span v-else>Send Reset Link</span>
            </button>
          </div>
        </form>

        <div v-if="!isSent" class="mt-8">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-200"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white text-gray-500 font-medium"> Or </span>
            </div>
          </div>
          <div class="mt-6 text-center">
            <router-link
              to="/"
              class="font-bold text-indigo-600 hover:text-indigo-700 transition-colors group"
            >
              <span class="inline-flex items-center justify-center gap-2">
                <ArrowLeft
                  class="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
                />
                Back to Login
              </span>
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>