<template>
  <div class="container mx-auto px-4 lg:px-8 py-12">
    <div class="max-w-2xl mx-auto text-center">
      <h1 class="text-4xl font-bold text-gray-900 sm:text-5xl">
        Create a Shortlink
      </h1>
      <p class="mt-4 text-lg text-gray-600">
        Fast, simple, and free. Links for logged-in users last 30 days,
        anonymous links last 7 days.
      </p>
    </div>

    <!-- Generator Form -->
    <div class="max-w-2xl mx-auto mt-10">
      <form
        @submit.prevent="createShortlink"
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
            :disabled="isLoading"
          />
          <button
            type="submit"
            class="px-6 py-3 bg-indigo-600 text-white font-medium rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
            :disabled="isLoading"
          >
            <Loader2 v-if="isLoading" class="h-5 w-5 animate-spin" />
            <span v-if="!isLoading">Shorten</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Result Area -->
    <div
      v-if="result"
      class="max-w-2xl mx-auto mt-8 bg-white p-6 sm:p-8 rounded-lg shadow-lg"
    >
      <h3 class="text-lg font-medium text-gray-900">Your link is ready!</h3>

      <div class="mt-4 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          :value="result.shortUrl"
          readonly
          class="flex-grow w-full px-4 py-3 rounded-md border-gray-300 bg-gray-50 text-indigo-700"
          ref="resultInput"
        />
        <button
          @click="copyToClipboard"
          class="px-6 py-3 bg-gray-800 text-white font-medium rounded-md shadow-sm hover:bg-gray-700 flex items-center justify-center gap-2"
        >
          <Copy class="h-5 w-5" />
          <span>Copy</span>
        </button>
      </div>

      <!-- QR Code Component -->
      <div
        class="mt-6 border-t pt-6 flex flex-col sm:flex-row items-center gap-6"
      >
        <QrCodeGenerator :url="result.shortUrl" />
        <div class="flex-1 text-center sm:text-left">
          <h4 class="font-semibold text-gray-800">QR Code</h4>
          <p class="text-gray-600">
            Scan this code to open your link on any device.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import api from "@/services/api";
import QrCodeGenerator from "@/components/QrCodeGenerator.vue";
import { Loader2, Copy } from "lucide-vue-next";
import Swal from "sweetalert2";

const targetUrl = ref("");
const isLoading = ref(false);
const result = ref(null);
const resultInput = ref(null);

const createShortlink = async () => {
  isLoading.value = true;
  result.value = null;
  try {
    const response = await api.post("/links", { targetUrl: targetUrl.value });
    result.value = response.data;
  } catch (error) {
    console.error("Error creating link:", error);
    const errorMsg = error.response?.data?.message || "Failed to create link.";
    Swal.fire("Error", errorMsg, "error");
  } finally {
    isLoading.value = false;
  }
};

const copyToClipboard = () => {
  if (resultInput.value) {
    resultInput.value.select();
    try {
      // ใช้ Clipboard API (ดีกว่า execCommand)
      navigator.clipboard.writeText(result.value.shortUrl);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Copied to clipboard!",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (err) {
      console.error("Failed to copy (fallback):", err);
      // Fallback
      document.execCommand("copy");
    }
  }
};
</script>