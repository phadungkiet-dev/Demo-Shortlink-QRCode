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

// --- Computed Data ---
const initials = computed(() => {
  if (!authStore.user?.email) return "?";
  const email = authStore.user.email;
  const parts = email.split("@")[0].split(".");
  if (parts.length > 1 && parts[0].length > 0 && parts[1].length > 0) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
});

const userRole = computed(() => authStore.user?.role || "USER");
const userEmail = computed(() => authStore.user?.email || "");

// --- Click Outside (Desktop Only) ---
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

// --- Actions ---
const handleItemClick = () => {
  if (props.mode === "desktop") isOpen.value = false;
  emit("close-menu");
};

const handleLogoutClick = () => {
  handleItemClick();
  Swal.fire({
    title: "Sign out?",
    text: "You will be returned to the home page.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#4F46E5",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, sign out",
  }).then((result) => {
    if (result.isConfirmed) {
      authStore.logout();
    }
  });
};

// --- Styles ---
// รวม Class พื้นฐานของรายการเมนูไว้ที่เดียว
const menuItemClass =
  "group flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 rounded-xl transition-all hover:bg-indigo-50 hover:text-indigo-600";
// Class สำหรับสถานะ Active (Current Page)
const activeClass =
  "bg-indigo-50 text-indigo-600 !font-semibold ring-1 ring-indigo-100";
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
      class="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-md hover:shadow-lg hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500 transition-all active:scale-95"
    >
      {{ initials }}
    </button>

    <transition
      :enter-active-class="
        mode === 'desktop' ? 'transition ease-out duration-200' : ''
      "
      :enter-from-class="
        mode === 'desktop' ? 'transform opacity-0 scale-95 translate-y-2' : ''
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
        mode === 'desktop' ? 'transform opacity-0 scale-95 translate-y-2' : ''
      "
    >
      <div
        v-show="isOpen || mode === 'mobile'"
        :class="[
          'bg-white overflow-hidden',
          // Desktop Specific Styles
          mode === 'desktop'
            ? 'absolute right-0 mt-3 w-72 origin-top-right rounded-2xl shadow-2xl ring-1 ring-black/5 z-50'
            : '',
          // Mobile Specific Styles
          mode === 'mobile'
            ? 'w-full rounded-xl border border-gray-100 shadow-sm'
            : '',
        ]"
      >
        <div class="px-5 py-4 bg-gray-50/50 border-b border-gray-100">
          <div class="flex items-center gap-3">
            <div
              class="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-200"
            >
              {{ initials }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-bold text-gray-900 truncate">
                {{ userEmail }}
              </p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span
                  class="w-1.5 h-1.5 rounded-full"
                  :class="
                    userRole === 'ADMIN' ? 'bg-purple-500' : 'bg-emerald-500'
                  "
                ></span>
                <p class="text-xs font-medium text-gray-500 capitalize">
                  {{ userRole.toLowerCase() }} Account
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="p-2 space-y-1">
          <router-link
            to="/dashboard"
            :class="menuItemClass"
            :active-class="activeClass"
            @click="handleItemClick"
          >
            <LayoutDashboard
              class="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors"
            />
            Dashboard
          </router-link>

          <router-link
            v-if="userRole === 'ADMIN'"
            to="/admin/users"
            :class="menuItemClass"
            :active-class="activeClass"
            @click="handleItemClick"
          >
            <Shield
              class="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors"
            />
            User Management
          </router-link>

          <router-link
            to="/profile"
            :class="menuItemClass"
            :active-class="activeClass"
            @click="handleItemClick"
          >
            <User
              class="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors"
            />
            My Profile
          </router-link>

          <router-link
            to="/settings"
            :class="menuItemClass"
            :active-class="activeClass"
            @click="handleItemClick"
          >
            <Settings
              class="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors"
            />
            Settings
          </router-link>
        </div>

        <div class="p-2 border-t border-gray-100 bg-gray-50/30">
          <button
            @click="handleLogoutClick"
            class="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors group"
          >
            <LogOut
              class="w-4 h-4 text-red-400 group-hover:text-red-600 transition-colors"
            />
            Sign out
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>