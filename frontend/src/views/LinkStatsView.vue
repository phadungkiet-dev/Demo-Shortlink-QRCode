<script setup>
import { ref, onMounted, computed } from "vue";
import api from "@/services/api";
import { APP_CONFIG } from "@/config/constants";
import {
  Loader2,
  ArrowLeft,
  AlertCircle,
  BarChart3,
  MousePointer2,
  Globe,
  Calendar,
  ExternalLink,
  MapPin,
  Smartphone,
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
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const response = await api.get(`/links/${props.id}/stats`, {
      params: { timezone: userTimezone },
    });
    stats.value = response.data;
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    errorMsg.value = error.message || "Could not load statistics.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchStats);

// --- [แก้ไข 1] Base Options (สำหรับกราฟทั่วไป: Referrers, Locations) ---
// ไม่มีการแปลงวันที่ แสดง Label ตามที่ส่งมาเลย
const baseOptions = {
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
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        font: { family: "Inter" },
        autoSkip: true,
        maxTicksLimit: 10,
        // ไม่ใส่ callback แปลงวันที่ที่นี่
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
    bar: { borderRadius: 4 },
  },
};

// --- [แก้ไข 2] Traffic Options (สำหรับกราฟเส้น Time Series โดยเฉพาะ) ---
// สืบทอดจาก Base แต่เพิ่ม Logic แปลงวันที่เข้าไป
const trafficOptions = {
  ...baseOptions,
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        font: { family: "Inter" },
        maxTicksLimit: 7,
        // [เฉพาะกราฟนี้] แปลง "2023-11-25" เป็น "25 Nov"
        callback: function (value) {
          const label = this.getLabelForValue(value);
          const date = new Date(label);
          // ป้องกัน Error กรณี Date ไม่ถูกต้อง
          if (isNaN(date.getTime())) return label;

          return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          });
        },
      },
    },
    y: baseOptions.scales.y,
  },
  plugins: {
    ...baseOptions.plugins,
    tooltip: {
      ...baseOptions.plugins.tooltip,
      callbacks: {
        // [เฉพาะกราฟนี้] Tooltip หัวข้อแสดงเป็น "25 Nov 2023"
        title: (items) => {
          const date = new Date(items[0].label);
          if (isNaN(date.getTime())) return items[0].label;

          return date.toLocaleDateString("en-GB", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        },
      },
    },
  },
  elements: {
    line: { tension: 0.4 },
    point: {
      radius: 4,
      hitRadius: 20,
      hoverRadius: 6,
      backgroundColor: "#ffffff",
      borderWidth: 2,
    },
  },
};

// --- Chart Data Computeds ---

const dailyChartData = computed(() => {
  if (!stats.value) return { labels: [], datasets: [] };
  const labels = [];
  const data = [];
  const rawData = stats.value.dailyCounts || {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);

    labels.push(dateStr);
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

// Helper: ตัด Domain ให้สั้นลง (เช่น https://facebook.com -> facebook.com)
const cleanReferrer = (url) => {
  if (!url || url === "Direct" || url === "Direct / Unknown") return "Direct";
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
};

const referrerChartData = computed(() => {
  if (!stats.value?.topReferrers) return { labels: [], datasets: [] };
  return {
    // [แก้ไข] ใช้ cleanReferrer เพื่อให้ Label สวยงาม
    labels: stats.value.topReferrers.map((r) => cleanReferrer(r.referrer)),
    datasets: [
      {
        label: "Visits",
        backgroundColor: "#818cf8",
        borderRadius: 4,
        barPercentage: 0.6,
        data: stats.value.topReferrers.map((r) => r.count),
      },
    ],
  };
});

const countryChartData = computed(() => {
  if (!stats.value?.topCountries) return { labels: [], datasets: [] };
  return {
    labels: stats.value.topCountries.map((c) => c.country || "Unknown"),
    datasets: [
      {
        label: "Visits",
        backgroundColor: "#34d399",
        borderRadius: 4,
        barPercentage: 0.6,
        data: stats.value.topCountries.map((c) => c.count),
      },
    ],
  };
});

const uaChartData = computed(() => {
  if (!stats.value?.topUserAgents) return { labels: [], datasets: [] };
  return {
    labels: stats.value.topUserAgents.map((u) =>
      u.userAgent.length > 20
        ? u.userAgent.substring(0, 20) + "..."
        : u.userAgent
    ),
    datasets: [
      {
        label: "Visits",
        backgroundColor: "#f472b6",
        borderRadius: 4,
        barPercentage: 0.6,
        data: stats.value.topUserAgents.map((u) => u.count),
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
          class="inline-flex items-center px-6 h-[46px] bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-[0.98]"
        >
          <ArrowLeft class="h-5 w-5 mr-2" /> Back to Dashboard
        </router-link>
      </div>

      <div v-else class="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
        <div
          class="flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div class="flex items-center gap-4">
            <router-link
              to="/dashboard"
              class="p-3 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:ring-4 hover:ring-indigo-500/10 transition-all shadow-sm active:scale-95"
            >
              <ArrowLeft class="h-5 w-5" />
            </router-link>
            <div>
              <div class="flex items-center gap-3">
                <h1 class="text-2xl font-bold text-gray-900">Analytics</h1>
                <span
                  class="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100 font-mono"
                >
                  /{{ APP_CONFIG.ROUTES.SHORT_LINK_PREFIX }}/{{
                    stats.link.slug
                  }}
                </span>
              </div>
              <a
                :href="stats.link.targetUrl"
                target="_blank"
                class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 mt-1 transition-colors group truncate max-w-md"
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
            class="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-md flex items-center gap-5 relative overflow-hidden group hover:shadow-lg transition-shadow"
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
            class="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-md flex items-center gap-5 group hover:shadow-lg transition-shadow"
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
            class="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-md flex items-center gap-5 group hover:shadow-lg transition-shadow"
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
                >{{ stats.link.disabled ? "Disabled" : "Active" }}</span
              >
            </div>
          </div>
        </div>

        <div
          class="lg:col-span-2 bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 shadow-md h-[400px] flex flex-col"
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 class="h-5 w-5 text-gray-400" /> Traffic Trend
            </h3>
            <span
              class="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full"
              >Last 7 Days</span
            >
          </div>
          <div class="flex-1 min-h-0 w-full">
            <Line :data="dailyChartData" :options="trafficOptions" />
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div
            class="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 shadow-md h-[400px] flex flex-col"
          >
            <div class="flex items-center justify-between mb-6">
              <h3
                class="text-lg font-bold text-gray-900 flex items-center gap-2"
              >
                <Globe class="h-5 w-5 text-gray-400" /> Top Referrers
              </h3>
              <span
                class="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full"
                >Source</span
              >
            </div>
            <div class="flex-1 min-h-0 w-full">
              <Bar :data="referrerChartData" :options="baseOptions" />
            </div>
          </div>
          <div
            class="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 shadow-md h-[400px] flex flex-col"
          >
            <div class="flex items-center justify-between mb-6">
              <h3
                class="text-lg font-bold text-gray-900 flex items-center gap-2"
              >
                <MapPin class="h-5 w-5 text-gray-400" /> Top Locations
              </h3>
              <span
                class="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full"
                >Country</span
              >
            </div>
            <div class="flex-1 min-h-0 w-full">
              <Bar
                :data="countryChartData"
                :options="{ ...baseOptions, indexAxis: 'y' }"
              />
            </div>
          </div>
          <div
            class="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 shadow-md h-[400px] flex flex-col lg:col-span-2"
          >
            <div class="flex items-center justify-between mb-6">
              <h3
                class="text-lg font-bold text-gray-900 flex items-center gap-2"
              >
                <Smartphone class="h-5 w-5 text-gray-400" /> Browsers & Devices
              </h3>
              <span
                class="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full"
                >User Agents</span
              >
            </div>
            <div class="flex-1 min-h-0 w-full">
              <Bar
                :data="uaChartData"
                :options="{ ...baseOptions, indexAxis: 'y' }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>