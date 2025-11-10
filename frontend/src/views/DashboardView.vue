<template>
  <div class="container mx-auto px-4 lg:px-8 py-12">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900">My Links</h1>
      <router-link
        to="/"
        class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-indigo-700 flex items-center gap-2"
      >
        <Plus class="h-4 w-4" />
        Create New
      </router-link>
    </div>

    <!-- Loading State -->
    <div v-if="authStore.isLoadingLinks" class="text-center py-10">
      <Loader2 class="h-8 w-8 text-indigo-600 mx-auto animate-spin" />
      <p class="mt-2 text-gray-600">Loading links...</p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!authStore.isLoadingLinks && authStore.myLinks.length === 0"
      class="text-center py-10 bg-white shadow rounded-lg"
    >
      <Link2 class="h-12 w-12 text-gray-400 mx-auto" />
      <h3 class="mt-2 text-lg font-medium text-gray-900">No links found</h3>
      <p class="mt-1 text-sm text-gray-500">
        Get started by creating your first shortlink.
      </p>
    </div>

    <!-- Links List -->
    <div v-else class="bg-white shadow overflow-hidden rounded-lg">
      <ul class="divide-y divide-gray-200">
        <li v-for="link in authStore.myLinks" :key="link.id" class="p-4 sm:p-6">
          <div
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex-1 min-w-0">
              <a
                :href="link.shortUrl"
                target="_blank"
                class="text-lg font-medium text-indigo-600 hover:text-indigo-800 truncate"
                >{{ link.shortUrl }}</a
              >
              <p class="text-sm text-gray-500 truncate">{{ link.targetUrl }}</p>
            </div>
            <div
              class="mt-4 sm:mt-0 sm:ml-6 flex-shrink-0 flex items-center space-x-4"
            >
              <div
                class="flex items-center text-sm"
                :class="
                  isExpired(link.expiredAt) ? 'text-red-500' : 'text-gray-500'
                "
              >
                <Calendar
                  class="h-5 w-5 mr-1.5"
                  :class="
                    isExpired(link.expiredAt) ? 'text-red-400' : 'text-gray-400'
                  "
                />
                Expires {{ formatRelativeTime(link.expiredAt) }}
              </div>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-end space-x-3">
            <button
              @click="showStats(link)"
              class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            >
              Stats
            </button>
            <!-- (แก้ไข) 1. เปลี่ยนไปเรียก Store Action -->
            <button
              @click="handleRenew(link.id)"
              :disabled="isRenewing"
              class="px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"
            >
              Renew (30 days)
            </button>
            <!-- (แก้ไข) 2. เปลี่ยนไปเรียก Store Action -->
            <button
              @click="handleDelete(link.id)"
              :disabled="isDeleting"
              class="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
            >
              Delete
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { onMounted, computed, ref } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";
import api from "@/services/api";
import Swal from "sweetalert2";
import { Loader2, Link2, BarChart2, Calendar, Plus } from "lucide-vue-next";

const authStore = useAuthStore();
const isRenewing = ref(false); // เรายังเก็บ state นี้ไว้เพื่อ disable ปุ่ม
const isDeleting = ref(false); // เรายังเก็บ state นี้ไว้เพื่อ disable ปุ่ม

// Helper: Check if expired
const isExpired = (dateString) => new Date(dateString) < new Date();

// Helper: Format time
const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// (แก้ไข) 3. ฟังก์ชันนี้จะ "หุ้ม" Store Action
// เราแยก isRenewing (UI) ออกจาก Logic (Store)
const handleRenew = async (linkId) => {
  isRenewing.value = true;
  try {
    // (สำคัญ) เรียก Action ใหม่ที่เราสร้างใน Store
    await authStore.renewLink(linkId);
  } catch (error) {
    // Store จัดการ Error Swal ให้แล้ว, แต่เรา log ไว้เผื่อ
    console.error("DashboardView: Error renewing link:", error);
  } finally {
    isRenewing.value = false;
  }
};

// (แก้ไข) 4. ฟังก์ชันนี้จะ "หุ้ม" Store Action
const handleDelete = async (linkId) => {
  isDeleting.value = true;
  try {
    // (สำคัญ) เรียก Action ใหม่ที่เราสร้างใน Store
    // (Store Action จะยิง Swal ยืนยันเอง)
    await authStore.deleteLink(linkId);
  } catch (error) {
    console.error("DashboardView: Error deleting link:", error);
  } finally {
    // (Store จะลบรายการออกจาก 'myLinks' ให้อัตโนมัติ)
    isDeleting.value = false;
  }
};

// (เก็บไว้) 5. ฟังก์ชันนี้สมบูรณ์แบบ
const showStats = async (link) => {
  try {
    const { data: stats } = await api.get(`/links/${link.id}/stats`);

    const statsHtml = `
      <div class="text-left space-y-4">
        <h3 class="text-lg font-medium">Stats for <span class="font-bold text-indigo-600">/r/${
          link.slug
        }</span></h3>
        <p class="text-gray-600"><strong>Total Clicks:</strong> ${
          stats.totalClicks
        }</p>
        
        <div>
          <h4 class="font-medium text-gray-800">Top Referrers:</h4>
          <ul class="list-disc list-inside text-gray-600 mt-1">
            ${
              stats.topReferrers.length > 0
                ? stats.topReferrers
                    .map((r) => `<li>${r.referrer}: ${r.count}</li>`)
                    .join("")
                : "<li>No referrer data</li>"
            }
          </ul>
        </div>
        
        <div>
          <h4 class="font-medium text-gray-800">Clicks per Day (Last 7):</h4>
          <ul class="list-disc list-inside text-gray-600 mt-1">
              ${
                Object.keys(stats.dailyCounts).length > 0
                  ? Object.entries(stats.dailyCounts)
                      .map(([day, count]) => `<li>${day}: ${count}</li>`)
                      .join("")
                  : "<li>No clicks recently</li>"
              }
          </ul>
        </div>
      </div>
    `;
    Swal.fire({
      title: "Link Statistics",
      html: statsHtml,
      icon: "info",
      width: "500px",
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    Swal.fire("Error", "Could not fetch link statistics.", "error");
  }
};

// Fetch links when component is mounted (เก็บไว้)
onMounted(() => {
  authStore.fetchMyLinks();
});
</script>