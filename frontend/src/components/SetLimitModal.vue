<script setup>
// Vue Core
import { ref, watch } from "vue";
// Config
import { APP_CONFIG } from "@/config/constants";
// Icons
import { X, Save, Gauge, Loader2 } from "lucide-vue-next";

const props = defineProps({
  modelValue: Boolean,
  user: Object,
  isLoading: Boolean,
});

const emit = defineEmits(["update:modelValue", "save"]);
const defaultLimit = APP_CONFIG.DEFAULTS.LINK_LIMIT;
const limit = ref(defaultLimit);

// Watch for user changes to set initial limit
watch(
  () => props.user,
  (newUser) => {
    if (newUser) {
      limit.value =
        newUser.linkLimit !== undefined ? newUser.linkLimit : defaultLimit;
    }
  },
  { immediate: true }
);

const closeModal = () => emit("update:modelValue", false);
const handleSave = () => {
  // Safety check: Ensure limit is at least 0
  if (limit.value < 0) limit.value = 0;
  emit("save", limit.value);
};
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0"
  >
    <div
      class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      @click="closeModal"
    ></div>

    <div
      class="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/50 transform transition-all scale-100 mx-4"
    >
      <div
        class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50"
      >
        <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Gauge class="w-5 h-5 text-indigo-600" /> Set Quota
        </h3>
        <button
          @click="closeModal"
          class="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-6 space-y-6">
        <div class="text-center">
          <div
            class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 mb-3"
          >
            <span class="text-xl font-bold text-indigo-600">{{ limit }}</span>
          </div>
          <p class="text-sm text-gray-500">
            Adjusting link limit for <br /><span
              class="font-semibold text-gray-900"
              >{{ user?.email }}</span
            >
          </p>
        </div>

        <div>
          <label
            class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2"
            >Max Links Allowed</label
          >
          <div class="flex items-center gap-3">
            <button
              @click="limit = Math.max(0, limit - 1)"
              class="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all font-bold text-gray-600 select-none"
            >
              -
            </button>
            <input
              v-model.number="limit"
              type="number"
              min="0"
              class="block w-full text-center px-4 py-2.5 bg-gray-50 border-transparent rounded-xl text-gray-900 font-bold text-lg focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
              @keyup.enter="handleSave"
            />
            <button
              @click="limit++"
              class="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all font-bold text-gray-600 select-none"
            >
              +
            </button>
          </div>
        </div>

        <button
          @click="handleSave"
          :disabled="isLoading"
          class="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-70"
        >
          <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin" />
          <Save v-else class="w-5 h-5" /> <span>Save Changes</span>
        </button>
      </div>
    </div>
  </div>
</template>