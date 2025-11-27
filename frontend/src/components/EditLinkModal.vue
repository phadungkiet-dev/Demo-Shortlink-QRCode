<script setup>
import { ref, watch } from "vue";
import { X, Save, Link2, Loader2 } from "lucide-vue-next";
import api from "@/services/api";
import Swal from "sweetalert2";
import { useAuthStore } from "@/stores/useAuthStore";

const props = defineProps({
  modelValue: Boolean,
  link: Object,
});

const emit = defineEmits(["update:modelValue"]);
const authStore = useAuthStore();

const targetUrl = ref("");
const isLoading = ref(false);

// อัปเดตข้อมูลในฟอร์มเมื่อมีการเลือก Link ใหม่
watch(
  () => props.link,
  (newLink) => {
    if (newLink) targetUrl.value = newLink.targetUrl;
  }
);

const closeModal = () => emit("update:modelValue", false);

const handleSave = async () => {
  if (!targetUrl.value) return;

  isLoading.value = true;
  try {
    const response = await api.patch(`/links/${props.link.id}`, {
      targetUrl: targetUrl.value,
    });

    // อัปเดตข้อมูลใน Store ทันที (Optimistic Update)
    const index = authStore.myLinks.findIndex((l) => l.id === props.link.id);
    if (index !== -1) {
      authStore.myLinks[index] = {
        ...authStore.myLinks[index],
        ...response.data,
      };
    }

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Link updated!",
      showConfirmButton: false,
      timer: 1500,
    });

    closeModal();
  } catch (error) {
    Swal.fire(
      "Error",
      error.response?.data?.message || "Update failed",
      "error"
    );
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-[100] flex items-center justify-center p-4"
  >
    <div
      class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      @click="closeModal"
    ></div>

    <div
      class="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/50 transform transition-all scale-100"
    >
      <div
        class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50"
      >
        <h3 class="text-lg font-bold text-gray-900">Edit Destination</h3>
        <button
          @click="closeModal"
          class="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-6 space-y-5">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2"
            >Destination URL</label
          >
          <div class="relative">
            <div
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
            >
              <Link2 class="h-5 w-5 text-gray-400" />
            </div>
            <input
              v-model="targetUrl"
              type="url"
              required
              class="block w-full pl-10 pr-4 py-3 bg-gray-50 border-transparent rounded-xl text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 transition-all"
              placeholder="https://example.com"
            />
          </div>
        </div>

        <button
          @click="handleSave"
          :disabled="isLoading"
          class="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-70"
        >
          <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin" />
          <Save v-else class="w-5 h-5" />
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  </div>
</template>