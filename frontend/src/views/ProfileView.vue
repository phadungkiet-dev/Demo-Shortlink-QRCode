<template>
  <div class="min-h-screen bg-gray-50 py-10">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="max-w-xl mx-auto">
        <!-- Header Section -->
        <div class="bg-white shadow-lg rounded-xl p-8 mb-6">
          <div class="flex items-center space-x-4">
            <div
              class="flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 text-indigo-600"
            >
              <User class="h-6 w-6" />
            </div>
            <div>
              <h1 class="text-3xl font-bold text-gray-900">My Profile</h1>
              <p class="text-sm text-gray-500 mt-1">
                Manage your account settings and change your password.
              </p>
            </div>
          </div>

          <div class="mt-4 pt-4 border-t">
            <p class="text-base text-gray-700 font-medium">
              Email:
              <span class="text-indigo-600 font-semibold">{{
                authStore.user?.email || "Loading..."
              }}</span>
            </p>
            <p
              v-if="authStore.user?.isAdmin"
              class="text-xs text-red-500 font-medium mt-1"
            >
              (Admin User)
            </p>
          </div>
        </div>

        <!-- Change Password Form -->
        <div class="bg-white shadow-lg rounded-xl p-8">
          <h2
            class="text-2xl font-semibold text-gray-900 flex items-center mb-6"
          >
            <Lock class="h-5 w-5 mr-3 text-indigo-600" />
            Change Password
          </h2>

          <div v-if="authStore.user?.provider === 'LOCAL'">
            <p class="text-sm text-gray-600 mb-6">
              You are currently signed in with Email/Password. Please enter your
              old password and new password below.
            </p>

            <form @submit.prevent="handleChangePassword" class="space-y-6">
              <div>
                <label
                  for="old-password"
                  class="block text-sm font-medium text-gray-700"
                >
                  Old Password
                </label>
                <div class="relative mt-1">
                  <input
                    id="old-password"
                    v-model="formData.oldPassword"
                    :type="showOldPassword ? 'text' : 'password'"
                    required
                    class="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                  />
                  <button
                    type="button"
                    @click="showOldPassword = !showOldPassword"
                    class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    <component
                      :is="showOldPassword ? EyeOff : Eye"
                      class="h-5 w-5"
                    />
                  </button>
                </div>
              </div>

              <div>
                <label
                  for="new-password"
                  class="block text-sm font-medium text-gray-700"
                >
                  New Password
                </label>
                <div class="relative mt-1">
                  <input
                    id="new-password"
                    v-model="formData.newPassword"
                    :type="showNewPassword ? 'text' : 'password'"
                    required
                    minlength="6"
                    class="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                  />
                  <button
                    type="button"
                    @click="showNewPassword = !showNewPassword"
                    class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    <component
                      :is="showNewPassword ? EyeOff : Eye"
                      class="h-5 w-5"
                    />
                  </button>
                </div>
                <p class="mt-1 text-xs text-gray-500">Minimum 6 characters.</p>
              </div>

              <div>
                <label
                  for="confirm-password"
                  class="block text-sm font-medium text-gray-700"
                >
                  Confirm New Password
                </label>
                <div class="relative mt-1">
                  <input
                    id="confirm-password"
                    v-model="formData.confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    required
                    class="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                  />
                  <button
                    type="button"
                    @click="showConfirmPassword = !showConfirmPassword"
                    class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    <component
                      :is="showConfirmPassword ? EyeOff : Eye"
                      class="h-5 w-5"
                    />
                  </button>
                </div>
              </div>

              <p v-if="passwordMatchError" class="text-sm text-red-600">
                New Password and Confirm Password do not match.
              </p>
              <p v-if="apiError" class="text-sm text-red-600">
                Error: {{ apiError }}
              </p>

              <div class="pt-4 border-t">
                <button
                  type="submit"
                  :disabled="isLoading || passwordMatchError"
                  class="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <Loader2 v-if="isLoading" class="h-5 w-5 animate-spin mr-2" />
                  {{ isLoading ? "Processing..." : "Save New Password" }}
                </button>
              </div>
            </form>
          </div>

          <div
            v-else
            class="text-center py-8 bg-gray-50 rounded-lg border border-gray-200"
          >
            <p class="text-gray-600">
              You are signed in with <strong>Google</strong>.
            </p>
            <p class="text-sm text-gray-500 mt-2">
              Please manage your password through your Google Account settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";
import api from "@/services/api"; // Axios instance สำหรับเรียก API
import Swal from "sweetalert2";
import { User, Lock, Loader2, Eye, EyeOff } from "lucide-vue-next";

const authStore = useAuthStore();
const isLoading = ref(false);
const apiError = ref(null);

const showOldPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const formData = reactive({
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
});

// Computed property เพื่อเช็คว่า New Password และ Confirm Password ตรงกันหรือไม่
const passwordMatchError = computed(() => {
  return (
    formData.newPassword !== formData.confirmPassword &&
    formData.newPassword.length > 0
  );
});

// Logic สำหรับการเปลี่ยนรหัสผ่าน
const handleChangePassword = async () => {
  apiError.value = null;

  if (passwordMatchError.value) {
    // ไม่จำเป็นต้องทำอะไร เพราะปุ่มจะถูก Disable อยู่แล้ว
    return;
  }

  // Basic validation
  if (!formData.oldPassword || formData.newPassword.length < 6) {
    Swal.fire({
      icon: "warning",
      title: "Invalid Input",
      text: "Please ensure all fields are filled and the new password is at least 6 characters long.",
      confirmButtonColor: "#4F46E5",
    });
    return;
  }

  isLoading.value = true;
  try {
    const payload = {
      oldPassword: formData.oldPassword,
      newPassword: formData.newPassword,
      confirmPassword: formData.confirmPassword,
    };

    // เรียก API ที่มีอยู่แล้ว (POST /api/auth/change-password)
    await api.post("/auth/change-password", payload);

    Swal.fire({
      icon: "success",
      title: "Success!",
      text: "Your password has been changed successfully.",
      showConfirmButton: false,
      timer: 2000,
      toast: true,
      position: "top-end",
    });

    // Reset form fields
    formData.oldPassword = "";
    formData.newPassword = "";
    formData.confirmPassword = "";
  } catch (error) {
    console.error(
      "Change password failed:",
      error.response?.data || error.message
    );
    apiError.value =
      error.response?.data?.message || "An unexpected error occurred.";

    Swal.fire({
      icon: "error",
      title: "Failed to Change Password",
      text: apiError.value,
      confirmButtonColor: "#DC2626",
    });
  } finally {
    isLoading.value = false;
  }
};
</script>