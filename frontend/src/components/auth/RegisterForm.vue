<script setup>
// Core vue
import { ref, computed } from "vue";
// Config
import { APP_CONFIG } from "@/config/constants";
// Stores
import { useAuthStore } from "@/stores/useAuthStore";
// Icons
import { Loader2, AlertCircle, Eye, EyeOff, Check } from "lucide-vue-next";

// -------------------------------------------------------------------
// Setup & State
// -------------------------------------------------------------------
const authStore = useAuthStore();
const emit = defineEmits(["register-success"]);

// Form Data
const email = ref("");
const password = ref("");
const confirmPassword = ref("");

// UI State
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const isLoading = ref(false);
const errorMsg = ref(null);

const minPassLen = APP_CONFIG.VALIDATION.PASSWORD_MIN_LEN;

// -------------------------------------------------------------------
// Computed Properties (Validation)
// -------------------------------------------------------------------
// Password Rules List (Sync with Backend Zod Schema)
const passwordRules = computed(() => {
  const pwd = password.value;
  return [
    {
      label: `At least ${minPassLen} characters`,
      valid: pwd.length >= minPassLen,
    },
    {
      label: "1 Uppercase letter (A-Z)",
      valid: /[A-Z]/.test(pwd), // ตรงกับ .regex(/[A-Z]/)
    },
    {
      label: "1 Lowercase letter (a-z)",
      valid: /[a-z]/.test(pwd), // ตรงกับ .regex(/[a-z]/)
    },
    {
      label: "1 Number (0-9)",
      valid: /[0-9]/.test(pwd), // ตรงกับ .regex(/[0-9]/)
    },
    {
      label: "1 Special character (!@#...)",
      // [\W_] หมายถึง non-word characters (สัญลักษณ์ต่างๆ) หรือ _
      valid: /[\W_]/.test(pwd), // ตรงกับ .regex(/[\W_]/)
    },
  ];
});

// ตรวจสอบว่าผ่านครบทุกข้อหรือยัง
const isPasswordValid = computed(() => {
  return passwordRules.value.every((rule) => rule.valid);
});

// -------------------------------------------------------------------
// Methods & Actions
// -------------------------------------------------------------------
const handleRegister = async () => {
  errorMsg.value = null;

  if (password.value !== confirmPassword.value) {
    errorMsg.value = "Passwords do not match.";
    return;
  }

  // Client-side Validation
  if (!isPasswordValid.value) {
    errorMsg.value = "Please meet all password requirements.";
    return;
  }

  isLoading.value = true;

  try {
    await authStore.register(
      email.value,
      password.value,
      confirmPassword.value
    );
    emit("register-success");
  } catch (error) {
    errorMsg.value = error.message;
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
    >
      <div
        v-if="errorMsg"
        class="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium"
      >
        <AlertCircle class="h-5 w-5 shrink-0" />
        {{ errorMsg }}
      </div>
    </transition>

    <form @submit.prevent="handleRegister" class="space-y-5">
      <div class="space-y-1.5">
        <label class="block text-sm font-semibold text-gray-700 ml-1"
          >Email address</label
        >
        <input
          v-model="email"
          type="email"
          required
          placeholder="name@example.com"
          class="block w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
        />
      </div>

      <div class="space-y-1.5">
        <label class="block text-sm font-semibold text-gray-700 ml-1"
          >Password</label
        >
        <div class="relative">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            placeholder="Create a password"
            class="block w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:ring-4 transition-all pr-12"
            :class="
              isPasswordValid && password
                ? 'focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/10'
                : 'focus:bg-white focus:border-indigo-500 focus:ring-indigo-500/10'
            "
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute inset-y-0 right-0 px-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <component :is="showPassword ? EyeOff : Eye" class="h-5 w-5" />
          </button>
        </div>

        <div
          class="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 transition-all"
        >
          <p class="text-xs font-bold text-gray-500 mb-2 ml-1">Must contain:</p>
          <ul class="space-y-1">
            <li
              v-for="(rule, index) in passwordRules"
              :key="index"
              class="flex items-center gap-2 text-xs transition-colors duration-300"
              :class="
                rule.valid ? 'text-emerald-600 font-medium' : 'text-gray-400'
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
                <Check v-if="rule.valid" class="w-2.5 h-2.5 text-emerald-600" />
                <div v-else class="w-1 h-1 rounded-full bg-gray-300"></div>
              </div>
              {{ rule.label }}
            </li>
          </ul>
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="block text-sm font-semibold text-gray-700 ml-1"
          >Confirm Password</label
        >
        <div class="relative">
          <input
            v-model="confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            required
            placeholder="Repeat password"
            class="block w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all pr-12"
          />
          <button
            type="button"
            @click="showConfirmPassword = !showConfirmPassword"
            class="absolute inset-y-0 right-0 px-4 text-gray-400 hover:text-gray-600 transition-colors"
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
        :disabled="isLoading"
        class="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
      >
        <Loader2 v-if="isLoading" class="h-5 w-5 animate-spin" />
        <span v-else>Create Account</span>
      </button>
    </form>
  </div>
</template>