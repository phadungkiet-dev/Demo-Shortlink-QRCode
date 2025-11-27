<script setup>
import { ref, onMounted, computed } from "vue";
import api from "@/services/api";
import {
  Loader2,
  ArrowLeft,
  AlertCircle,
  BarChart3,
  MousePointer2,
  Globe,
  Calendar,
} from "lucide-vue-next";
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
  Filler, // เพิ่ม Filler เพื่อทำ Area Chart สวยๆ
} from "chart.js";
import { Line, Bar } from "vue-chartjs";

// ลงทะเบียน Components ของ Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const props = defineProps({
  id: { type: String, required: true },
});

const stats = ref(null);
const isLoading = ref(true);
const errorMsg = ref(null);

onMounted(() => {
  fetchStats();
});

const fetchStats = async () => {
  isLoading.value = true;
  errorMsg.value = null;
  try {
    const response = await api.get(`/links/${props.id}/stats`);
    stats.value = response.data;
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    errorMsg.value =
      error.response?.data?.message || "Could not load statistics.";
  } finally {
    isLoading.value = false;
  }
};

// --- Chart Configuration ---
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }, // ซ่อน Legend เพื่อความคลีน
    tooltip: {
      backgroundColor: "#1e293b",
      padding: 12,
      cornerRadius: 8,
      displayColors: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: "#f1f5f9" },
      ticks: { font: { size: 11 } },
    },
    x: {
      grid: { display: false },
      ticks: { font: { size: 11 } },
    },
  },
  elements: {
    line: { tension: 0.4 }, // กราฟเส้นโค้งมน
    point: { radius: 4, hitRadius: 10, hoverRadius: 6 },
  },
};

// 1. กราฟเส้น: Clicks per Day
const dailyChartData = computed(() => {
  if (!stats.value?.dailyCounts) return { labels: [], datasets: [] };

  const labels = Object.keys(stats.value.dailyCounts);
  const data = Object.values(stats.value.dailyCounts);

  return {
    labels,
    datasets: [
      {
        label: "Clicks",
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, "rgba(79, 70, 229, 0.4)"); // สีม่วงจางๆ
          gradient.addColorStop(1, "rgba(79, 70, 229, 0.0)");
          return gradient;
        },
        borderColor: "#4F46E5",
        borderWidth: 3,
        fill: true, // ถมสีใต้กราฟ
        data,
      },
    ],
  };
});

// 2. กราฟแท่ง: Top Referrers
const referrerChartData = computed(() => {
  if (!stats.value?.topReferrers) return { labels: [], datasets: [] };

  const labels = stats.value.topReferrers.map(
    (r) => r.referrer || "Direct / Unknown"
  );
  const data = stats.value.topReferrers.map((r) => r.count);

  return {
    labels,
    datasets: [
      {
        label: "Visits",
        backgroundColor: "#818cf8",
        borderRadius: 6,
        data,
      },
    ],
  };
});
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-gray-50/50 py-10">
    <div class="container mx-auto px-4 lg:px-8">
      <div
        v-if="isLoading"
        class="py-32 text-center flex flex-col items-center"
      >
        <Loader2 class="h-12 w-12 text-indigo-600 animate-spin mb-4" />
        <p class="text-gray-500 font-medium">Crunching the numbers...</p>
      </div>

      <div v-else-if="errorMsg" class="max-w-lg mx-auto text-center py-20">
        <div
          class="bg-white p-8 rounded-3xl shadow-lg shadow-red-50 border border-red-100"
        >
          <AlertCircle class="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 class="text-lg font-bold text-gray-900">
            Oops! Something went wrong
          </h3>
          <p class="text-gray-500 mt-2 mb-6">{{ errorMsg }}</p>
          <router-link
            to="/dashboard"
            class="inline-flex items-center px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft class="h-4 w-4 mr-2" />
            Back to Dashboard
          </router-link>
        </div>
      </div>

      <div v-else class="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div class="flex items-center gap-4">
            <router-link
              to="/dashboard"
              class="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
            >
              <ArrowLeft class="h-5 w-5" />
            </router-link>
            <div>
              <h1
                class="text-2xl font-bold text-gray-900 flex items-center gap-2"
              >
                Analytics
                <span
                  class="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-md border border-indigo-100 font-mono"
                >
                  /{{ stats.link.slug }}
                </span>
              </h1>
              <a
                :href="stats.link.targetUrl"
                target="_blank"
                class="text-sm text-gray-500 hover:text-indigo-500 hover:underline truncate max-w-md block mt-1"
              >
                {{ stats.link.targetUrl }}
              </a>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5 relative overflow-hidden"
          >
            <div
              class="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50 rounded-full blur-2xl"
            ></div>
            <div class="p-3 bg-indigo-50 text-indigo-600 rounded-2xl z-10">
              <MousePointer2 class="h-8 w-8" />
            </div>
            <div class="z-10">
              <p
                class="text-sm text-gray-500 font-medium uppercase tracking-wider"
              >
                Total Clicks
              </p>
              <p class="text-4xl font-extrabold text-gray-900 mt-1">
                {{ stats.totalClicks }}
              </p>
            </div>
          </div>

          <div
            class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5"
          >
            <div class="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Calendar class="h-8 w-8" />
            </div>
            <div>
              <p
                class="text-sm text-gray-500 font-medium uppercase tracking-wider"
              >
                Created On
              </p>
              <p class="text-xl font-bold text-gray-900 mt-1">
                {{ new Date(stats.link.createdAt).toLocaleDateString() }}
              </p>
            </div>
          </div>

          <div
            class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5"
          >
            <div class="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <BarChart3 class="h-8 w-8" />
            </div>
            <div>
              <p
                class="text-sm text-gray-500 font-medium uppercase tracking-wider"
              >
                Engagement
              </p>
              <p class="text-xl font-bold text-gray-900 mt-1">
                {{ stats.totalClicks > 0 ? "Active" : "No Data" }}
              </p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div
            class="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm"
          >
            <div class="flex items-center justify-between mb-6">
              <h3
                class="text-lg font-bold text-gray-900 flex items-center gap-2"
              >
                <BarChart3 class="h-5 w-5 text-gray-400" />
                Traffic Overview
              </h3>
              <span
                class="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded-lg"
                >Last 7 Days</span
              >
            </div>
            <div class="h-[300px] w-full">
              <Line :data="dailyChartData" :options="chartOptions" />
            </div>
          </div>

          <div
            class="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm"
          >
            <div class="flex items-center justify-between mb-6">
              <h3
                class="text-lg font-bold text-gray-900 flex items-center gap-2"
              >
                <Globe class="h-5 w-5 text-gray-400" />
                Top Referrers
              </h3>
              <span
                class="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded-lg"
                >Top 10</span
              >
            </div>
            <div class="h-[300px] w-full">
              <Bar :data="referrerChartData" :options="chartOptions" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>