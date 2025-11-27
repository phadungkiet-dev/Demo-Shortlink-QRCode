<script setup>
import { reactive, ref, computed } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";
import api from "@/services/api";
import Swal from "sweetalert2";
import {
  User,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Mail,
} from "lucide-vue-next";

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

// ==========================================
// [FIX] แก้ไข Logic Initials ให้เหมือน Header
// ==========================================
const initials = computed(() => {
  if (!authStore.user?.email) return "?";

  const email = authStore.user.email;
  // แยกส่วนหน้า @ ออกมา แล้วลองแยกด้วยจุด (.)
  const parts = email.split("@")[0].split(".");

  // ถ้าเจอจุด (เช่น phadungkiet.b) ให้เอาตัวแรกของทั้งสองคำ (P + B)
  if (parts.length > 1 && parts[0].length > 0 && parts[1].length > 0) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // ถ้าไม่เจอจุด ให้เอา 2 ตัวแรกปกติ
  return email.substring(0, 2).toUpperCase();
});

const passwordMatchError = computed(() => {
  return (
    formData.newPassword !== formData.confirmPassword &&
    formData.newPassword.length > 0
  );
});

const handleChangePassword = async () => {
  apiError.value = null;

  if (passwordMatchError.value) return;

  if (!formData.oldPassword || formData.newPassword.length < 6) {
    Swal.fire({
      icon: "warning",
      title: "Invalid Input",
      text: "Password must be at least 6 characters long.",
      confirmButtonColor: "#4F46E5",
    });
    return;
  }

  isLoading.value = true;
  try {
    await api.post("/auth/change-password", {
      oldPassword: formData.oldPassword,
      newPassword: formData.newPassword,
      confirmPassword: formData.confirmPassword,
    });

    Swal.fire({
      icon: "success",
      title: "Password Updated",
      text: "Your password has been changed successfully.",
      showConfirmButton: false,
      timer: 2000,
      toast: true,
      position: "top-end",
    });

    formData.oldPassword = "";
    formData.newPassword = "";
    formData.confirmPassword = "";
  } catch (error) {
    apiError.value = error.response?.data?.message || "An error occurred.";
    Swal.fire({
      icon: "error",
      title: "Failed",
      text: apiError.value,
      confirmButtonColor: "#ef4444",
    });
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-gray-50/50 py-12">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="max-w-2xl mx-auto space-y-8">
        <div
          class="bg-white shadow-xl shadow-indigo-100/50 rounded-3xl p-8 border border-white"
        >
          <div
            class="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left"
          >
            <div class="relative shrink-0">
              <div
                class="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg ring-4 ring-indigo-50"
              >
                {{ initials }}
              </div>
              <div
                v-if="authStore.user?.role === 'ADMIN'"
                class="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-md"
                title="Admin User"
              >
                <ShieldCheck class="w-5 h-5 text-indigo-600" />
              </div>
            </div>

            <div class="flex-1 min-w-0">
              <h1 class="text-2xl font-bold text-gray-900">My Profile</h1>
              <div
                class="mt-2 flex flex-col sm:flex-row items-center gap-3 text-gray-500"
              >
                <div
                  class="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100"
                >
                  <Mail class="w-4 h-4" />
                  <span class="text-sm font-medium truncate max-w-[200px]">{{
                    authStore.user?.email
                  }}</span>
                </div>
                <span
                  v-if="authStore.user?.role === 'ADMIN'"
                  class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded"
                >
                  ADMIN
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          class="bg-white shadow-xl shadow-gray-100/50 rounded-3xl p-8 border border-white"
        >
          <div
            class="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100"
          >
            <div class="p-2 bg-indigo-50 rounded-lg">
              <Lock class="w-5 h-5 text-indigo-600" />
            </div>
            <h2 class="text-xl font-bold text-gray-900">Security Settings</h2>
          </div>

          <div v-if="authStore.user?.provider === 'LOCAL'">
            <p class="text-sm text-gray-500 mb-6">
              Update your password to keep your account secure.
            </p>

            <form @submit.prevent="handleChangePassword" class="space-y-5">
              <div>
                <label
                  class="block text-sm font-semibold text-gray-700 mb-1.5 ml-1"
                  >Current Password</label
                >
                <div class="relative">
                  <input
                    v-model="formData.oldPassword"
                    :type="showOldPassword ? 'text' : 'password'"
                    required
                    class="block w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    @click="showOldPassword = !showOldPassword"
                    class="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                  >
                    <component
                      :is="showOldPassword ? EyeOff : Eye"
                      class="h-5 w-5"
                    />
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label
                    class="block text-sm font-semibold text-gray-700 mb-1.5 ml-1"
                    >New Password</label
                  >
                  <div class="relative">
                    <input
                      v-model="formData.newPassword"
                      :type="showNewPassword ? 'text' : 'password'"
                      required
                      minlength="6"
                      class="block w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                    />
                    <button
                      type="button"
                      @click="showNewPassword = !showNewPassword"
                      class="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                    >
                      <component
                        :is="showNewPassword ? EyeOff : Eye"
                        class="h-5 w-5"
                      />
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    class="block text-sm font-semibold text-gray-700 mb-1.5 ml-1"
                    >Confirm Password</label
                  >
                  <div class="relative">
                    <input
                      v-model="formData.confirmPassword"
                      :type="showConfirmPassword ? 'text' : 'password'"
                      required
                      class="block w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                    />
                    <button
                      type="button"
                      @click="showConfirmPassword = !showConfirmPassword"
                      class="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                    >
                      <component
                        :is="showConfirmPassword ? EyeOff : Eye"
                        class="h-5 w-5"
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div
                v-if="passwordMatchError"
                class="text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-100"
              >
                New passwords do not match.
              </div>
              <div
                v-if="apiError"
                class="text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-100"
              >
                {{ apiError }}
              </div>

              <div class="pt-4 flex justify-end">
                <button
                  type="submit"
                  :disabled="isLoading || passwordMatchError"
                  class="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] flex items-center gap-2"
                >
                  <Loader2 v-if="isLoading" class="h-5 w-5 animate-spin" />
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>

          <div
            v-else
            class="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200"
          >
            <div class="inline-flex p-3 bg-white rounded-full shadow-sm mb-3">
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                class="w-6 h-6"
                alt="Google"
              />
            </div>
            <h3 class="text-gray-900 font-semibold">Signed in with Google</h3>
            <p class="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
              Your password is managed by Google. To change it, please visit
              your Google Account settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>