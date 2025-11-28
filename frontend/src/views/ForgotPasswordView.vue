<script setup>
import { ref } from "vue";
import { ArrowLeft, Mail, Loader2, CheckCircle } from "lucide-vue-next";
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
    errorMsg.value = error.message || "Something went wrong.";
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

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div
        class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100"
      >
        <div v-if="isSent" class="text-center py-6">
          <div
            class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4"
          >
            <CheckCircle class="h-6 w-6 text-green-600" />
          </div>
          <h3 class="text-lg leading-6 font-medium text-gray-900">
            Check your email
          </h3>
          <p class="mt-2 text-sm text-gray-500">
            We have sent a password reset link to <strong>{{ email }}</strong
            >.
          </p>
          <div class="mt-6">
            <router-link
              to="/"
              class="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Back to home
            </router-link>
          </div>
        </div>

        <form v-else class="space-y-6" @submit.prevent="handleSubmit">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700"
              >Email address</label
            >
            <div class="mt-1 relative rounded-md shadow-sm">
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              >
                <Mail class="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                v-model="email"
                type="email"
                required
                class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div v-if="errorMsg" class="rounded-md bg-red-50 p-4">
            <div class="flex">
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">{{ errorMsg }}</h3>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-all"
            >
              <Loader2
                v-if="isLoading"
                class="animate-spin -ml-1 mr-2 h-5 w-5"
              />
              {{ isLoading ? "Sending..." : "Send Reset Link" }}
            </button>
          </div>
        </form>

        <div v-if="!isSent" class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white text-gray-500"> Or </span>
            </div>
          </div>
          <div class="mt-6 text-center">
            <router-link
              to="/"
              class="font-medium text-indigo-600 hover:text-indigo-500 flex items-center justify-center gap-2"
            >
              <ArrowLeft class="w-4 h-4" /> Back to Login
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>