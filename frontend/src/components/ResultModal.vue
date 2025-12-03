<script setup>
import { ref, watchEffect, watch, computed, nextTick } from "vue";
// ... (Imports เหมือนเดิม) ...
import {
  X,
  Copy,
  Check,
  Download,
  Image as ImageIcon,
  Save,
  Palette,
  Settings2,
  Maximize,
  ChevronDown,
  FileType,
  Circle,
  Square,
  MousePointer2,
} from "lucide-vue-next";
import QrCodeStyling from "qr-code-styling";
import Swal from "sweetalert2";
import api from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLinkStore } from "@/stores/useLinkStore";
import { APP_CONFIG } from "@/config/constants";

// ... (Script Logic ทั้งหมดเหมือนเดิม ไม่ต้องแก้) ...
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  link: { type: Object, default: null },
});
const emit = defineEmits(["update:modelValue"]);
const authStore = useAuthStore();
const linkStore = useLinkStore();

const activeTab = ref("design");
const isSaving = ref(false);
const copyIcon = ref(Copy);

const isSizeDropdownOpen = ref(false);
const isFormatDropdownOpen = ref(false);
const isDotsDropdownOpen = ref(false);
const isCornersDropdownOpen = ref(false);

const availableSizes = [300, 500, 800, 1000, 1200];
const dotsOptions = [
  { label: "Rounded", value: "rounded" },
  { label: "Dots", value: "dots" },
  { label: "Classy", value: "classy" },
  { label: "Square", value: "square" },
];
const cornerOptions = [
  { label: "Extra Rounded", value: "extra-rounded" },
  { label: "Dot", value: "dot" },
  { label: "Square", value: "square" },
];

const qrSize = ref(300);
const mainColor = ref(APP_CONFIG.QR.DEFAULT_COLOR);
const backgroundColor = ref(APP_CONFIG.QR.DEFAULT_BG);
const isTransparent = ref(false);
const dotsOptionsType = ref("rounded");
const cornersSquareOptionsType = ref("extra-rounded");
const logoImage = ref(null);
const downloadExtension = ref("png");

const qrCodeRef = ref(null);
const qrCodeInstance = ref(null);

const saveIconClasses = computed(() => ({
  "animate-bounce": isSaving.value,
}));

const currentDotsLabel = computed(
  () =>
    dotsOptions.find((o) => o.value === dotsOptionsType.value)?.label ||
    "Rounded"
);
const currentCornersLabel = computed(
  () =>
    cornerOptions.find((o) => o.value === cornersSquareOptionsType.value)
      ?.label || "Extra Rounded"
);

const closeDropdowns = () => {
  isSizeDropdownOpen.value = false;
  isFormatDropdownOpen.value = false;
  isDotsDropdownOpen.value = false;
  isCornersDropdownOpen.value = false;
};

const closeModal = () => {
  closeDropdowns();
  emit("update:modelValue", false);
};

watch(
  () => props.link,
  (newLink) => {
    if (newLink && newLink.qrOptions) {
      const opts = newLink.qrOptions;
      mainColor.value = opts.mainColor || APP_CONFIG.QR.DEFAULT_COLOR;
      backgroundColor.value = opts.backgroundColor || APP_CONFIG.QR.DEFAULT_BG;
      isTransparent.value = opts.isTransparent || false;
      dotsOptionsType.value = opts.dotsOptionsType || "rounded";
      cornersSquareOptionsType.value =
        opts.cornersSquareOptionsType || "extra-rounded";
      logoImage.value = opts.image || null;
    } else {
      mainColor.value = APP_CONFIG.QR.DEFAULT_COLOR;
      backgroundColor.value = APP_CONFIG.QR.DEFAULT_BG;
      isTransparent.value = false;
      dotsOptionsType.value = "rounded";
      cornersSquareOptionsType.value = "extra-rounded";
      logoImage.value = null;
    }
    qrSize.value = 300;
    downloadExtension.value = "png";
  },
  { immediate: true }
);

watch(isTransparent, (val) => {
  if (val && downloadExtension.value === "jpeg") {
    downloadExtension.value = "png";
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "info",
      title: "JPEG doesn't support transparency",
      text: "Switched to PNG automatically.",
      showConfirmButton: false,
      timer: 3000,
    });
  }
});

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

const downloadQR = async () => {
  const downloadOptions = getQrOptions(qrSize.value);
  if (downloadExtension.value === "svg") {
    downloadOptions.type = "svg";
  } else {
    downloadOptions.type = "canvas";
  }
  const tempQr = new QrCodeStyling(downloadOptions);
  try {
    await tempQr.download({
      name: `qrcode-${props.link.slug}-${qrSize.value}x${qrSize.value}`,
      extension: downloadExtension.value,
    });
  } catch (error) {
    console.error("Download failed:", error);
  }
};

const handleFileSelect = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 1024 * 1024) {
    Swal.fire("Error", "File too large (Max 1MB)", "warning");
    e.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = (event) => {
    logoImage.value = event.target.result;
    e.target.value = "";
  };
  reader.readAsDataURL(file);
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
    @click="closeDropdowns"
  >
    <div
      class="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
      @click="closeModal"
    ></div>

    <div
      class="relative w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      @click.stop="closeDropdowns"
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
              class="bg-white rounded-2xl shadow-sm border border-gray-200 relative"
            >
              <div class="flex border-b border-gray-100">
                <button
                  @click="activeTab = 'design'"
                  :class="[
                    'flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors first:rounded-tl-2xl',
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
                    'flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors last:rounded-tr-2xl',
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
                    <div class="relative">
                      <label
                        class="block text-sm font-medium text-gray-700 mb-2"
                        >Dots Style</label
                      >
                      <button
                        @click.stop="
                          isDotsDropdownOpen = !isDotsDropdownOpen;
                          isCornersDropdownOpen = false;
                        "
                        class="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-indigo-300 transition-all focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <div class="flex items-center gap-2">
                          <Circle class="h-4 w-4 text-gray-400" />
                          {{ currentDotsLabel }}
                        </div>
                        <ChevronDown class="h-4 w-4 text-gray-400" />
                      </button>

                      <transition
                        enter-active-class="transition duration-100 ease-out"
                        enter-from-class="transform scale-95 opacity-0"
                        enter-to-class="transform scale-100 opacity-100"
                        leave-active-class="transition duration-75 ease-in"
                        leave-from-class="transform scale-100 opacity-100"
                        leave-to-class="transform scale-95 opacity-0"
                      >
                        <div
                          v-if="isDotsDropdownOpen"
                          class="absolute bottom-full left-0 mb-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-20"
                        >
                          <div class="p-1 space-y-0.5">
                            <button
                              v-for="opt in dotsOptions"
                              :key="opt.value"
                              @click="
                                dotsOptionsType = opt.value;
                                isDotsDropdownOpen = false;
                              "
                              :class="[
                                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                                dotsOptionsType === opt.value
                                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                                  : 'text-gray-600 hover:bg-gray-50',
                              ]"
                            >
                              {{ opt.label }}
                              <Check
                                v-if="dotsOptionsType === opt.value"
                                class="h-3.5 w-3.5 text-indigo-600"
                              />
                            </button>
                          </div>
                        </div>
                      </transition>
                    </div>

                    <div class="relative">
                      <label
                        class="block text-sm font-medium text-gray-700 mb-2"
                        >Corner Style</label
                      >
                      <button
                        @click.stop="
                          isCornersDropdownOpen = !isCornersDropdownOpen;
                          isDotsDropdownOpen = false;
                        "
                        class="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-indigo-300 transition-all focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <div class="flex items-center gap-2">
                          <Square class="h-4 w-4 text-gray-400" />
                          {{ currentCornersLabel }}
                        </div>
                        <ChevronDown class="h-4 w-4 text-gray-400" />
                      </button>

                      <transition
                        enter-active-class="transition duration-100 ease-out"
                        enter-from-class="transform scale-95 opacity-0"
                        enter-to-class="transform scale-100 opacity-100"
                        leave-active-class="transition duration-75 ease-in"
                        leave-from-class="transform scale-100 opacity-100"
                        leave-to-class="transform scale-95 opacity-0"
                      >
                        <div
                          v-if="isCornersDropdownOpen"
                          class="absolute bottom-full left-0 mb-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-20"
                        >
                          <div class="p-1 space-y-0.5">
                            <button
                              v-for="opt in cornerOptions"
                              :key="opt.value"
                              @click="
                                cornersSquareOptionsType = opt.value;
                                isCornersDropdownOpen = false;
                              "
                              :class="[
                                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                                cornersSquareOptionsType === opt.value
                                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                                  : 'text-gray-600 hover:bg-gray-50',
                              ]"
                            >
                              {{ opt.label }}
                              <Check
                                v-if="cornersSquareOptionsType === opt.value"
                                class="h-3.5 w-3.5 text-indigo-600"
                              />
                            </button>
                          </div>
                        </div>
                      </transition>
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
              <div class="flex gap-2">
                <div class="relative w-1/3">
                  <button
                    @click.stop="
                      isSizeDropdownOpen = !isSizeDropdownOpen;
                      isFormatDropdownOpen = false;
                    "
                    class="w-full flex items-center justify-between px-3 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-indigo-300 hover:ring-4 hover:ring-indigo-500/10 transition-all active:scale-[0.98]"
                  >
                    <div class="flex items-center gap-2">
                      <Maximize class="h-4 w-4 text-gray-400" />
                      {{ qrSize }}px
                    </div>
                    <ChevronDown class="h-4 w-4 text-gray-400" />
                  </button>

                  <transition
                    enter-active-class="transition duration-100 ease-out"
                    enter-from-class="transform scale-95 opacity-0"
                    enter-to-class="transform scale-100 opacity-100"
                    leave-active-class="transition duration-75 ease-in"
                    leave-from-class="transform scale-100 opacity-100"
                    leave-to-class="transform scale-95 opacity-0"
                  >
                    <div
                      v-if="isSizeDropdownOpen"
                      class="absolute bottom-full left-0 mb-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-20"
                    >
                      <div class="p-1 space-y-0.5 max-h-48 overflow-y-auto">
                        <button
                          v-for="size in availableSizes"
                          :key="size"
                          @click="
                            qrSize = size;
                            isSizeDropdownOpen = false;
                          "
                          :class="[
                            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                            qrSize === size
                              ? 'bg-indigo-50 text-indigo-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50',
                          ]"
                        >
                          {{ size }}px
                          <Check
                            v-if="qrSize === size"
                            class="h-3.5 w-3.5 text-indigo-600"
                          />
                        </button>
                      </div>
                    </div>
                  </transition>
                </div>

                <div class="relative w-1/3">
                  <button
                    @click.stop="
                      isFormatDropdownOpen = !isFormatDropdownOpen;
                      isSizeDropdownOpen = false;
                    "
                    class="w-full flex items-center justify-between px-3 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-indigo-300 hover:ring-4 hover:ring-indigo-500/10 transition-all active:scale-[0.98]"
                  >
                    <div class="flex items-center gap-2">
                      <FileType class="h-4 w-4 text-gray-400" />
                      {{ downloadExtension.toUpperCase() }}
                    </div>
                    <ChevronDown class="h-4 w-4 text-gray-400" />
                  </button>

                  <transition
                    enter-active-class="transition duration-100 ease-out"
                    enter-from-class="transform scale-95 opacity-0"
                    enter-to-class="transform scale-100 opacity-100"
                    leave-active-class="transition duration-75 ease-in"
                    leave-from-class="transform scale-100 opacity-100"
                    leave-to-class="transform scale-95 opacity-0"
                  >
                    <div
                      v-if="isFormatDropdownOpen"
                      class="absolute bottom-full left-0 mb-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-20"
                    >
                      <div class="p-1 space-y-0.5">
                        <button
                          v-for="ext in ['png', 'svg', 'jpeg']"
                          :key="ext"
                          :disabled="ext === 'jpeg' && isTransparent"
                          @click="
                            downloadExtension = ext;
                            isFormatDropdownOpen = false;
                          "
                          :class="[
                            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                            downloadExtension === ext
                              ? 'bg-indigo-50 text-indigo-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50',
                            ext === 'jpeg' && isTransparent
                              ? 'opacity-50 cursor-not-allowed'
                              : '',
                          ]"
                        >
                          {{ ext.toUpperCase() }}
                          <Check
                            v-if="downloadExtension === ext"
                            class="h-3.5 w-3.5 text-indigo-600"
                          />
                        </button>
                      </div>
                    </div>
                  </transition>
                </div>

                <button
                  @click="downloadQR"
                  class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Download class="w-5 h-5" />
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