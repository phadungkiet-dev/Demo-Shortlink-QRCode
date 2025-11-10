// frontend/src/components/UserDropdown.vue

<template>
  <div class="relative" ref="dropdownRoot">
    <!-- 1. Avatar Button (ปุ่มวงกลม) -->
    <button
      @click="isOpen = !isOpen"
      type="button"
      class="flex items-center justify-center h-9 w-9 rounded-full bg-indigo-600 text-white text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      {{ initials }}
    </button>

    <!-- 2. Dropdown Panel (ที่ซ่อนไว้) -->
    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
      >
        <div class="py-1" role="menu" aria-orientation="vertical">
          <!-- Header (Email) -->
          <div class="px-4 py-3 border-b border-gray-200">
            <p class="text-sm text-gray-900">Signed in as</p>
            <p class="truncate text-sm font-medium text-gray-700">
              {{ authStore.user.email }}
            </p>
          </div>

          <!-- Menu Items (อนาคต) -->
          <div class="py-1" role="none">
            <a
              href="#"
              class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 opacity-50 cursor-not-allowed"
              role="menuitem"
              >(My Profile - soon)</a
            >
            <a
              href="#"
              class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 opacity-50 cursor-not-allowed"
              role="menuitem"
              >(Settings - soon)</a
            >
          </div>

          <!-- Logout Button -->
          <div class="py-1 border-t border-gray-200" role="none">
            <button
              @click="handleLogoutClick"
              class="block w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50"
              role="menuitem"
            >
              <LogOut class="h-4 w-4 inline mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";
import { LogOut } from "lucide-vue-next";
import Swal from "sweetalert2";

const authStore = useAuthStore();
const isOpen = ref(false);
const dropdownRoot = ref(null); // (สำหรับ Click Outside)

// (สำคัญ) 1. Logic สร้าง "ตัวย่อ" (Initials)
const initials = computed(() => {
  if (!authStore.user || !authStore.user.email) {
    return "?";
  }

  const email = authStore.user.email;
  const parts = email.split("@")[0].split("."); // เช่น 'phadungkiet.b'

  if (parts.length > 1 && parts[0].length > 0 && parts[1].length > 0) {
    // "PB" (จาก 'p'hadungkiet และ 'b')
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // "PH" (จาก 'ph'adungkiet)
  return email.substring(0, 2).toUpperCase();
});

// (สำคัญ) 2. Logic "Click Outside"
// (ถ้าคลิกที่อื่น... ให้ปิด Dropdown)
const handleClickOutside = (event) => {
  if (dropdownRoot.value && !dropdownRoot.value.contains(event.target)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("mousedown", handleClickOutside);
});
onUnmounted(() => {
  document.removeEventListener("mousedown", handleClickOutside);
});

// (สำคัญ) 3. Logic "Logout" (ย้ายมาจาก AppHeader.vue)
const handleLogoutClick = () => {
  isOpen.value = false; // (ปิด Dropdown ก่อน)

  Swal.fire({
    title: "Are you sure?",
    text: "You will be logged out of your account.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#4F46E5",
    cancelButtonColor: "#D33",
    confirmButtonText: "Yes, log me out!",
  }).then((result) => {
    if (result.isConfirmed) {
      authStore.logout();
    }
  });
};
</script>