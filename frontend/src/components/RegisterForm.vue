<template>
  <div>
    <!-- Error Message Display -->
    <div
      v-if="errorMsg"
      class="mb-4 rounded-md bg-red-50 p-4 border border-red-200"
    >
      <div class="flex">
        <div class="flex-shrink-0">
          <AlertCircle class="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Registration Failed</h3>
          <div class="mt-2 text-sm text-red-700">
            <p>{{ errorMsg }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Registration Form -->
    <form @submit.prevent="handleRegister" class="space-y-6">
      <div>
        <label
          for="email-register"
          class="block text-sm font-medium text-gray-700"
          >Email address</label
        >
        <input
          id="email-register"
          v-model="email"
          type="email"
          required
          class="mt-1 block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label
          for="password-register"
          class="block text-sm font-medium text-gray-700"
          >Password</label
        >
        <input
          id="password-register"
          v-model="password"
          type="password"
          required
          class="mt-1 block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p class="mt-1 text-xs text-gray-500">
          Must be at least 8 characters long.
        </p>
      </div>

      <div>
        <label
          for="confirm-password"
          class="block text-sm font-medium text-gray-700"
          >Confirm Password</label
        >
        <input
          id="confirm-password"
          v-model="confirmPassword"
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
        <Loader2 v-if="isLoading" class="h-5 w-5 animate-spin mr-2" />
        {{ isLoading ? "Creating account..." : "Create Account" }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";
import { Loader2, AlertCircle } from "lucide-vue-next";

// เราจะ emit (ส่งสัญญาณ) บอก Component แม่ (LoginModal) เมื่อสมัครสำเร็จ
const emit = defineEmits(["register-success"]);

const email = ref("");
const password = ref("");
const confirmPassword = ref(""); // (เพิ่มใหม่)
const isLoading = ref(false);
const errorMsg = ref(null); // (เพิ่มใหม่)
const authStore = useAuthStore();

const handleRegister = async () => {
  // (เพิ่มใหม่) ตรวจสอบ Password ก่อนส่ง
  if (password.value !== confirmPassword.value) {
    errorMsg.value = "Passwords do not match.";
    return;
  }

  isLoading.value = true;
  errorMsg.value = null; // Reset error

  try {
    // (สำคัญ) เราจะสร้าง action 'register' ในไฟล์ถัดไป
    await authStore.register(
      email.value,
      password.value,
      confirmPassword.value
    );

    // แจ้ง Modal แม่ ให้ปิดตัวเอง
    emit("register-success");
  } catch (error) {
    // Error handling (เช่น 'Email already in use') จะถูกส่งมาจาก store
    errorMsg.value = error.message || "An unknown error occurred.";
  } finally {
    isLoading.value = false;
  }
};
</script>