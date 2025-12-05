<script setup>
// Core Vue
import { reactive, ref, computed } from "vue";
import api from "@/services/api";
import Swal from "sweetalert2";
// Stores
import { useAuthStore } from "@/stores/useAuthStore";
// Config
import { APP_CONFIG } from "@/config/constants";
// Icons
import {
  User,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Mail,
  KeyRound,
  AlertCircle,
  Check,
} from "lucide-vue-next";

// -------------------------------------------------------------------
// Setup & State Management
// -------------------------------------------------------------------
const authStore = useAuthStore();
const isLoading = ref(false);
const apiError = ref(null);

const showOldPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const minPassLen = APP_CONFIG.VALIDATION.PASSWORD_MIN_LEN;

const formData = reactive({
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
});

// -------------------------------------------------------------------
// Computed Properties
// -------------------------------------------------------------------
// User Initials
const initials = computed(() => {
  if (!authStore.user?.email) return "?";
  const email = authStore.user.email;
  const parts = email.split("@")[0].split(".");

  if (parts.length > 1 && parts[0].length > 0 && parts[1].length > 0) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
});

// [NEW] Password Validation Rules (Same as RegisterForm)
const passwordRules = computed(() => {
  const pwd = formData.newPassword;
  return [
    {
      label: `At least ${minPassLen} characters`,
      valid: pwd.length >= minPassLen,
    },
    {
      label: "1 Uppercase letter (A-Z)",
      valid: /[A-Z]/.test(pwd),
    },
    {
      label: "1 Lowercase letter (a-z)",
      valid: /[a-z]/.test(pwd),
    },
    {
      label: "1 Number (0-9)",
      valid: /[0-9]/.test(pwd),
    },
    {
      label: "1 Special character (!@#...)",
      valid: /[\W_]/.test(pwd),
    },
  ];
});

// Check if all rules passed
const isPasswordValid = computed(() => {
  return passwordRules.value.every((rule) => rule.valid);
});

// Check confirm match
const passwordMatchError = computed(() => {
  return (
    formData.newPassword !== formData.confirmPassword &&
    formData.newPassword.length > 0
  );
});

// -------------------------------------------------------------------
// Methods & Actions
// -------------------------------------------------------------------
const handleChangePassword = async () => {
  apiError.value = null;

  if (passwordMatchError.value) return;

  // Validate Rules before sending
  if (!isPasswordValid.value) {
    apiError.value = "Please meet all password requirements.";
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
            v-if="authStore.user?.role === APP_CONFIG.USER_ROLES.ADMIN"
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
              v-if="authStore.user?.role === APP_CONFIG.USER_ROLES.ADMIN"
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
                  class="block w-full h-[46px] pl-4 pr-12 bg-gray-50 border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-gray-900 placeholder-gray-400"
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

            <div class="grid grid-cols-1 gap-6">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2"
                  >New Password</label
                >
                <div class="relative">
                  <input
                    v-model="formData.newPassword"
                    :type="showNewPassword ? 'text' : 'password'"
                    required
                    :minlength="minPassLen"
                    class="block w-full h-[46px] pl-4 pr-12 bg-gray-50 border-gray-200 rounded-xl focus:ring-4 transition-all text-gray-900 placeholder-gray-400"
                    :class="
                      isPasswordValid && formData.newPassword
                        ? 'focus:border-emerald-500 focus:ring-emerald-500/10'
                        : 'focus:border-indigo-500 focus:ring-indigo-500/10'
                    "
                    :placeholder="`Min ${minPassLen} chars`"
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

                <div
                  class="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 transition-all"
                >
                  <p class="text-xs font-bold text-gray-500 mb-2 ml-1">
                    Must contain:
                  </p>
                  <ul class="space-y-1">
                    <li
                      v-for="(rule, index) in passwordRules"
                      :key="index"
                      class="flex items-center gap-2 text-xs transition-colors duration-300"
                      :class="
                        rule.valid
                          ? 'text-emerald-600 font-medium'
                          : 'text-gray-400'
                      "
                    >
                      <div
                        class="w-4 h-4 rounded-full flex items-center justify-center border transition-all duration-300 shrink-0"
                        :class="
                          rule.valid
                            ? 'bg-emerald-100 border-emerald-200 scale-110'
                            : 'border-gray-200 bg-white'
                        "
                      >
                        <Check
                          v-if="rule.valid"
                          class="w-2.5 h-2.5 text-emerald-600"
                        />
                        <div
                          v-else
                          class="w-1 h-1 rounded-full bg-gray-300"
                        ></div>
                      </div>
                      {{ rule.label }}
                    </li>
                  </ul>
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
                    class="block w-full h-[46px] pl-4 pr-12 bg-gray-50 border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-gray-900 placeholder-gray-400"
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
                class="flex items-center gap-3 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm font-medium border border-red-100 shadow-sm"
              >
                <AlertCircle class="w-5 h-5 shrink-0" /> Passwords do not match.
              </div>
            </transition>

            <transition
              enter-active-class="transition ease-out duration-200"
              enter-from-class="opacity-0 -translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
            >
              <div
                v-if="apiError"
                class="flex items-center gap-3 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm font-medium border border-red-100 shadow-sm"
              >
                <AlertCircle class="w-5 h-5 shrink-0" /> {{ apiError }}
              </div>
            </transition>

            <div class="pt-4 flex justify-end">
              <button
                type="submit"
                :disabled="isLoading || passwordMatchError || !isPasswordValid"
                class="w-full sm:w-auto h-[46px] px-8 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/40 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
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