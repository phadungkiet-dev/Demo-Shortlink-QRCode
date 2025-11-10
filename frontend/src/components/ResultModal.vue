// frontend/src/components/ResultModal.vue

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
        <!-- (Req 1) เพิ่มความกว้าง Modal -->
        <div
          class="relative w-full max-w-4xl bg-white p-6 rounded-lg shadow-lg"
        >
          <!-- ปุ่มปิด (X) -->
          <button
            @click="closeModal"
            class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
          >
            <X class="h-6 w-6" />
          </button>

          <!-- (Layout สลับด้านแล้ว) -->
          <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <!-- (ฝั่งซ้าย) 1. CONTROL PANEL (3 คอลัมน์) -->
            <div class="lg:col-span-3 space-y-4 lg:border-r lg:pr-6">
              <h2 class="text-2xl font-bold text-gray-900">Customize QR</h2>

              <!-- B.1 Link Info -->
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

              <!-- (FIX) B.2 Accordion "Design" -->
              <details class="border rounded-lg" :open="isDesignOpen">
                <summary
                  class="p-3 font-medium cursor-pointer flex justify-between items-center"
                  @click.prevent="isDesignOpen = !isDesignOpen"
                >
                  Design & Colors
                  <ChevronDown
                    class="h-5 w-5 transition-transform duration-200"
                    :class="designChevronClasses"
                  />
                </summary>
                <div class="p-4 border-t space-y-4 bg-gray-50">
                  <!-- (Req 2) Main Color -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700"
                      >Color (Dots & Corners)</label
                    >
                    <div class="mt-1 flex rounded-md shadow-sm">
                      <label
                        :style="{ backgroundColor: mainColor }"
                        class="w-12 h-10 border border-r-0 border-gray-300 rounded-l-md cursor-pointer hover:opacity-90"
                      >
                        <input
                          type="color"
                          v-model="mainColor"
                          class="opacity-0 w-0 h-0 absolute"
                        />
                      </label>
                      <input
                        type="text"
                        v-model="mainColor"
                        class="flex-1 block w-full rounded-none rounded-r-md px-3 py-2 border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <!-- (Req 6) Transparent BG -->
                  <div class="flex items-center justify-between">
                    <label class="text-sm font-medium text-gray-700"
                      >Transparent Background</label
                    >
                    <button
                      @click="isTransparent = !isTransparent"
                      :class="isTransparent ? 'bg-indigo-600' : 'bg-gray-200'"
                      class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                      role="switch"
                    >
                      <span
                        :class="
                          isTransparent ? 'translate-x-5' : 'translate-x-0'
                        "
                        class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                      ></span>
                    </button>
                  </div>
                  <!-- (Req 3) Dots Options -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700"
                      >Dots Style</label
                    >
                    <select
                      v-model="dotsOptionsType"
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="rounded">Rounded</option>
                      <option value="dots">Dots</option>
                      <option value="square">Square</option>
                      <option value="extra-rounded">Extra Rounded</option>
                      <option value="classy">Classy</option>
                      <option value="classy-rounded">Classy Rounded</option>
                    </select>
                  </div>
                  <!-- (Req 4) Corners Square Options -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700"
                      >Corners Square Style</label
                    >
                    <select
                      v-model="cornersSquareOptionsType"
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="square">Square</option>
                      <option :value="null">None</option>
                      <option value="dot">Dot</option>
                      <option value="extra-rounded">Extra Rounded</option>
                    </select>
                  </div>
                  <!-- (Req 5) Corners Dot Options -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700"
                      >Corners Dot Style</label
                    >
                    <select
                      v-model="cornersDotOptionsType"
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="dot">Dot</option>
                      <option :value="null">None</option>
                      <option value="square">Square</option>
                    </select>
                  </div>
                </div>
              </details>

              <!-- (FIX) B.3 Accordion "Logo" -->
              <details class="border rounded-lg" :open="isLogoOpen">
                <summary
                  class="p-3 font-medium cursor-pointer flex justify-between items-center"
                  @click.prevent="isLogoOpen = !isLogoOpen"
                >
                  Logo
                  <ChevronDown
                    class="h-5 w-5 transition-transform duration-200"
                    :class="logoChevronClasses"
                  />
                </summary>
                <div class="p-4 border-t space-y-4 bg-gray-50">
                  <!-- (Req 7) Drag and Drop -->
                  <label
                    for="logo-upload"
                    @dragover.prevent="dragOver = true"
                    @dragleave.prevent="dragOver = false"
                    @drop.prevent="handleDrop"
                    :class="
                      dragOver
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-300'
                    "
                    class="mt-1 flex justify-center rounded-md border-2 border-dashed px-6 pt-5 pb-6 cursor-pointer"
                  >
                    <div class="space-y-1 text-center">
                      <Image class="mx-auto h-12 w-12 text-gray-400" />
                      <div class="flex text-sm text-gray-600">
                        <span
                          class="font-medium text-indigo-600 hover:text-indigo-500"
                          >Upload a file</span
                        >
                        <input
                          id="logo-upload"
                          @change="handleFileSelect"
                          type="file"
                          accept="image/png, image/jpeg"
                          class="sr-only"
                        />
                      </div>
                      <p class="pl-1">or drag and drop</p>
                      <p class="text-xs text-gray-500">PNG, JPG up to 1MB</p>
                    </div>
                  </label>

                  <!-- Logo Preview / Remove -->
                  <div
                    v-if="logoImage"
                    class="flex items-center justify-between"
                  >
                    <div class="flex items-center gap-2">
                      <img
                        :src="logoImage"
                        alt="Logo Preview"
                        class="h-10 w-10 object-contain rounded"
                      />
                      <span class="text-sm text-gray-600">Logo selected.</span>
                    </div>
                    <button
                      @click="logoImage = null"
                      class="text-sm font-medium text-red-600 hover:text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </details>
            </div>

            <!-- (ฝั่งขวา) 2. PREVIEW AREA (2 คอลัมน์) -->
            <div class="lg:col-span-2 space-y-4">
              <h2 class="text-2xl font-bold text-gray-900 invisible">
                Preview
              </h2>

              <!-- (แก้ไข) 1. บังคับขนาด Preview ที่ 300px -->
              <div
                class="flex items-center justify-center p-4 border rounded-lg bg-gray-50"
              >
                <div ref="qrCodeRef" style="width: 300px; height: 300px">
                  <!-- QR Code will render here -->
                </div>
              </div>

              <!-- (Req 9) Size Options (สำหรับ Download) -->
              <div>
                <label class="block text-sm font-medium text-gray-700"
                  >Size (px)</label
                >
                <select
                  v-model="qrSize"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option :value="300">300 x 300</option>
                  <option :value="500">500 x 500</option>
                  <option :value="800">800 x 800</option>
                  <option :value="1000">1000 x 1000</option>
                  <option :value="1200">1200 x 1200</option>
                </select>
              </div>

              <!-- (Req 8) Download Options -->
              <div>
                <label class="block text-sm font-medium text-gray-700"
                  >Download Format</label
                >
                <div class="mt-1 flex gap-3">
                  <select
                    v-model="downloadExtension"
                    class="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="png">PNG</option>
                    <option value="svg">SVG</option>
                    <option value="jpeg">JPEG</option>
                  </select>
                  <button
                    @click="downloadQR"
                    :disabled="isTransparent && downloadExtension === 'jpeg'"
                    class="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Download class="h-4 w-4" />
                    Download
                  </button>
                </div>
                <!-- Logic แจ้งเตือน -->
                <p
                  v-if="isTransparent && downloadExtension === 'jpeg'"
                  class="mt-2 text-xs text-red-600"
                >
                  Cannot download JPEG with transparent background. Please
                  select PNG or SVG.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
// (ไม่แก้ไข Script ... Logic ถูกต้องอยู่แล้ว)
import { ref, watchEffect, watch, computed } from "vue";
import { X, Copy, Check, Download, ChevronDown, Image } from "lucide-vue-next";
import QrCodeStyling from "qr-code-styling";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  link: { type: Object, default: null },
});
const emit = defineEmits(["update:modelValue"]);

// --- (ไม่แก้ไข) Accordion State (ถูกต้องแล้ว) ---
const isDesignOpen = ref(true);
const isLogoOpen = ref(false);

// (เพิ่มใหม่) 2. สร้าง 'computed' functions สำหรับ :class
const designChevronClasses = computed(() => {
  return { 'rotate-180': isDesignOpen.value };
});

const logoChevronClasses = computed(() => {
  return { 'rotate-180': isLogoOpen.value };
});

// --- (ไม่แก้ไข) QR Customization State (ถูกต้องแล้ว) ---
const qrSize = ref(300);
const mainColor = ref("#4267b2");
const isTransparent = ref(false);
const dotsOptionsType = ref("rounded");
const cornersSquareOptionsType = ref("square");
const cornersDotOptionsType = ref("dot");
const logoImage = ref(null);
const downloadExtension = ref("png");

const closeModal = () => {
  emit("update:modelValue", false);
  setTimeout(() => {
    logoImage.value = null;
    dragOver.value = false;
  }, 200);
};

// --- (ไม่แก้ไข) QR Code Logic (ถูกต้องแล้ว) ---
const qrCodeRef = ref(null);
const qrCodeInstance = ref(null);

watchEffect(() => {
  if (props.link && props.link.shortUrl && qrCodeRef.value) {
    if (!qrCodeInstance.value) {
      qrCodeInstance.value = new QrCodeStyling({
        width: 300,
        height: 300,
        type: "canvas",
        data: props.link.shortUrl,
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 10,
        },
      });
      qrCodeRef.value.innerHTML = "";
      qrCodeInstance.value.append(qrCodeRef.value);
    }

    qrCodeInstance.value.update({
      width: 300,
      height: 300,
      data: props.link.shortUrl,
      image: logoImage.value,
      dotsOptions: {
        color: mainColor.value,
        type: dotsOptionsType.value,
      },
      cornersSquareOptions: {
        color: mainColor.value,
        type: cornersSquareOptionsType.value,
      },
      cornersDotOptions: {
        color: mainColor.value,
        type: cornersDotOptionsType.value,
      },
      backgroundOptions: {
        color: isTransparent.value ? "transparent" : "#ffffff",
      },
    });
  } else if (qrCodeRef.value) {
    qrCodeRef.value.innerHTML = "";
    qrCodeInstance.value = null;
  }
});

// (ไม่แก้ไข) (ถูกต้องแล้ว)
watch(isTransparent, (newValue) => {
  if (newValue && downloadExtension.value === "jpeg") {
    downloadExtension.value = "png";
  }
});

// (ไม่แก้ไข) (ถูกต้องแล้ว)
const downloadQR = () => {
  const downloadOptions = {
    width: qrSize.value,
    height: qrSize.value,
    type: "canvas",
    data: props.link.shortUrl,
    image: logoImage.value,
    dotsOptions: {
      color: mainColor.value,
      type: dotsOptionsType.value,
    },
    cornersSquareOptions: {
      color: mainColor.value,
      type: cornersSquareOptionsType.value,
    },
    cornersDotOptions: {
      color: mainColor.value,
      type: cornersDotOptionsType.value,
    },
    backgroundOptions: {
      color: isTransparent.value ? "transparent" : "#ffffff",
    },
    imageOptions: {
      crossOrigin: "anonymous",
      margin: 10,
    },
  };

  const downloadInstance = new QrCodeStyling(downloadOptions);

  downloadInstance.download({
    name: `qrcode-${props.link.slug}`,
    extension: downloadExtension.value,
  });
};

// --- (ไม่แก้ไข) Drag & Drop Logic (ถูกต้องแล้ว) ---
const dragOver = ref(false);

const handleDrop = (e) => {
  dragOver.value = false;
  const file = e.dataTransfer?.files[0];
  if (file) {
    processFile(file);
  }
};

const handleFileSelect = (e) => {
  const file = e.target?.files[0];
  if (file) {
    processFile(file);
  }
};

const processFile = (file) => {
  if (!file.type.startsWith("image/")) {
    alert("Please drop an image file (PNG, JPG).");
    return;
  }
  if (file.size > 1024 * 1024) {
    // 1MB Limit
    alert("File is too large (Max 1MB).");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    logoImage.value = e.target?.result;
  };
  reader.readAsDataURL(file);
};

// --- (ไม่แก้ไข) Copy Logic (ถูกต้องแล้ว) ---
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

<style scoped>
/* (ไม่แก้ไข) (ถูกต้องแล้ว) */
input[type="color"] {
  -webkit-appearance: none;
  appearance: none;
  width: 0;
  height: 0;
  border: none;
  padding: 0;
  opacity: 0;
}
/* (ไม่แก้ไข) (ถูกต้องแล้ว) */
details[open] summary .rotate-180 {
  transform: rotate(180deg);
}
</style>