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
  KeyRound,
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

// Logic สร้างตัวย่อชื่อ (Initials) ให้เหมือน Header
const initials = computed(() => {
  if (!authStore.user?.email) return "?";
  const email = authStore.user.email;
  const parts = email.split("@")[0].split(".");

  if (parts.length > 1 && parts[0].length > 0 && parts[1].length > 0) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
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

  if (!formData.oldPassword || formData.newPassword.length < 8) {
    Swal.fire({
      icon: "warning",
      title: "Weak Password",
      text: "New password must be at least 8 characters long.",
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

    // Reset Form
    formData.oldPassword = "";
    formData.newPassword = "";
    formData.confirmPassword = "";
  } catch (error) {
    apiError.value = error.message || "Failed to update password.";
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-gray-50/50 py-10 lg:py-16">
    <div class="container mx-auto px-4 lg:px-8 max-w-3xl">
      <div
        class="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 mb-8 flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left"
      >
        <div class="relative shrink-0">
          <div
            class="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-xl ring-4 ring-white"
          >
            {{ initials }}
          </div>
          <div
            v-if="authStore.user?.role === 'ADMIN'"
            class="absolute -bottom-1 -right-1 bg-white p-2 rounded-full shadow-md"
            title="Admin User"
          >
            <ShieldCheck class="w-6 h-6 text-indigo-600" />
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <div
            class="flex flex-col sm:flex-row items-center gap-3 text-gray-500 justify-center sm:justify-start"
          >
            <div
              class="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100"
            >
              <Mail class="w-4 h-4 text-gray-400" />
              <span class="font-medium truncate">{{
                authStore.user?.email
              }}</span>
            </div>
            <span
              v-if="authStore.user?.role === 'ADMIN'"
              class="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg uppercase tracking-wide"
            >
              Admin Access
            </span>
          </div>
        </div>
      </div>

      <div
        class="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden"
      >
        <div
          class="px-8 py-6 border-b border-gray-100 bg-gray-50/30 flex items-center gap-3"
        >
          <div class="p-2.5 bg-indigo-50 rounded-xl">
            <KeyRound class="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-900">Security Settings</h2>
            <p class="text-sm text-gray-500">
              Manage your password and security preferences.
            </p>
          </div>
        </div>

        <div class="p-8">
          <div
            v-if="authStore.user?.provider === 'GOOGLE'"
            class="text-center py-12"
          >
            <div class="inline-flex p-4 bg-gray-50 rounded-full mb-4">
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                class="w-8 h-8"
                alt="Google"
              />
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">
              Signed in with Google
            </h3>
            <p class="text-gray-500 max-w-sm mx-auto">
              Your account is managed by Google. To change your password, please
              visit your Google Account settings.
            </p>
          </div>

          <form
            v-else
            @submit.prevent="handleChangePassword"
            class="space-y-6 max-w-xl mx-auto"
          >
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2"
                >Current Password</label
              >
              <div class="relative">
                <input
                  v-model="formData.oldPassword"
                  :type="showOldPassword ? 'text' : 'password'"
                  required
                  class="block w-full pl-4 pr-12 py-3 bg-gray-50 border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  @click="showOldPassword = !showOldPassword"
                  class="absolute inset-y-0 right-0 px-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <component
                    :is="showOldPassword ? EyeOff : Eye"
                    class="w-5 h-5"
                  />
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2"
                  >New Password</label
                >
                <div class="relative">
                  <input
                    v-model="formData.newPassword"
                    :type="showNewPassword ? 'text' : 'password'"
                    required
                    minlength="8"
                    class="block w-full pl-4 pr-12 py-3 bg-gray-50 border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    placeholder="Min 8 chars"
                  />
                  <button
                    type="button"
                    @click="showNewPassword = !showNewPassword"
                    class="absolute inset-y-0 right-0 px-4 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <component
                      :is="showNewPassword ? EyeOff : Eye"
                      class="w-5 h-5"
                    />
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2"
                  >Confirm New Password</label
                >
                <div class="relative">
                  <input
                    v-model="formData.confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    required
                    class="block w-full pl-4 pr-12 py-3 bg-gray-50 border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    placeholder="Repeat password"
                  />
                  <button
                    type="button"
                    @click="showConfirmPassword = !showConfirmPassword"
                    class="absolute inset-y-0 right-0 px-4 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <component
                      :is="showConfirmPassword ? EyeOff : Eye"
                      class="w-5 h-5"
                    />
                  </button>
                </div>
              </div>
            </div>

            <transition
              enter-active-class="transition ease-out duration-200"
              enter-from-class="opacity-0 -translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
            >
              <div
                v-if="passwordMatchError"
                class="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm font-medium"
              >
                <AlertCircle class="w-4 h-4" /> Passwords do not match
              </div>
            </transition>

            <transition
              enter-active-class="transition ease-out duration-200"
              enter-from-class="opacity-0 -translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
            >
              <div
                v-if="apiError"
                class="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm font-medium"
              >
                <AlertCircle class="w-4 h-4" /> {{ apiError }}
              </div>
            </transition>

            <div class="pt-4 flex justify-end">
              <button
                type="submit"
                :disabled="isLoading || passwordMatchError"
                class="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Loader2 v-if="isLoading" class="h-5 w-5 animate-spin" />
                <span>Update Password</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>