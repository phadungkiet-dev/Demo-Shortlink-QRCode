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
  ExternalLink,
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
  Filler,
} from "chart.js";
import { Line, Bar } from "vue-chartjs";

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

// [Modified] ฟังก์ชันแปลงวันที่เป็น ค.ศ. (DD MMM YYYY)
const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const fetchStats = async () => {
  isLoading.value = true;
  errorMsg.value = null;
  try {
    const response = await api.get(`/links/${props.id}/stats`);
    stats.value = response.data;
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    errorMsg.value = error.message || "Could not load statistics.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchStats);

// --- Chart Config ---
const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#1e293b",
      padding: 12,
      cornerRadius: 12,
      titleFont: { size: 13, family: "Inter" },
      bodyFont: { size: 13, family: "Inter" },
      displayColors: false,
      callbacks: {
        title: (items) => {
          // แปลงวันที่ใน Tooltip เป็น ค.ศ. ด้วย
          return new Date(items[0].label).toLocaleDateString("en-GB", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        font: { family: "Inter" },
        maxTicksLimit: 7, // โชว์วันที่ไม่เกิน 7 ป้ายกันรก
        callback: function (value, index, values) {
          // แปลง Label แกน X เป็นแบบย่อ (เช่น 27 Nov)
          const date = new Date(this.getLabelForValue(value));
          return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          });
        },
      },
    },
    y: {
      border: { dash: [4, 4] },
      grid: { color: "#f3f4f6", tickLength: 0 },
      beginAtZero: true,
      ticks: { font: { family: "Inter" }, precision: 0 },
    },
  },
  elements: {
    line: { tension: 0.4 },
    // [Modified] ปรับ radius เป็น 4 เพื่อให้เห็นจุด แม้จะมีข้อมูลแค่วันเดียว
    point: {
      radius: 4,
      hitRadius: 20,
      hoverRadius: 6,
      backgroundColor: "#ffffff",
      borderWidth: 2,
    },
  },
};

// [Modified] Logic สร้างกราฟ 7 วันย้อนหลัง (เติม 0 ให้เต็ม)
const dailyChartData = computed(() => {
  if (!stats.value) return { labels: [], datasets: [] };

  const labels = [];
  const data = [];
  const rawData = stats.value.dailyCounts || {};

  // วนลูปย้อนหลัง 6 วันจนถึงวันนี้ (รวม 7 วัน)
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD (UTC base)

    labels.push(dateStr);
    // ถ้าวันนั้นมีข้อมูลให้ใส่ค่า ถ้าไม่มีใส่ 0
    data.push(rawData[dateStr] || 0);
  }

  return {
    labels,
    datasets: [
      {
        label: "Clicks",
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, "rgba(79, 70, 229, 0.2)");
          gradient.addColorStop(1, "rgba(79, 70, 229, 0)");
          return gradient;
        },
        borderColor: "#4F46E5",
        borderWidth: 3,
        fill: true,
        data,
      },
    ],
  };
});

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
        borderRadius: 8,
        data,
      },
    ],
  };
});
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-gray-50/50 py-8 lg:py-12">
    <div class="container mx-auto px-4 lg:px-8">
      <div
        v-if="isLoading"
        class="flex flex-col items-center justify-center py-32"
      >
        <div class="bg-white p-4 rounded-full shadow-sm mb-4">
          <Loader2 class="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
        <p class="text-gray-500 font-medium">Crunching the numbers...</p>
      </div>

      <div v-else-if="errorMsg" class="max-w-md mx-auto text-center py-20">
        <div
          class="bg-red-50 p-6 rounded-[2rem] border border-red-100 inline-block mb-6"
        >
          <AlertCircle class="h-12 w-12 text-red-500" />
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">
          Oops! Access Denied
        </h3>
        <p class="text-gray-500 mb-8">{{ errorMsg }}</p>
        <router-link
          to="/dashboard"
          class="inline-flex items-center px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
        >
          <ArrowLeft class="h-5 w-5 mr-2" />
          Back to Dashboard
        </router-link>
      </div>

      <div v-else class="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
        <div
          class="flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div class="flex items-center gap-4">
            <router-link
              to="/dashboard"
              class="p-3 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
            >
              <ArrowLeft class="h-5 w-5" />
            </router-link>
            <div>
              <div class="flex items-center gap-3">
                <h1 class="text-2xl font-bold text-gray-900">Analytics</h1>
                <span
                  class="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100 font-mono"
                >
                  /{{ stats.link.slug }}
                </span>
              </div>
              <a
                :href="stats.link.targetUrl"
                target="_blank"
                class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 mt-1 transition-colors group"
              >
                {{ stats.link.targetUrl }}
                <ExternalLink
                  class="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </a>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div
            class="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5 relative overflow-hidden group hover:shadow-md transition-shadow"
          >
            <div
              class="absolute -right-6 -top-6 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl group-hover:bg-indigo-100/50 transition-colors"
            ></div>
            <div
              class="p-4 bg-indigo-50 text-indigo-600 rounded-2xl relative z-10"
            >
              <MousePointer2 class="h-8 w-8" />
            </div>
            <div class="relative z-10">
              <p
                class="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1"
              >
                Total Clicks
              </p>
              <p class="text-4xl font-extrabold text-gray-900">
                {{ stats.totalClicks }}
              </p>
            </div>
          </div>

          <div
            class="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5 group hover:shadow-md transition-shadow"
          >
            <div class="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Calendar class="h-8 w-8" />
            </div>
            <div>
              <p
                class="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1"
              >
                Created On
              </p>
              <p class="text-xl font-bold text-gray-900">
                {{ formatDate(stats.link.createdAt) }}
              </p>
            </div>
          </div>

          <div
            class="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5 group hover:shadow-md transition-shadow"
          >
            <div class="p-4 bg-purple-50 text-purple-600 rounded-2xl">
              <BarChart3 class="h-8 w-8" />
            </div>
            <div>
              <p
                class="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1"
              >
                Status
              </p>
              <span
                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold"
                :class="
                  stats.link.disabled
                    ? 'bg-red-50 text-red-600'
                    : 'bg-emerald-50 text-emerald-600'
                "
              >
                {{ stats.link.disabled ? "Disabled" : "Active" }}
              </span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div
            class="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm h-[400px] flex flex-col"
          >
            <div class="flex items-center justify-between mb-6">
              <h3
                class="text-lg font-bold text-gray-900 flex items-center gap-2"
              >
                <BarChart3 class="h-5 w-5 text-gray-400" /> Traffic Trend
              </h3>
              <span
                class="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full"
                >Last 7 Days</span
              >
            </div>
            <div class="flex-1 min-h-0 w-full">
              <Line :data="dailyChartData" :options="commonOptions" />
            </div>
          </div>

          <div
            class="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm h-[400px] flex flex-col"
          >
            <div class="flex items-center justify-between mb-6">
              <h3
                class="text-lg font-bold text-gray-900 flex items-center gap-2"
              >
                <Globe class="h-5 w-5 text-gray-400" /> Top Referrers
              </h3>
              <span
                class="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full"
                >Top Sources</span
              >
            </div>
            <div class="flex-1 min-h-0 w-full">
              <Bar :data="referrerChartData" :options="commonOptions" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>