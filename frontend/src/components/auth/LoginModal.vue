<script setup>
// Core vue
import { ref, watch } from "vue";
// Stores
import { useAuthStore } from "@/stores/useAuthStore";
// Components
import LoginForm from "./LoginForm.vue";
import RegisterForm from "./RegisterForm.vue";
// Icons
import { X } from "lucide-vue-next";

// -------------------------------------------------------------------
// Setup & State
// -------------------------------------------------------------------
const authStore = useAuthStore();
const viewMode = ref("login"); // 'login' | 'register'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

// -------------------------------------------------------------------
// Watchers
// -------------------------------------------------------------------
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      console.log("Login modal opened, refreshing session...");
      try {
        await authStore.getCsrfToken();
      } catch (e) {
        console.error("Failed to refresh CSRF token", e);
      }
    }
  }
);

// -------------------------------------------------------------------
// Methods
// -------------------------------------------------------------------

const closeModal = () => {
  emit("update:modelValue", false);
  // Reset กลับเป็น login หลังปิด animation จบ
  setTimeout(() => {
    viewMode.value = "login";
  }, 300);
};
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
  >
    <div
      class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      @click="closeModal"
    ></div>

    <transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0 scale-95 translate-y-4"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 translate-y-4"
    >
      <div
        class="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/50"
        @click.stop
      >
        <div
          class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
        ></div>

        <button
          @click="closeModal"
          class="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X class="h-5 w-5" />
        </button>

        <div class="p-8 pt-10">
          <div class="text-center mb-8">
            <h2
              class="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight"
            >
              <span v-if="viewMode === 'login'">Welcome back</span>
              <span v-else>Create account</span>
            </h2>
            <p class="text-sm text-gray-500 mt-2">
              <span v-if="viewMode === 'login'"
                >Please enter your details to sign in.</span
              >
              <span v-else>Start sharing your links with the world.</span>
            </p>
          </div>

          <div class="mt-6">
            <transition name="fade" mode="out-in">
              <LoginForm
                v-if="viewMode === 'login'"
                @login-success="closeModal"
              />
              <RegisterForm v-else @register-success="closeModal" />
            </transition>
          </div>

          <div class="mt-8 pt-6 border-t border-gray-100 text-center">
            <p class="text-sm text-gray-600">
              <span v-if="viewMode === 'login'">Don't have an account? </span>
              <span v-else>Already have an account? </span>
              <button
                @click="viewMode = viewMode === 'login' ? 'register' : 'login'"
                class="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
              >
                {{ viewMode === "login" ? "Sign up" : "Sign in" }}
              </button>
            </p>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>