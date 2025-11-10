<template>
  <div
    v-show="modelValue"
    class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
    @click="closeModal"
  >
    <transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.stop
      >
        <div class="relative w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
          <button
            @click="closeModal"
            class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X class="h-6 w-6" />
          </button>

          <!-- (แก้ไข) 1. เปลี่ยน Title ให้เป็นแบบ Dynamic -->
          <h2 class="text-2xl font-bold text-center text-gray-900">
            <span v-if="viewMode === 'login'">Login to your account</span>
            <span v-else>Create a new account</span>
          </h2>

          <!-- (แก้ไข) 2. สลับฟอร์มตาม viewMode -->
          <div class="mt-6">
            <LoginForm
              v-if="viewMode === 'login'"
              @login-success="closeModal"
            />
            <RegisterForm v-else @register-success="closeModal" />
          </div>

          <!-- (เพิ่มใหม่) 3. ลิงก์สำหรับสลับโหมด -->
          <div class="mt-6 text-center text-sm">
            <p v-if="viewMode === 'login'" class="text-gray-600">
              Don't have an account?
              <button
                @click="viewMode = 'register'"
                class="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Register
              </button>
            </p>
            <p v-else class="text-gray-600">
              Already have an account?
              <button
                @click="viewMode = 'login'"
                class="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Login
              </button>
            </p>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from "vue"; // (เพิ่ม 'ref')
import LoginForm from "./LoginForm.vue";
import RegisterForm from "./RegisterForm.vue";
import { X } from "lucide-vue-next";

// (เพิ่มใหม่) 1. สร้าง State สำหรับสลับฟอร์ม
const viewMode = ref("login"); // 'login' | 'register'

// เราใช้ v-model (modelValue) เพื่อรับคำสั่ง "เปิด/ปิด" จากไฟล์แม่ (AppHeader)
defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

// ส่งสัญญาณกลับไปหาไฟล์แม่ (AppHeader) เมื่อมีการคลิกปิด
const emit = defineEmits(["update:modelValue"]);
const closeModal = () => {
  emit("update:modelValue", false);

  // (UX) เมื่อปิด Modal, Reset กลับไปหน้า Login เสมอ
  // (รอให้ animation ปิดจบก่อน ค่อย reset)
  setTimeout(() => {
    viewMode.value = "login";
  }, 200); // 200ms = duration-200 (leave-active-class)
};
</script>