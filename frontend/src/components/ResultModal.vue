<template>
  <div>
    <!-- 1. ฉากหลัง (Backdrop) -->
    <div
      v-show="modelValue"
      class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
      @click="closeModal"
    ></div>

    <!-- Modal (Panel) -->
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
        <div
          class="relative w-full max-w-4xl bg-white p-6 rounded-lg shadow-lg max-h-[90vh] overflow-y-auto"
        >
          <button
            @click="closeModal"
            class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
          >
            <X class="h-6 w-6" />
          </button>

          <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div class="lg:col-span-3 space-y-4 lg:border-r lg:pr-6">
              <h2 class="text-2xl font-bold text-gray-900">🛠️ Customize QR</h2>
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

              <!-- Dropdown design & color -->
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
                  <!-- Color -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700"
                      >Color (Dots & Corners)</label
                    >
                    <div class="mt-1 flex rounded-md shadow-sm">
                      <label
                        :style="{ backgroundColor: mainColor }"
                        class="w-12 h-auto border border-r-0 border-gray-300 rounded-l-md cursor-pointer hover:opacity-90"
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

                  <!-- Background -->
                  <div
                    :class="{ 'opacity-50 pointer-events-none': isTransparent }"
                  >
                    <label class="block text-sm font-medium text-gray-700"
                      >Background Color</label
                    >
                    <div class="mt-1 flex rounded-md shadow-sm">
                      <label
                        :style="{ backgroundColor: backgroundColor }"
                        class="w-12 h-auto border border-r-0 border-gray-300 rounded-l-md cursor-pointer hover:opacity-90 transition-colors"
                      >
                        <input
                          type="color"
                          v-model="backgroundColor"
                          :disabled="isTransparent"
                          class="opacity-0 w-0 h-0 absolute"
                        />
                      </label>
                      <input
                        type="text"
                        v-model="backgroundColor"
                        :disabled="isTransparent"
                        class="flex-1 block w-full rounded-none rounded-r-md px-3 py-2 border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <!-- Transparent BG -->
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

                  <!-- Dots Style -->
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

                  <!-- Corners Square Style -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700"
                      >Corners Square Style</label
                    >
                    <select
                      v-model="cornersSquareOptionsType"
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option :value="null">None</option>
                      <option value="square">Square</option>
                      <option value="dot">Dot</option>
                      <option value="extra-rounded">Extra Rounded</option>
                    </select>
                  </div>

                  <!-- Corners Dot Style -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700"
                      >Corners Dot Style</label
                    >
                    <select
                      v-model="cornersDotOptionsType"
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option :value="null">None</option>
                      <option value="dot">Dot</option>
                      <option value="square">Square</option>
                    </select>
                  </div>
                </div>
              </details>

              <!-- Dropdown Logo -->
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
                <!-- Drag and Drop -->
                <div class="p-4 border-t space-y-4 bg-gray-50">
                  <label
                    for="logo-upload"
                    @dragover.prevent="dragOver = true"
                    @dragleave.prevent="dragOver = false"
                    @drop.prevent="handleDrop"
                    :class="[
                      dragOver
                        ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                        : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-indigo-400',
                      'mt-1 flex flex-col justify-center items-center rounded-xl border-2 border-dashed px-6 pt-8 pb-8 cursor-pointer transition-all duration-200 ease-in-out group',
                    ]"
                  >
                    <div class="space-y-2 text-center">
                      <div
                        class="mx-auto h-12 w-12 text-gray-400 group-hover:text-indigo-500 group-hover:scale-110 transition-transform duration-200"
                      >
                        <Image class="h-full w-full" />
                      </div>

                      <div class="text-sm text-gray-600">
                        <span
                          class="font-semibold text-indigo-600 hover:text-indigo-500"
                          >Click to upload</span
                        >
                        <span class="mx-1">or drag and drop</span>
                      </div>
                      <p class="text-xs text-gray-400">PNG, JPG up to 1MB</p>
                    </div>

                    <input
                      id="logo-upload"
                      @change="handleFileSelect"
                      type="file"
                      accept="image/png, image/jpeg"
                      class="sr-only"
                    />
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

            <!-- Preview qrCode -->
            <div class="lg:col-span-2 space-y-4">
              <h2 class="text-2xl font-bold text-gray-900 invisible">
                Preview
              </h2>

              <!-- บังคับขนาด Preview ที่ 300px -->
              <div
                class="flex items-center justify-center p-4 border rounded-lg transition-colors duration-300"
                :class="
                  isTransparent
                    ? 'bg-checkerboard border-indigo-200'
                    : 'bg-gray-50 border-gray-200'
                "
              >
                <div ref="qrCodeRef" style="width: 300px; height: 300px">
                  <!-- QR Code will render here -->
                </div>
              </div>

              <!-- Size (px) -->
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

              <!-- Download Format -->
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
// import & setup
import { ref, watchEffect, watch, computed } from "vue";
import { X, Copy, Check, Download, ChevronDown, Image } from "lucide-vue-next";
import QrCodeStyling from "qr-code-styling";
import Swal from "sweetalert2";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  link: { type: Object, default: null },
});
const emit = defineEmits(["update:modelValue"]);

// (State: UI)
const isDesignOpen = ref(true);
const isLogoOpen = ref(false);
const designChevronClasses = computed(() => {
  return { "rotate-180": isDesignOpen.value };
});

const logoChevronClasses = computed(() => {
  return { "rotate-180": isLogoOpen.value };
});

// (State: QR Config)
const qrSize = ref(300);
const mainColor = ref("#4267b2");
const backgroundColor = ref("#ffffff");
const isTransparent = ref(false);
const dotsOptionsType = ref("rounded");
const cornersSquareOptionsType = ref(null);
const cornersDotOptionsType = ref(null);
const logoImage = ref(null);
const downloadExtension = ref("png");

const closeModal = () => {
  emit("update:modelValue", false);
  setTimeout(() => {
    logoImage.value = null;
    dragOver.value = false;
  }, 20000);
};

// ============================================================
// [REFACTOR] Helper function สร้าง Options กลาง (ใช้ทั้ง Preview & Download)
// ============================================================
const getQrOptions = (width, height) => {
  return {
    width: width,
    height: height,
    type: "canvas",
    data: props.link?.shortUrl || "",
    image: logoImage.value,
    dotsOptions: {
      color: mainColor.value,
      type: dotsOptionsType.value,
    },
    cornersSquareOptions: {
      color: mainColor.value,
      // ถ้าเป็น null ให้ส่ง undefined เพื่อซ่อน
      type: cornersSquareOptionsType.value || undefined,
    },
    cornersDotOptions: {
      color: mainColor.value,
      type: cornersDotOptionsType.value || undefined,
    },
    backgroundOptions: {
      color: isTransparent.value ? "transparent" : backgroundColor.value,
    },
    imageOptions: {
      crossOrigin: "anonymous",
      margin: 10,
    },
  };
};

// (Logic: Render QR)
const qrCodeRef = ref(null);
const qrCodeInstance = ref(null);

watchEffect(() => {
  if (props.link && props.link.shortUrl && qrCodeRef.value) {
    // Init Instance ถ้ายังไม่มี
    if (!qrCodeInstance.value) {
      // สร้างด้วยขนาด default 300x300
      qrCodeInstance.value = new QrCodeStyling(getQrOptions(300, 300));
      qrCodeRef.value.innerHTML = "";
      qrCodeInstance.value.append(qrCodeRef.value);
    }

    qrCodeInstance.value.update(getQrOptions(300, 300));
  } else if (qrCodeRef.value) {
    qrCodeRef.value.innerHTML = "";
    qrCodeInstance.value = null;
  }
});

// (Logic: Helpers)
watch(isTransparent, (newValue) => {
  if (newValue && downloadExtension.value === "jpeg") {
    downloadExtension.value = "png";
  }
});

const downloadQR = () => {
  // สร้าง Instance ใหม่สำหรับดาวน์โหลด โดยใช้ขนาดจริง (qrSize)
  // เรียก getQrOptions เพื่อให้มั่นใจว่าหน้าตาเหมือน Preview เป๊ะๆ
  const downloadInstance = new QrCodeStyling(
    getQrOptions(qrSize.value, qrSize.value)
  );

  downloadInstance.download({
    name: `qrcode-${props.link.slug}`,
    extension: downloadExtension.value,
  });
};

// (Logic: Drag & Drop)
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
    Swal.fire({
      icon: "error",
      title: "Invalid File Type",
      text: "Please upload an image file (PNG, JPG).",
      confirmButtonColor: "#4F46E5",
    });
    return;
  }
  if (file.size > 1024 * 1024) {
    // 1MB Limit
    Swal.fire({
      icon: "warning",
      title: "File too large",
      text: "Image size must be less than 1MB.",
      confirmButtonColor: "#4F46E5",
    });
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    logoImage.value = e.target?.result;
  };
  reader.readAsDataURL(file);
};

// (Logic: Copy)
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
input[type="color"] {
  -webkit-appearance: none;
  appearance: none;
  width: 0;
  height: 0;
  border: none;
  padding: 0;
  opacity: 0;
}

details[open] summary .rotate-180 {
  transform: rotate(180deg);
}

.bg-checkerboard {
  background-color: #ffffff;
  background-image: linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
    linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
    linear-gradient(-45deg, transparent 75%, #e5e7eb 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}
</style>