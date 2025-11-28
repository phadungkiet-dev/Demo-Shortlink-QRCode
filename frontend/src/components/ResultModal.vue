<script setup>
import { ref, watchEffect, watch, computed } from "vue";
import {
  X,
  Copy,
  Check,
  Download,
  Image as ImageIcon,
  Save,
  Palette,
  Settings2,
} from "lucide-vue-next";
import QrCodeStyling from "qr-code-styling";
import Swal from "sweetalert2";
import api from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLinkStore } from "@/stores/useLinkStore";
import { APP_CONFIG } from "@/config/constants";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  link: { type: Object, default: null },
});
const emit = defineEmits(["update:modelValue"]);
const authStore = useAuthStore();
const linkStore = useLinkStore();

// UI States
const activeTab = ref("design"); // 'design' | 'logo'
const isSaving = ref(false);
const copyIcon = ref(Copy);

// QR Config States
const qrSize = ref(APP_CONFIG.QR.DEFAULT_SIZE);
const mainColor = ref(APP_CONFIG.QR.DEFAULT_COLOR);
const backgroundColor = ref(APP_CONFIG.QR.DEFAULT_BG);
const isTransparent = ref(false);
const dotsOptionsType = ref("rounded");
const cornersSquareOptionsType = ref("extra-rounded");
const logoImage = ref(null);
const downloadExtension = ref("png");

const qrCodeRef = ref(null);
const qrCodeInstance = ref(null);

// [Modified] Computed Class สำหรับ Icon Save
const saveIconClasses = computed(() => ({
  "animate-bounce": isSaving.value,
}));

const closeModal = () => emit("update:modelValue", false);

// Init & Reset
watch(
  () => props.link,
  (newLink) => {
    if (newLink && newLink.qrOptions) {
      // Load config from DB
      const opts = newLink.qrOptions;
      mainColor.value = opts.mainColor || APP_CONFIG.QR.DEFAULT_COLOR;
      backgroundColor.value = opts.backgroundColor || APP_CONFIG.QR.DEFAULT_BG;
      isTransparent.value = opts.isTransparent || false;
      dotsOptionsType.value = opts.dotsOptionsType || "rounded";
      cornersSquareOptionsType.value =
        opts.cornersSquareOptionsType || "extra-rounded";
      logoImage.value = opts.image || null;
    } else {
      // Reset to defaults
      mainColor.value = APP_CONFIG.QR.DEFAULT_COLOR;
      backgroundColor.value = APP_CONFIG.QR.DEFAULT_BG;
      isTransparent.value = false;
      dotsOptionsType.value = "rounded";
      cornersSquareOptionsType.value = "extra-rounded";
      logoImage.value = null;
    }
  },
  { immediate: true }
);

// QR Generation Logic
const getQrOptions = (width) => ({
  width,
  height: width,
  type: "canvas",
  data: props.link?.shortUrl || "",
  image: logoImage.value,
  dotsOptions: { color: mainColor.value, type: dotsOptionsType.value },
  cornersSquareOptions: {
    color: mainColor.value,
    type: cornersSquareOptionsType.value,
  },
  backgroundOptions: {
    color: isTransparent.value ? "transparent" : backgroundColor.value,
  },
  imageOptions: { crossOrigin: "anonymous", margin: 10 },
});

watchEffect(() => {
  if (props.modelValue && props.link && qrCodeRef.value) {
    if (!qrCodeInstance.value) {
      qrCodeInstance.value = new QrCodeStyling(getQrOptions(300));
    } else {
      qrCodeInstance.value.update(getQrOptions(300));
    }
    qrCodeRef.value.innerHTML = "";
    qrCodeInstance.value.append(qrCodeRef.value);
  }
});

// Actions
const saveQrStyle = async () => {
  if (!props.link) return;
  isSaving.value = true;
  const config = {
    mainColor: mainColor.value,
    backgroundColor: backgroundColor.value,
    isTransparent: isTransparent.value,
    dotsOptionsType: dotsOptionsType.value,
    cornersSquareOptionsType: cornersSquareOptionsType.value,
    image: logoImage.value,
  };

  try {
    await api.patch(`/links/${props.link.id}`, { qrOptions: config });
    linkStore.updateLinkInStore({ id: props.link.id, qrOptions: config });
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

const downloadQR = () => {
  if (!qrCodeInstance.value) return;
  qrCodeInstance.value.update(getQrOptions(qrSize.value));
  qrCodeInstance.value.download({
    name: `qrcode-${props.link.slug}`,
    extension: downloadExtension.value,
  });
  // Revert preview size
  setTimeout(() => qrCodeInstance.value.update(getQrOptions(300)), 100);
};

const handleFileSelect = (e) => {
  const file = e.target.files[0];
  if (file && file.size <= 1024 * 1024) {
    // 1MB limit
    const reader = new FileReader();
    reader.onload = (e) => {
      logoImage.value = e.target.result;
    };
    reader.readAsDataURL(file);
  } else {
    Swal.fire("Error", "File too large (Max 1MB)", "warning");
  }
};

const copyToClipboard = () => {
  navigator.clipboard.writeText(props.link?.shortUrl);
  copyIcon.value = Check;
  setTimeout(() => (copyIcon.value = Copy), 2000);
};
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-[100] flex items-center justify-center p-4"
  >
    <div
      class="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
      @click="closeModal"
    ></div>

    <div
      class="relative w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
    >
      <div
        class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0"
      >
        <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Settings2 class="w-5 h-5 text-indigo-600" /> Customize QR Code
        </h2>
        <button
          @click="closeModal"
          class="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
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
                >Short Link</label
              >
              <div class="flex gap-2">
                <div
                  class="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 font-mono text-sm truncate"
                >
                  {{ link?.shortUrl }}
                </div>
                <button
                  @click="copyToClipboard"
                  class="px-4 bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors"
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
                  :class="[
                    'flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors',
                    activeTab === 'design'
                      ? 'text-indigo-600 bg-indigo-50/50 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:bg-gray-50',
                  ]"
                >
                  <Palette class="w-4 h-4" /> Colors & Shapes
                </button>
                <button
                  @click="activeTab = 'logo'"
                  :class="[
                    'flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors',
                    activeTab === 'logo'
                      ? 'text-indigo-600 bg-indigo-50/50 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:bg-gray-50',
                  ]"
                >
                  <ImageIcon class="w-4 h-4" /> Add Logo
                </button>
              </div>

              <div class="p-6 space-y-6">
                <div v-show="activeTab === 'design'" class="space-y-6">
                  <div class="grid grid-cols-2 gap-5">
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 mb-2"
                        >Main Color</label
                      >
                      <div
                        class="flex items-center gap-2 p-2 border border-gray-200 rounded-xl bg-white"
                      >
                        <input
                          type="color"
                          v-model="mainColor"
                          class="h-8 w-8 rounded cursor-pointer border-0 bg-transparent p-0"
                        />
                        <span class="text-sm font-mono text-gray-500">{{
                          mainColor
                        }}</span>
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
                        class="flex items-center gap-2 p-2 border border-gray-200 rounded-xl bg-white"
                      >
                        <input
                          type="color"
                          v-model="backgroundColor"
                          class="h-8 w-8 rounded cursor-pointer border-0 bg-transparent p-0"
                        />
                        <span class="text-sm font-mono text-gray-500">{{
                          backgroundColor
                        }}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    class="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100"
                  >
                    <span class="text-sm font-medium text-gray-700"
                      >Transparent Background</span
                    >
                    <input
                      type="checkbox"
                      v-model="isTransparent"
                      class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 mb-2"
                        >Dots Style</label
                      >
                      <select
                        v-model="dotsOptionsType"
                        class="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="rounded">Rounded</option>
                        <option value="dots">Dots</option>
                        <option value="classy">Classy</option>
                        <option value="square">Square</option>
                      </select>
                    </div>
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 mb-2"
                        >Corner Style</label
                      >
                      <select
                        v-model="cornersSquareOptionsType"
                        class="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="extra-rounded">Extra Rounded</option>
                        <option value="dot">Dot</option>
                        <option value="square">Square</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div v-show="activeTab === 'logo'" class="space-y-4">
                  <div
                    class="relative flex flex-col justify-center items-center rounded-2xl border-2 border-dashed border-gray-300 h-40 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <ImageIcon class="w-8 h-8 text-gray-400 mb-2" />
                    <p class="text-sm text-gray-500">Click to upload logo</p>
                    <input
                      type="file"
                      accept="image/*"
                      @change="handleFileSelect"
                      class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <div
                    v-if="logoImage"
                    class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl"
                  >
                    <div class="flex items-center gap-3">
                      <img
                        :src="logoImage"
                        class="w-10 h-10 object-contain rounded border border-gray-100"
                      />
                      <span class="text-sm text-gray-600">Logo selected</span>
                    </div>
                    <button
                      @click="logoImage = null"
                      class="text-xs text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg font-bold"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="lg:col-span-5 flex flex-col gap-6">
            <div
              class="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-200 flex items-center justify-center min-h-[350px] relative overflow-hidden"
            >
              <div
                class="absolute inset-0 bg-checkerboard opacity-30 pointer-events-none"
              ></div>
              <div
                ref="qrCodeRef"
                class="relative z-10 p-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg ring-1 ring-black/5"
              ></div>
            </div>

            <div
              class="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4"
            >
              <div class="flex gap-3">
                <select
                  v-model="downloadExtension"
                  class="w-24 px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-center focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="png">PNG</option>
                  <option value="jpeg">JPG</option>
                  <option value="svg">SVG</option>
                </select>
                <button
                  @click="downloadQR"
                  class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Download class="w-5 h-5" /> Download
                </button>
              </div>
              <button
                v-if="authStore.user"
                @click="saveQrStyle"
                :disabled="isSaving"
                class="w-full py-2.5 text-sm font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Save class="w-4 h-4" :class="saveIconClasses" /> Save Style
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-checkerboard {
  background-image: linear-gradient(45deg, #eee 25%, transparent 25%),
    linear-gradient(-45deg, #eee 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #eee 75%),
    linear-gradient(-45deg, transparent 75%, #eee 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}
</style>