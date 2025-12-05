<script setup>
// Stores
import { useAuthStore } from "@/stores/useAuthStore";
// Icons
import {
  Trash2,
  AlertTriangle,
  Settings as SettingsIcon,
} from "lucide-vue-next";

// -------------------------------------------------------------------
// Setup & State
// -------------------------------------------------------------------
const authStore = useAuthStore();

// -------------------------------------------------------------------
// Actions
// -------------------------------------------------------------------
const handleDeleteAccount = () => {
  authStore.deleteAccount();
};
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-gray-50/50 py-10 lg:py-16">
    <div class="container mx-auto px-4 lg:px-8 max-w-3xl">
      <div class="mb-10 text-center sm:text-left">
        <h1
          class="text-3xl font-bold text-gray-900 flex items-center justify-center sm:justify-start gap-3 tracking-tight"
        >
          <SettingsIcon class="h-8 w-8 text-indigo-600" />
          Settings
        </h1>
        <p class="text-gray-500 mt-2 text-lg">
          Manage your account preferences and data.
        </p>
      </div>

      <div
        class="bg-white rounded-[2rem] shadow-xl shadow-red-100/50 border border-gray-100 overflow-hidden"
      >
        <div
          class="px-8 py-6 border-b border-red-100 bg-red-50/50 flex items-center gap-3"
        >
          <div class="p-2.5 bg-red-100 rounded-xl text-red-600">
            <AlertTriangle class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-900">Danger Zone</h2>
            <p class="text-sm text-red-600/80">
              Irreversible actions for your account.
            </p>
          </div>
        </div>

        <div class="p-8 sm:p-10">
          <div class="flex flex-col sm:flex-row items-start gap-6">
            <div class="flex-1">
              <h3 class="text-xl font-bold text-gray-900 mb-3">
                Delete Account
              </h3>
              <p class="text-gray-500 leading-relaxed mb-6">
                Deleting your account is
                <span class="font-bold text-red-600">permanent</span>. All your
                short links, QR codes, and analytics data will be wiped out
                immediately. You cannot undo this action.
              </p>
            </div>

            <button
              @click="handleDeleteAccount"
              class="shrink-0 w-full sm:w-auto inline-flex items-center justify-center self-center gap-2 px-8 h-[46px] bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-300 hover:shadow-lg hover:shadow-red-500/30 transition-all active:scale-[0.98]"
            >
              <Trash2 class="w-5 h-5" />
              <span>Delete My Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>