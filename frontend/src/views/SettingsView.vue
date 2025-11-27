<script setup>
import { useAuthStore } from "@/stores/useAuthStore";
import {
  Trash2,
  AlertTriangle,
  Settings as SettingsIcon,
} from "lucide-vue-next";

const authStore = useAuthStore();

const handleDeleteAccount = () => {
  authStore.deleteAccount();
};
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-gray-50/50 py-10">
    <div class="container mx-auto px-4 lg:px-8">
      <div class="mb-8">
        <h1
          class="text-3xl font-bold text-gray-900 flex items-center gap-3 tracking-tight"
        >
          <SettingsIcon class="h-8 w-8 text-indigo-600" />
          Settings
        </h1>
        <p class="text-gray-500 mt-2">Manage your account preferences.</p>
      </div>

      <div class="space-y-6">
        <div
          class="bg-white shadow-sm rounded-2xl p-6 sm:p-8 border border-gray-200"
        >
          <div class="flex items-start gap-6">
            <div class="p-4 bg-red-100 text-red-600 rounded-2xl shrink-0">
              <AlertTriangle class="w-8 h-8" />
            </div>

            <div class="flex-1">
              <h2 class="text-xl font-bold text-gray-900 mb-2">
                Delete Account
              </h2>

              <p class="text-gray-500 leading-relaxed mb-6 max-w-3xl">
                Deleting your account is
                <span class="font-semibold text-red-600">permanent</span>. All
                your short links, QR codes, and analytics data will be wiped out
                immediately. You cannot undo this action.
              </p>

              <div>
                <button
                  @click="handleDeleteAccount"
                  class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-300 transition-all active:scale-95"
                >
                  <Trash2 class="w-5 h-5" />
                  <span>Delete My Account</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>