<template>
  <div
    class="min-h-[calc(100vh-64px)] bg-gradient-to-b from-white via-indigo-50/30 to-white"
  >
    <div class="container mx-auto px-4 lg:px-8 pt-12 lg:pt-16 pb-24">
      <div class="max-w-4xl mx-auto text-center space-y-8">
        <div
          class="inline-flex items-center justify-center p-1 pr-3 rounded-full bg-white border border-gray-200 shadow-sm mb-4 animate-fade-in-down"
        >
          <span
            class="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide mr-2"
            >New</span
          >
          <span class="text-sm text-gray-600 font-medium"
            >Create custom QR codes instantly</span
          >
        </div>

        <h1
          class="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight"
        >
          Shorten links. <br class="hidden md:block" />
          <span
            class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600"
          >
            Generate QRs.
          </span>
        </h1>

        <p class="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          The open-source link management tool for modern creators. Create short
          links, track analytics, and share them easily.
        </p>
      </div>

      <div class="max-w-3xl mx-auto mt-12 relative z-10">
        <div
          class="bg-white p-2 rounded-2xl shadow-xl border border-gray-100 transform transition-all hover:shadow-2xl"
        >
          <form
            @submit.prevent="handleSubmit"
            class="flex flex-col sm:flex-row gap-2"
          >
            <div class="relative flex-grow">
              <div
                class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
              >
                <Link2 class="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="url"
                id="targetUrl"
                v-model="targetUrl"
                placeholder="Paste your long link here (e.g., https://super-long-url.com/...)"
                required
                class="block w-full pl-11 pr-4 py-4 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-500 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-lg transition-all duration-200 ease-in-out"
                :disabled="isSubmitting"
              />
            </div>

            <button
              type="submit"
              class="px-8 py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center whitespace-nowrap min-w-[160px]"
              :disabled="isSubmitting"
            >
              <Loader2 v-if="isSubmitting" class="h-5 w-5 animate-spin mr-2" />
              <span v-else>Shorten Now</span>
            </button>
          </form>
        </div>

        <div
          v-if="errorMsg"
          class="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center text-red-600 text-sm font-medium animate-pulse"
        >
          <AlertCircle class="h-5 w-5 mr-2 flex-shrink-0" />
          {{ errorMsg }}
        </div>
      </div>

      <div
        class="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
      >
        <div
          class="group p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
        >
          <div
            class="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors"
          >
            <Zap class="h-7 w-7 text-blue-600" />
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-3">Lightning Fast</h3>
          <p class="text-gray-500 leading-relaxed">
            Create anonymous links instantly without an account. Logged-in users
            get links that last 30 days.
          </p>
        </div>

        <div
          class="group p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
        >
          <div
            class="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-100 transition-colors"
          >
            <QrCode class="h-7 w-7 text-purple-600" />
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-3">Smart QR Codes</h3>
          <p class="text-gray-500 leading-relaxed">
            Generate fully customizable QR codes with colors, logos, and
            different styles for your brand.
          </p>
        </div>

        <div
          class="group p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
        >
          <div
            class="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-100 transition-colors"
          >
            <BarChart3 class="h-7 w-7 text-indigo-600" />
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-3">
            Analytics Tracking
          </h3>
          <p class="text-gray-500 leading-relaxed">
            Monitor your link performance. Track clicks, referrers, and devices
            to optimize your reach.
          </p>
        </div>
      </div>
    </div>

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
import {
  Loader2,
  Link2,
  AlertCircle,
  Zap,
  QrCode,
  BarChart3,
} from "lucide-vue-next";
import ResultModal from "@/components/ResultModal.vue";

const targetUrl = ref("");
const isSubmitting = ref(false);
const generatedLink = ref(null);
const errorMsg = ref(null);

// (เปลี่ยนชื่อฟังก์ชัน)
const handleSubmit = async () => {
  isSubmitting.value = true;
  generatedLink.value = null;
  errorMsg.value = null;

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