<script setup>
// import & setup
import { ref, watchEffect, watch, computed } from "vue";
import {
  X,
  Copy,
  Check,
  Download,
  ChevronDown,
  Image as ImageIcon,
  Save,
  Palette,
  Settings2,
  Share2,
} from "lucide-vue-next";
import QrCodeStyling from "qr-code-styling";
import Swal from "sweetalert2";
import api from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  link: { type: Object, default: null },
});
const emit = defineEmits(["update:modelValue"]);
const authStore = useAuthStore();

// (State: UI)
const activeTab = ref("design"); // 'design' | 'logo'

// (State: QR Config)
const qrSize = ref(300);
const mainColor = ref("#4f46e5"); // Default Indigo
const backgroundColor = ref("#ffffff");
const isTransparent = ref(false);
const dotsOptionsType = ref("rounded");
const cornersSquareOptionsType = ref("extra-rounded");
const cornersDotOptionsType = ref(null);
const logoImage = ref(null);
const downloadExtension = ref("png");
const isSaving = ref(false);

const closeModal = () => {
  emit("update:modelValue", false);
  setTimeout(() => {
    logoImage.value = null;
    dragOver.value = false;
    qrCodeInstance.value = null;
    activeTab.value = "design";
  }, 300);
};

// ============================================================
// Helper function สร้าง Options
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

// Save QR Style Logic
const saveQrStyle = async () => {
  if (!props.link) return;
  isSaving.value = true;

  const currentConfig = {
    mainColor: mainColor.value,
    backgroundColor: backgroundColor.value,
    isTransparent: isTransparent.value,
    dotsOptionsType: dotsOptionsType.value,
    cornersSquareOptionsType: cornersSquareOptionsType.value,
    cornersDotOptionsType: cornersDotOptionsType.value,
    image: logoImage.value,
  };

  try {
    await api.patch(`/links/${props.link.id}`, { qrOptions: currentConfig });

    const index = authStore.myLinks.findIndex((l) => l.id === props.link.id);
    if (index !== -1) {
      authStore.myLinks[index].qrOptions = currentConfig;
    }

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Style saved!",
      showConfirmButton: false,
      timer: 1500,
    });
  } catch (error) {
    Swal.fire("Error", "Could not save style.", "error");
  } finally {
    isSaving.value = false;
  }
};

// Render QR Logic
const qrCodeRef = ref(null);
const qrCodeInstance = ref(null);

watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) qrCodeInstance.value = null;
  }
);

// Load Config
watch(
  () => props.link,
  (newLink) => {
    if (newLink && newLink.qrOptions) {
      const opts = newLink.qrOptions;
      if (opts.mainColor) mainColor.value = opts.mainColor;
      if (opts.backgroundColor) backgroundColor.value = opts.backgroundColor;
      if (opts.isTransparent !== undefined)
        isTransparent.value = opts.isTransparent;
      if (opts.dotsOptionsType) dotsOptionsType.value = opts.dotsOptionsType;
      if (opts.cornersSquareOptionsType)
        cornersSquareOptionsType.value = opts.cornersSquareOptionsType;
      if (opts.cornersDotOptionsType)
        cornersDotOptionsType.value = opts.cornersDotOptionsType;
      if (opts.image) logoImage.value = opts.image;
    } else {
      mainColor.value = "#4f46e5";
      backgroundColor.value = "#ffffff";
      isTransparent.value = false;
      dotsOptionsType.value = "rounded";
      cornersSquareOptionsType.value = "extra-rounded";
      cornersDotOptionsType.value = null;
      logoImage.value = null;
    }
  },
  { immediate: true }
);

watchEffect(() => {
  if (props.link && props.link.shortUrl && qrCodeRef.value) {
    if (!qrCodeInstance.value) {
      qrCodeInstance.value = new QrCodeStyling(getQrOptions(300, 300));
      qrCodeInstance.value.append(qrCodeRef.value);
    } else {
      qrCodeInstance.value.update(getQrOptions(300, 300));
    }
  }
});

// Helpers
watch(isTransparent, (newValue) => {
  if (newValue && downloadExtension.value === "jpeg") {
    downloadExtension.value = "png";
  }
});

const downloadQR = () => {
  const downloadInstance = new QrCodeStyling(
    getQrOptions(qrSize.value, qrSize.value)
  );
  downloadInstance.download({
    name: `qrcode-${props.link.slug}`,
    extension: downloadExtension.value,
  });
};

const dragOver = ref(false);
const handleDrop = (e) => {
  dragOver.value = false;
  const file = e.dataTransfer?.files[0];
  if (file) processFile(file);
};

const handleFileSelect = (e) => {
  const file = e.target?.files[0];
  if (file) processFile(file);
};

const processFile = (file) => {
  if (!file.type.startsWith("image/")) {
    Swal.fire("Invalid File", "Please upload an image.", "error");
    return;
  }
  if (file.size > 1024 * 1024) {
    Swal.fire("File too large", "Max size 1MB.", "warning");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    logoImage.value = e.target?.result;
  };
  reader.readAsDataURL(file);
};

const copyIcon = ref(Copy);
const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    copyIcon.value = Check;
    setTimeout(() => {
      copyIcon.value = Copy;
    }, 2000);
  });
};

const saveIconClasses = computed(() => ({ "animate-bounce": isSaving.value }));
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
  >
    <div
      class="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
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
        class="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        @click.stop
      >
        <div
          class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white z-10 shrink-0"
        >
          <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Settings2 class="w-5 h-5 text-indigo-600" />
            Customize QR Code
          </h2>
          <button
            @click="closeModal"
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X class="w-6 h-6" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            <div class="lg:col-span-7 space-y-6">
              <div
                class="bg-white p-5 rounded-2xl shadow-sm border border-gray-200"
              >
                <label
                  class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2"
                >
                  Your Short Link
                </label>
                <div class="flex gap-2">
                  <div
                    class="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 font-mono text-sm truncate select-all"
                  >
                    {{ link?.shortUrl }}
                  </div>
                  <button
                    @click="copyToClipboard(link?.shortUrl)"
                    class="px-4 bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 rounded-xl transition-all shadow-sm active:scale-95"
                    title="Copy to clipboard"
                  >
                    <component :is="copyIcon" class="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div
                class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div class="flex border-b border-gray-100">
                  <button
                    @click="activeTab = 'design'"
                    class="flex-1 py-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    :class="
                      activeTab === 'design'
                        ? 'text-indigo-600 bg-indigo-50/50 border-b-2 border-indigo-600'
                        : 'text-gray-500 hover:bg-gray-50'
                    "
                  >
                    <Palette class="w-4 h-4" /> Colors & Shapes
                  </button>
                  <button
                    @click="activeTab = 'logo'"
                    class="flex-1 py-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    :class="
                      activeTab === 'logo'
                        ? 'text-indigo-600 bg-indigo-50/50 border-b-2 border-indigo-600'
                        : 'text-gray-500 hover:bg-gray-50'
                    "
                  >
                    <ImageIcon class="w-4 h-4" /> Add Logo
                  </button>
                </div>

                <div class="p-6 space-y-6">
                  <div v-show="activeTab === 'design'" class="space-y-6">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label
                          class="block text-sm font-medium text-gray-700 mb-2"
                          >Main Color</label
                        >
                        <div
                          class="flex items-center gap-3 p-2 border border-gray-200 rounded-xl hover:border-indigo-300 transition-colors bg-white"
                        >
                          <input
                            type="color"
                            v-model="mainColor"
                            class="h-8 w-8 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                          />
                          <input
                            type="text"
                            v-model="mainColor"
                            class="flex-1 border-none focus:ring-0 text-sm font-mono text-gray-600 p-0"
                          />
                        </div>
                      </div>
                      <div
                        :class="{
                          'opacity-50 pointer-events-none': isTransparent,
                        }"
                      >
                        <label
                          class="block text-sm font-medium text-gray-700 mb-2"
                          >Background</label
                        >
                        <div
                          class="flex items-center gap-3 p-2 border border-gray-200 rounded-xl hover:border-indigo-300 transition-colors bg-white"
                        >
                          <input
                            type="color"
                            v-model="backgroundColor"
                            class="h-8 w-8 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                            :disabled="isTransparent"
                          />
                          <input
                            type="text"
                            v-model="backgroundColor"
                            class="flex-1 border-none focus:ring-0 text-sm font-mono text-gray-600 p-0"
                            :disabled="isTransparent"
                          />
                        </div>
                      </div>
                    </div>

                    <div
                      class="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100"
                    >
                      <div class="flex items-center gap-2">
                        <div
                          class="w-8 h-8 bg-checkerboard rounded-lg border border-gray-200"
                        ></div>
                        <span class="text-sm font-medium text-gray-700"
                          >Transparent Background</span
                        >
                      </div>
                      <button
                        @click="isTransparent = !isTransparent"
                        :class="isTransparent ? 'bg-indigo-600' : 'bg-gray-200'"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                      >
                        <span
                          :class="
                            isTransparent ? 'translate-x-6' : 'translate-x-1'
                          "
                          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm"
                        />
                      </button>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label
                          class="block text-sm font-medium text-gray-700 mb-2"
                          >Dots Style</label
                        >
                        <select
                          v-model="dotsOptionsType"
                          class="block w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        >
                          <option value="rounded">Rounded</option>
                          <option value="dots">Dots</option>
                          <option value="classy">Classy</option>
                          <option value="classy-rounded">Classy Rnd</option>
                          <option value="square">Square</option>
                          <option value="extra-rounded">Extra Rnd</option>
                        </select>
                      </div>

                      <div>
                        <label
                          class="block text-sm font-medium text-gray-700 mb-2"
                          >Corner Frame</label
                        >
                        <select
                          v-model="cornersSquareOptionsType"
                          class="block w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        >
                          <option :value="null">Default</option>
                          <option value="extra-rounded">Extra Rnd</option>
                          <option value="dot">Dot</option>
                          <option value="square">Square</option>
                        </select>
                      </div>

                      <div>
                        <label
                          class="block text-sm font-medium text-gray-700 mb-2"
                          >Corner Dot</label
                        >
                        <select
                          v-model="cornersDotOptionsType"
                          class="block w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        >
                          <option :value="null">Default</option>
                          <option value="dot">Dot</option>
                          <option value="square">Square</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div v-show="activeTab === 'logo'" class="space-y-4">
                    <label
                      for="logo-upload"
                      @dragover.prevent="dragOver = true"
                      @dragleave.prevent="dragOver = false"
                      @drop.prevent="handleDrop"
                      :class="[
                        dragOver
                          ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-100'
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-indigo-300',
                        'relative flex flex-col justify-center items-center rounded-2xl border-2 border-dashed h-48 cursor-pointer transition-all duration-200 group',
                      ]"
                    >
                      <div class="space-y-2 text-center">
                        <div
                          class="mx-auto w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300"
                        >
                          <ImageIcon class="w-6 h-6 text-indigo-600" />
                        </div>
                        <div class="text-sm text-gray-600 font-medium">
                          Click to upload or drag & drop
                        </div>
                        <p class="text-xs text-gray-400">PNG, JPG up to 1MB</p>
                      </div>
                      <input
                        id="logo-upload"
                        @change="handleFileSelect"
                        type="file"
                        accept="image/png, image/jpeg"
                        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </label>

                    <div
                      v-if="logoImage"
                      class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl shadow-sm"
                    >
                      <div class="flex items-center gap-3">
                        <div
                          class="w-10 h-10 rounded-lg border border-gray-100 p-1 bg-white"
                        >
                          <img
                            :src="logoImage"
                            alt="Logo"
                            class="w-full h-full object-contain"
                          />
                        </div>
                        <span class="text-sm font-medium text-gray-700"
                          >Logo selected</span
                        >
                      </div>
                      <button
                        @click="logoImage = null"
                        class="text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="lg:col-span-5 flex flex-col h-full space-y-6">
              <div
                class="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 flex-1 flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden"
              >
                <div
                  class="absolute inset-0 bg-checkerboard opacity-50 pointer-events-none"
                ></div>

                <div
                  class="relative z-10 p-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg ring-1 ring-black/5"
                >
                  <div ref="qrCodeRef" class="qr-canvas-wrapper"></div>
                </div>
              </div>

              <div
                class="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4"
              >
                <div>
                  <label
                    class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2"
                    >Export Size</label
                  >
                  <select
                    v-model="qrSize"
                    class="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option :value="300">300 x 300 px (Small)</option>
                    <option :value="800">800 x 800 px (Medium)</option>
                    <option :value="1200">1200 x 1200 px (High Quality)</option>
                  </select>
                </div>

                <div class="flex gap-3 pt-2">
                  <div class="w-24">
                    <select
                      v-model="downloadExtension"
                      class="block w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium text-center focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="png">PNG</option>
                      <option value="svg">SVG</option>
                      <option value="jpeg">JPG</option>
                    </select>
                  </div>

                  <button
                    @click="downloadQR"
                    :disabled="isTransparent && downloadExtension === 'jpeg'"
                    class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download class="w-5 h-5" />
                    Download
                  </button>
                </div>

                <p
                  v-if="isTransparent && downloadExtension === 'jpeg'"
                  class="text-xs text-red-500 text-center mt-2"
                >
                  JPEG does not support transparency. Please choose PNG.
                </p>

                <button
                  v-if="authStore.user"
                  @click="saveQrStyle"
                  :disabled="isSaving"
                  class="w-full py-2.5 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Save class="w-4 h-4" :class="saveIconClasses" />
                  {{ isSaving ? "Saving..." : "Save this style for future" }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* Custom color input style */
input[type="color"] {
  -webkit-appearance: none;
  border: none;
  width: 32px;
  height: 32px;
  padding: 0;
  overflow: hidden;
  background: none;
}
input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
}
input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: 8px;
}

/* Checkerboard background for transparent preview */
.bg-checkerboard {
  background-color: #ffffff;
  background-image: linear-gradient(45deg, #f3f4f6 25%, transparent 25%),
    linear-gradient(-45deg, #f3f4f6 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f3f4f6 75%),
    linear-gradient(-45deg, transparent 75%, #f3f4f6 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}
</style>