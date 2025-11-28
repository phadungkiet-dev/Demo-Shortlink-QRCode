<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Lock, Loader2, AlertCircle } from "lucide-vue-next";
import api from "@/services/api";
import Swal from "sweetalert2";
import { APP_CONFIG } from "@/config/constants";

const route = useRoute();
const router = useRouter();

const token = route.params.token; // รับ Token จาก URL
const password = ref("");
const confirmPassword = ref("");
const isLoading = ref(false);
const errorMsg = ref(null);

const minPassLen = APP_CONFIG.VALIDATION.PASSWORD_MIN_LEN;

const handleReset = async () => {
  if (password.value !== confirmPassword.value) {
    errorMsg.value = "Passwords do not match.";
    return;
  }
  if (password.value.length < minPassLen) {
    errorMsg.value = `Password must be at least ${minPassLen} characters.`;
    return;
  }

  isLoading.value = true;
  errorMsg.value = null;

  try {
    // ยิง API พร้อม Token และรหัสผ่านใหม่
    await api.post(`/auth/reset-password/${token}`, {
      password: password.value,
      confirmPassword: confirmPassword.value,
    });

    // สำเร็จ -> แจ้งเตือนและกลับหน้าแรก
    Swal.fire({
      icon: "success",
      title: "Success!",
      text: "Your password has been reset successfully.",
      confirmButtonColor: "#4F46E5",
    }).then(() => {
      router.push("/?login=true"); // กลับหน้าแรกพร้อมเปิด Modal Login
    });
  } catch (error) {
    errorMsg.value =
      error.message || "Failed to reset password. Link might be expired.";
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
        Set new password
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Please enter your new password below.
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div
        class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100"
      >
        <form class="space-y-6" @submit.prevent="handleReset">
          <div>
            <label class="block text-sm font-medium text-gray-700"
              >New Password</label
            >
            <div class="mt-1 relative rounded-md shadow-sm">
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              >
                <Lock class="h-5 w-5 text-gray-400" />
              </div>
              <input
                v-model="password"
                type="password"
                required
                class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3"
                placeholder="Minimum 8 characters"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Confirm Password</label
            >
            <div class="mt-1 relative rounded-md shadow-sm">
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              >
                <Lock class="h-5 w-5 text-gray-400" />
              </div>
              <input
                v-model="confirmPassword"
                type="password"
                required
                class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3"
                placeholder="Repeat password"
              />
            </div>
          </div>

          <div
            v-if="errorMsg"
            class="rounded-md bg-red-50 p-4 flex items-center gap-3"
          >
            <AlertCircle class="h-5 w-5 text-red-500 shrink-0" />
            <span class="text-sm font-medium text-red-800">{{ errorMsg }}</span>
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-all"
          >
            <Loader2 v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5" />
            {{ isLoading ? "Resetting..." : "Reset Password" }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>