<template>
  <div>
    <!-- 1. ฉากหลัง (Backdrop) -->
    <div
      v-show="modelValue"
      class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
      @click="closeModal"
    ></div>

    <!-- 2. ตัว Modal (Panel) -->
    <transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="modelValue && link"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.stop
      >
        <div class="relative w-full max-w-lg bg-white p-6 rounded-lg shadow-lg">
          <!-- ปุ่มปิด (X) -->
          <button
            @click="closeModal"
            class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X class="h-6 w-6" />
          </button>

          <h2 class="text-2xl font-bold text-center text-gray-900">
            Success! Your link is ready.
          </h2>

          <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <!-- A. QR Code -->
            <div class="flex flex-col items-center">
              <div ref="qrCodeRef" class="w-48 h-48 border rounded-lg p-2">
                <!-- QR Code will be rendered here by qr-code-styling -->
              </div>
              <button
                @click="downloadQR"
                class="mt-3 w-full px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-md shadow-sm hover:bg-gray-200 flex items-center justify-center gap-2"
              >
                <Download class="h-4 w-4" />
                Download QR
              </button>
            </div>

            <!-- B. Link Info -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700"
                  >Short Link</label
                >
                <div class="mt-1 flex rounded-md shadow-sm">
                  <input
                    :value="link.shortUrl"
                    readonly
                    class="flex-1 block w-full rounded-none rounded-l-md px-3 py-2 border border-gray-300 bg-gray-50 focus:outline-none"
                  />
                  <button
                    @click="copyToClipboard(link.shortUrl)"
                    class="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    <component :is="copyIcon" class="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700"
                  >Original URL</label
                >
                <input
                  :value="link.targetUrl"
                  readonly
                  class="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 bg-gray-50 text-gray-500 text-sm truncate focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, watchEffect } from "vue";
import { X, Copy, Check, Download } from "lucide-vue-next";
import QrCodeStyling from "qr-code-styling";

// เราใช้ v-model (modelValue) และรับ "link" object
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  link: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["update:modelValue"]);
const closeModal = () => {
  emit("update:modelValue", false);
};

// --- QR Code Logic ---
const qrCodeRef = ref(null);
const qrCodeInstance = ref(null);

watchEffect(() => {
  if (props.link && props.link.shortUrl && qrCodeRef.value) {
    // (Initialize QR Code)
    qrCodeInstance.value = new QrCodeStyling({
      width: 176, // 192px (w-48) - 16px (p-2*2)
      height: 176,
      type: "canvas",
      data: props.link.shortUrl, // <-- (สำคัญ) ใช้ data จาก link prop
      image: "", // (Optional)
      dotsOptions: {
        color: "#4267b2",
        type: "rounded",
      },
      backgroundOptions: {
        color: "#ffffff",
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 10,
      },
    });

    // ล้าง QR เก่า (ถ้ามี) และวาดใหม่
    qrCodeRef.value.innerHTML = "";
    qrCodeInstance.value.append(qrCodeRef.value);
  } else if (qrCodeRef.value) {
    // ถ้า Modal ปิด (link=null) ให้ล้าง QR
    qrCodeRef.value.innerHTML = "";
  }
});

const downloadQR = () => {
  if (qrCodeInstance.value) {
    qrCodeInstance.value.download({
      name: `qrcode-${props.link.slug}`,
      extension: "png",
    });
  }
};

// --- Copy Logic ---
const copyIcon = ref(Copy);
const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    copyIcon.value = Check;
    setTimeout(() => {
      copyIcon.value = Copy;
    }, 2000);
  });
};
</script>