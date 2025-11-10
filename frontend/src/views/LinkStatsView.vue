<template>
  <div class="container mx-auto px-4 lg:px-8 py-12">
    <!-- 1. Loading State -->
    <div v-if="isLoading" class="text-center py-20">
      <Loader2 class="h-12 w-12 text-indigo-600 mx-auto animate-spin" />
      <p class="mt-4 text-gray-600">Loading statistics...</p>
    </div>

    <!-- 2. Error State -->
    <div
      v-else-if="errorMsg"
      class="text-center py-20 bg-white shadow rounded-lg p-8"
    >
      <AlertCircle class="h-12 w-12 text-red-500 mx-auto" />
      <h3 class="mt-4 text-xl font-bold text-red-700">Failed to load stats</h3>
      <p class="mt-2 text-gray-600">{{ errorMsg }}</p>
      <router-link
        to="/dashboard"
        class="mt-6 inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-indigo-700"
      >
        <ArrowLeft class="h-4 w-4 mr-2" />
        Back to Dashboard
      </router-link>
    </div>

    <!-- 3. Success State (มีข้อมูล) -->
    <div v-else-if="stats" class="space-y-8">
      <!-- Header + Back Button -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <router-link
            to="/dashboard"
            class="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft class="h-4 w-4 mr-2" />
            Back to Dashboard
          </router-link>
          <h1 class="mt-2 text-3xl font-bold text-gray-900">
            Stats for:
            <span class="text-indigo-600">{{ stats.link.slug }}</span>
          </h1>
        </div>
        <div
          class="mt-4 sm:mt-0 flex-shrink-0 text-center sm:text-right p-4 bg-indigo-50 rounded-lg"
        >
          <div class="text-sm font-medium text-indigo-700">Total Clicks</div>
          <div class="text-4xl font-bold text-indigo-900">
            {{ stats.totalClicks }}
          </div>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Chart 1: Daily Clicks (Line Chart) -->
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <h3 class="text-lg font-medium text-gray-900">
            Clicks per Day (Last 7 Days)
          </h3>
          <div class="mt-4 h-64">
            <Line :data="dailyChartData" :options="chartOptions" />
          </div>
        </div>

        <!-- Chart 2: Top Referrers (Bar Chart) -->
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <h3 class="text-lg font-medium text-gray-900">Top Referrers</h3>
          <div class="mt-4 h-64">
            <Bar :data="referrerChartData" :options="chartOptions" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import api from "@/services/api";
import Swal from "sweetalert2";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-vue-next";

// (สำคัญ) 1. Import Chart.js และ vue-chartjs
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "vue-chartjs";

// (สำคัญ) 2. ลงทะเบียน Components ของ Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// 3. รับ 'id' (Link ID) ที่ถูกส่งมาจาก Router
const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});

// 4. States
const stats = ref(null);
const isLoading = ref(true);
const errorMsg = ref(null);

// 5. Fetch Data (เมื่อหน้าโหลด)
onMounted(() => {
  fetchStats();
});

const fetchStats = async () => {
  isLoading.value = true;
  errorMsg.value = null;
  try {
    // (สำคัญ) ยิง API (ที่เรามีอยู่แล้ว) โดยใช้ 'id' จาก props
    const response = await api.get(`/links/${props.id}/stats`);
    stats.value = response.data;
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    errorMsg.value =
      error.response?.data?.message || "Could not load statistics.";
    // (เราไม่ใช้ Swal ที่นี่... เราโชว์ Error State (v-else-if) แทน)
  } finally {
    isLoading.value = false;
  }
};

// 6. Chart Options (ตั้งค่ากราฟ)
const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
});

// 7. (สำคัญ) แปลง Data (จาก API) ให้เป็น "Chart Data"
// (สำหรับกราฟเส้น "Clicks per Day")
const dailyChartData = computed(() => {
  if (!stats.value || !stats.value.dailyCounts) {
    return { labels: [], datasets: [] };
  }

  const labels = Object.keys(stats.value.dailyCounts);
  const data = Object.values(stats.value.dailyCounts);

  return {
    labels,
    datasets: [
      {
        label: "Clicks",
        backgroundColor: "#4F46E5", // (สี Indigo)
        borderColor: "#4F46E5",
        data,
      },
    ],
  };
});

// (สำหรับกราฟแท่ง "Top Referrers")
const referrerChartData = computed(() => {
  if (!stats.value || !stats.value.topReferrers) {
    return { labels: [], datasets: [] };
  }

  const labels = stats.value.topReferrers.map((r) => r.referrer || "Direct");
  const data = stats.value.topReferrers.map((r) => r.count);

  return {
    labels,
    datasets: [
      {
        label: "Total Clicks",
        backgroundColor: "#6366F1", // (สี Indigo อ่อน)
        data,
      },
    ],
  };
});
</script>