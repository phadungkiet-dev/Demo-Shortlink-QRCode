<template>
  <div>
    <div class="container mx-auto px-4 lg:px-8 py-12">
      <!-- 1. Hero Section (เหมือนเดิม) -->
      <div class="max-w-2xl mx-auto text-center">
        <h1 class="text-4xl font-bold text-gray-900 sm:text-5xl">
          Create a Shortlink
        </h1>
        <p class="mt-4 text-lg text-gray-600">
          Fast, simple, and free. Links for logged-in users last 30 days,
          anonymous links last 7 days.
        </p>
      </div>

      <!-- 2. Generator Form (แก้ไขเล็กน้อย) -->
      <div class="max-w-2xl mx-auto mt-10">
        <form
          @submit.prevent="handleSubmit"
          class="bg-white p-6 sm:p-8 rounded-lg shadow-lg"
        >
          <div class="flex flex-col sm:flex-row gap-4">
            <label for="targetUrl" class="sr-only">Your long URL</label>
            <input
              type="url"
              id="targetUrl"
              v-model="targetUrl"
              placeholder="https://example.com/my-super-long-url"
              required
              class="flex-grow w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              :disabled="isSubmitting"
            />
            <button
              type="submit"
              class="px-6 py-3 bg-indigo-600 text-white font-medium rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              :disabled="isSubmitting"
            >
              <Loader2 v-if="isSubmitting" class="h-5 w-5 animate-spin" />
              <span v-if="!isSubmitting">Shorten</span>
            </button>
          </div>
        </form>
        <!-- Error Message Area (ใหม่) -->
        <div v-if="errorMsg" class="mt-4 text-center text-red-600">
          {{ errorMsg }}
        </div>
      </div>
    </div>

    <!-- 4. Result Modal (เพิ่มใหม่) - นี่คือ Modal ที่จะถูกเรียกใช้แทน Result Area เดิม -->
    <ResultModal
      :modelValue="isResultModalOpen"
      :link="generatedLink"
      @update:modelValue="closeResultModal"
    />
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import api from "@/services/api";
import { Loader2 } from "lucide-vue-next";
import ResultModal from "@/components/ResultModal.vue";

const targetUrl = ref("");
const isSubmitting = ref(false);
const generatedLink = ref(null);
const errorMsg = ref(null);

// (เปลี่ยนชื่อฟังก์ชัน)
const handleSubmit = async () => {
  isSubmitting.value = true;
  generatedLink.value = null;
  errorMsg.value = null; // (เพิ่ม)

  try {
    const response = await api.post("/links", { targetUrl: targetUrl.value });
    // (สำเร็จ!) สั่งให้ Modal เปิด โดยการใส่ data ลงใน ref นี้
    generatedLink.value = response.data;
  } catch (error) {
    console.error("Error creating link:", error);
    const errorText = error.response?.data?.message || "Failed to create link.";
    // (แสดง Error ข้างล่างฟอร์ม)
    errorMsg.value = errorText;
  } finally {
    isSubmitting.value = false;
  }
};

// --- (เพิ่ม Logic ควบคุม Modal) ---

// Computed prop เพื่อเช็คว่า Modal ควรเปิดหรือไม่
const isResultModalOpen = computed(() => !!generatedLink.value);

// ฟังก์ชันสำหรับปิด Modal (และ Reset ฟอร์ม)
const closeResultModal = () => {
  generatedLink.value = null;
  targetUrl.value = ""; // ล้างช่อง Input
};
</script>