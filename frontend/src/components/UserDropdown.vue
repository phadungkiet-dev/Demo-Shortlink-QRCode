<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  LogOut,
  User,
  Settings,
  Shield,
  LayoutDashboard,
} from "lucide-vue-next";
import Swal from "sweetalert2";

const props = defineProps({
  mode: {
    type: String,
    default: "desktop", // 'desktop' | 'mobile'
  },
});

const emit = defineEmits(["close-menu"]);

const authStore = useAuthStore();
const isOpen = ref(false);
const dropdownRoot = ref(null);

// 1. Logic Initials
const initials = computed(() => {
  if (!authStore.user || !authStore.user.email) return "?";
  const email = authStore.user.email;
  const parts = email.split("@")[0].split(".");
  if (parts.length > 1 && parts[0].length > 0 && parts[1].length > 0) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
});

// 2. Click Outside (ใช้เฉพาะ Desktop)
const handleClickOutside = (event) => {
  if (
    props.mode === "desktop" &&
    dropdownRoot.value &&
    !dropdownRoot.value.contains(event.target)
  ) {
    isOpen.value = false;
  }
};

onMounted(() => {
  if (props.mode === "desktop") {
    document.addEventListener("mousedown", handleClickOutside);
  }
});
onUnmounted(() => {
  document.removeEventListener("mousedown", handleClickOutside);
});

// Helper: สั่งปิดเมนู
const handleItemClick = () => {
  isOpen.value = false;
  emit("close-menu");
};

// 3. Logout
const handleLogoutClick = () => {
  handleItemClick();
  Swal.fire({
    title: "Are you sure?",
    text: "You will be logged out.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#4F46E5",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, log out",
  }).then((result) => {
    if (result.isConfirmed) {
      authStore.logout();
    }
  });
};

// [Modified] Class สำหรับเมนูไอเท็ม (ย้ายจาก <style> มาเป็นตัวแปร)
const menuItemClasses =
  "group flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors w-full text-left cursor-pointer";
</script>

<template>
  <div
    ref="dropdownRoot"
    :class="['relative', mode === 'mobile' ? 'w-full' : '']"
  >
    <button
      v-if="mode === 'desktop'"
      @click="isOpen = !isOpen"
      type="button"
      class="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      {{ initials }}
    </button>

    <transition
      :enter-active-class="
        mode === 'desktop' ? 'transition ease-out duration-200' : ''
      "
      :enter-from-class="
        mode === 'desktop' ? 'transform opacity-0 scale-95 -translate-y-2' : ''
      "
      :enter-to-class="
        mode === 'desktop'
          ? 'transform opacity-100 scale-100 translate-y-0'
          : ''
      "
      :leave-active-class="
        mode === 'desktop' ? 'transition ease-in duration-150' : ''
      "
      :leave-from-class="
        mode === 'desktop'
          ? 'transform opacity-100 scale-100 translate-y-0'
          : ''
      "
      :leave-to-class="
        mode === 'desktop' ? 'transform opacity-0 scale-95 -translate-y-2' : ''
      "
    >
      <div
        v-if="isOpen || mode === 'mobile'"
        :class="[
          // Styles สำหรับ Desktop (Popup)
          mode === 'desktop'
            ? 'absolute right-0 mt-3 w-64 origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-black/5 focus:outline-none z-50 overflow-hidden'
            : '',
          // Styles สำหรับ Mobile (Embedded List)
          mode === 'mobile' ? 'w-full space-y-2' : '',
        ]"
      >
        <div
          v-if="mode === 'mobile'"
          class="flex items-center gap-3 px-2 py-3 bg-gray-50 rounded-xl mb-2"
        >
          <div
            class="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-200"
          >
            {{ initials }}
          </div>
          <div class="overflow-hidden">
            <p class="text-sm font-semibold text-gray-900 truncate">
              {{ authStore.user.email }}
            </p>
            <p class="text-xs text-gray-500 capitalize">
              {{ authStore.user.role }} Account
            </p>
          </div>
        </div>

        <div v-else class="px-4 py-4 bg-gray-50 border-b border-gray-100">
          <p
            class="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1"
          >
            Signed in as
          </p>
          <p class="truncate text-sm font-bold text-gray-900">
            {{ authStore.user.email }}
          </p>
          <span
            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 mt-2"
          >
            {{ authStore.user.role }}
          </span>
        </div>

        <div :class="mode === 'desktop' ? 'py-2' : 'space-y-1'">
          <router-link
            to="/dashboard"
            @click="handleItemClick"
            :class="[menuItemClasses, mode === 'mobile' ? 'rounded-xl' : '']"
          >
            <LayoutDashboard
              class="mr-3 h-4 w-4 text-gray-400 group-hover:text-indigo-500"
              :class="mode === 'mobile' ? 'h-5 w-5' : ''"
            />
            Dashboard
          </router-link>

          <router-link
            v-if="authStore.user?.role === 'ADMIN'"
            to="/admin/users"
            @click="handleItemClick"
            :class="[menuItemClasses, mode === 'mobile' ? 'rounded-xl' : '']"
          >
            <Shield
              class="mr-3 h-4 w-4 text-gray-400 group-hover:text-indigo-500"
              :class="mode === 'mobile' ? 'h-5 w-5' : ''"
            />
            <span v-if="mode === 'mobile'">Manage Users</span>
            <span v-else>Admin Panel</span>
          </router-link>

          <router-link
            to="/profile"
            @click="handleItemClick"
            :class="[menuItemClasses, mode === 'mobile' ? 'rounded-xl' : '']"
          >
            <User
              class="mr-3 h-4 w-4 text-gray-400 group-hover:text-indigo-500"
              :class="mode === 'mobile' ? 'h-5 w-5' : ''"
            />
            My Profile
          </router-link>

          <router-link
            to="/settings"
            @click="handleItemClick"
            :class="[menuItemClasses, mode === 'mobile' ? 'rounded-xl' : '']"
          >
            <Settings
              class="mr-3 h-4 w-4 text-gray-400 group-hover:text-indigo-500"
              :class="mode === 'mobile' ? 'h-5 w-5' : ''"
            />
            Settings
          </router-link>
        </div>

        <div
          :class="[
            mode === 'desktop'
              ? 'border-t border-gray-100 bg-gray-50 p-2'
              : 'border-t border-gray-100 pt-2 mt-2',
          ]"
        >
          <button
            @click="handleLogoutClick"
            :class="[
              'flex w-full items-center gap-2 px-4 py-2 text-sm font-medium transition-all',
              mode === 'desktop'
                ? 'justify-center text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-700'
                : 'text-red-600 hover:bg-red-50 rounded-xl justify-start',
            ]"
          >
            <LogOut :class="mode === 'desktop' ? 'h-4 w-4' : 'h-5 w-5'" />
            Sign out
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>