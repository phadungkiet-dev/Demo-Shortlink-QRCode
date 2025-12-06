<script setup>
// Core vue
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
// Stores
import { useAuthStore } from "@/stores/useAuthStore";
// Config
import { APP_CONFIG } from "@/config/constants";
// Icons
import {
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Check,
} from "lucide-vue-next";

// -------------------------------------------------------------------
// Setup & State
// -------------------------------------------------------------------
const route = useRoute();
const authStore = useAuthStore();

const password = ref("");
const confirmPassword = ref("");
const showPassword = ref(false);
const showConfirmPassword = ref(false);

const isLoading = ref(false);
const isSuccess = ref(false);
const errorMsg = ref(null);

const isVerifying = ref(true);
const isTokenValid = ref(false);
const tokenError = ref("");

const token = route.params.token;
const minPassLen = APP_CONFIG.VALIDATION.PASSWORD_MIN_LEN;

// -------------------------------------------------------------------
// Computed Properties (Validation)
// -------------------------------------------------------------------
// Password Rules Logic (Sync with RegisterForm)
const passwordRules = computed(() => {
  const pwd = password.value;
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

const isPasswordValid = computed(() => {
  return passwordRules.value.every((rule) => rule.valid);
});

// -------------------------------------------------------------------
// Methods & Actions
// -------------------------------------------------------------------
const checkToken = async () => {
  try {
    // เรียก Action จาก Store แทน
    await authStore.verifyResetToken(token);
    isTokenValid.value = true;
  } catch (error) {
    isTokenValid.value = false;
    tokenError.value =
      error.response?.data?.message ||
      "This password reset link is invalid or has expired.";
  } finally {
    isVerifying.value = false; // หยุด Loading
  }
};

const handleSubmit = async () => {
  errorMsg.value = null;

  if (password.value !== confirmPassword.value) {
    errorMsg.value = "Passwords do not match.";
    return;
  }

  // Validate Rules before API call
  if (!isPasswordValid.value) {
    errorMsg.value = "Please meet all password requirements.";
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

onMounted(() => {
  checkToken();
});
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
        <div v-if="isVerifying" class="py-16 text-center">
          <Loader2
            class="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4"
          />
          <p class="text-gray-500 font-medium">Verifying security link...</p>
        </div>

        <div v-else-if="!isTokenValid" class="px-8 py-12 text-center">
          <div
            class="inline-flex p-4 bg-red-50 text-red-600 rounded-full mb-6 ring-8 ring-red-50/50"
          >
            <AlertCircle class="w-10 h-10" />
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">Link Expired</h3>
          <p class="text-gray-500 mb-8 leading-relaxed">
            {{ tokenError }}
          </p>
          <router-link
            to="/forgot-password"
            class="inline-flex items-center justify-center w-full px-6 py-3.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95"
          >
            Request New Link
          </router-link>
        </div>

        <div v-else-if="isSuccess" class="px-8 py-12 text-center">
          <div
            class="inline-flex p-4 bg-emerald-50 text-emerald-600 rounded-full mb-6 ring-8 ring-emerald-50/50"
          >
            <CheckCircle2 class="w-12 h-12" />
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">Password Reset!</h3>
          <p class="text-gray-500 mb-8">
            Your password has been updated. You can now log in with your new
            password.
          </p>
          <router-link
            to="/?login=true"
            class="inline-flex items-center justify-center w-full px-6 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
          >
            Back to Login
          </router-link>
        </div>

        <div v-else>
          <div class="px-8 pt-10 pb-6 text-center">
            <div
              class="inline-flex items-center justify-center p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 shadow-sm"
            >
              <KeyRound class="w-8 h-8" />
            </div>
            <h1 class="text-2xl font-bold text-gray-900 tracking-tight">
              Set New Password
            </h1>
            <p class="text-gray-500 mt-2 text-sm">
              Create a new, strong password for your account.
            </p>
          </div>

          <div class="px-8 pb-10">
            <form @submit.prevent="handleSubmit" class="space-y-6">
              <transition
                enter-active-class="transition ease-out duration-200"
                enter-from-class="opacity-0 -translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
              >
                <div
                  v-if="errorMsg"
                  class="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium"
                >
                  <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{{ errorMsg }}</span>
                </div>
              </transition>

              <div class="space-y-1.5">
                <label class="block text-sm font-bold text-gray-700 ml-1"
                  >New Password</label
                >
                <div class="relative">
                  <input
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    required
                    :minlength="minPassLen"
                    placeholder="Enter new password"
                    class="block w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-400 transition-all pr-12 focus:ring-4"
                    :class="
                      isPasswordValid && password
                        ? 'focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/10'
                        : 'focus:bg-white focus:border-indigo-500 focus:ring-indigo-500/10'
                    "
                  />
                  <button
                    type="button"
                    @click="showPassword = !showPassword"
                    class="absolute inset-y-0 right-0 px-4 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                  >
                    <component
                      :is="showPassword ? EyeOff : Eye"
                      class="h-5 w-5"
                    />
                  </button>
                </div>

                <div
                  class="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-100 transition-all"
                >
                  <p class="text-xs font-bold text-gray-500 mb-2 ml-1">
                    Must contain:
                  </p>
                  <ul class="space-y-2">
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

              <div class="space-y-1.5">
                <label class="block text-sm font-bold text-gray-700 ml-1"
                  >Confirm Password</label
                >
                <div class="relative">
                  <input
                    v-model="confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    required
                    placeholder="Repeat new password"
                    class="block w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all pr-12"
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

              <button
                type="submit"
                :disabled="isLoading || !isPasswordValid"
                class="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/40 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
              >
                <Loader2 v-if="isLoading" class="h-5 w-5 animate-spin" />
                <span v-else>Reset Password</span>
                <ArrowRight v-if="!isLoading" class="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>