<script setup>
// Core
import { onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Swal from "sweetalert2";
// Stores
import { useLinkStore } from "@/stores/useLinkStore";
// Config
import { APP_CONFIG } from "@/config/constants";

// Icons
import {
  Loader2,
  ArrowLeft,
  Link2,
  Calendar,
  Globe,
  Monitor,
  MousePointer2,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertCircle,
  EyeOff,
} from "lucide-vue-next";

// Chart.js
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
  ArcElement,
  Filler,
} from "chart.js";
import { Line, Doughnut } from "vue-chartjs";

// -------------------------------------------------------------------
// Chart Registration
// -------------------------------------------------------------------
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// -------------------------------------------------------------------
// Setup & State
// -------------------------------------------------------------------
const route = useRoute();
const router = useRouter();
const linkStore = useLinkStore();
const linkId = route.params.id;

// ใช้ Computed ดึง State จาก Store โดยตรง (Reactive)
const isLoading = computed(() => linkStore.isLoading);
const statsData = computed(() => linkStore.currentStats);

// -------------------------------------------------------------------
// Computed Properties (Charts & Logic)
// -------------------------------------------------------------------

// --- Helper Logic ---
const isExpired = computed(() => {
  if (!statsData.value?.link?.expiredAt) return false;
  return new Date(statsData.value.link.expiredAt) < new Date();
});

const linkStatus = computed(() => {
  if (!statsData.value?.link)
    return {
      label: "Unknown",
      class: "bg-gray-100 text-gray-500",
      icon: AlertCircle,
    };

  if (statsData.value.link.disabled) {
    return {
      label: "Disabled",
      class: "bg-gray-100 text-gray-500",
      icon: EyeOff,
    };
  }
  if (isExpired.value) {
    return {
      label: "Expired",
      class: "bg-red-100 text-red-600",
      icon: AlertCircle,
    };
  }
  return {
    label: "Active",
    class: "bg-emerald-100 text-emerald-600",
    icon: CheckCircle2,
  };
});

// --- Line Chart (Traffic Trend) ---
const dailyChartData = computed(() => {
  if (!statsData.value) return { labels: [], datasets: [] };

  const labels = Object.keys(statsData.value.dailyCounts);
  const data = Object.values(statsData.value.dailyCounts);

  return {
    labels,
    datasets: [
      {
        label: "Clicks",
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, "rgba(79, 70, 229, 0.4)"); // Indigo
          gradient.addColorStop(1, "rgba(79, 70, 229, 0.0)");
          return gradient;
        },
        borderColor: "#4f46e5",
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#4f46e5",
        pointHoverBackgroundColor: "#4f46e5",
        pointHoverBorderColor: "#ffffff",
        pointRadius: 4,
        pointHoverRadius: 6,
        data,
        fill: true,
        tension: 0.4,
      },
    ],
  };
});

const dailyChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: "index",
      intersect: false,
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      titleColor: "#1f2937",
      bodyColor: "#4b5563",
      borderColor: "#e5e7eb",
      borderWidth: 1,
      padding: 12,
      displayColors: false,
      callbacks: {
        label: (context) => `${context.parsed.y} clicks`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: "#f3f4f6", borderDash: [5, 5] },
      ticks: { stepSize: 1, font: { family: "'Inter', sans-serif" } },
      border: { display: false },
    },
    x: {
      grid: { display: false },
      ticks: { font: { family: "'Inter', sans-serif" } },
      border: { display: false },
    },
  },
};

// --- Doughnut Chart (Devices/Browsers) ---
const deviceChartData = computed(() => {
  if (!statsData.value?.topUserAgents?.length) return null;

  const groupedStats = {};

  // Mock Logic: ใน Production จริง Backend ควรส่ง Grouped Data (Mobile/Desktop/Tablet) มาให้
  statsData.value.topUserAgents.forEach((u) => {
    let label = "Other";
    if (u.userAgent.includes("iPhone") || u.userAgent.includes("iPad"))
      label = "iOS";
    else if (u.userAgent.includes("Android")) label = "Android";
    else if (u.userAgent.includes("Windows")) label = "Windows";
    else if (u.userAgent.includes("Mac")) label = "Mac";
    else if (u.userAgent.includes("Linux")) label = "Linux";

    // บวกเพิ่มเข้าไปในหมวดหมู่นั้นๆ
    if (!groupedStats[label]) {
      groupedStats[label] = 0;
    }
    groupedStats[label] += u.count;
  });

  const data = statsData.value.topUserAgents.map((u) => u.count);

  return {
    labels: Object.keys(groupedStats),
    datasets: [
      {
        backgroundColor: [
          "#4f46e5",
          "#10b981",
          "#f59e0b",
          "#ef4444",
          "#8b5cf6",
        ],
        borderWidth: 0,
        data: Object.values(groupedStats),
      },
    ],
  };
});

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        usePointStyle: true,
        padding: 20,
        font: { family: "'Inter', sans-serif" },
      },
    },
  },
  cutout: "75%",
};

// -------------------------------------------------------------------
// Methods
// -------------------------------------------------------------------
const loadStats = async () => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // [แก้ไข] เรียกใช้ Action ใน Store แทน
    await linkStore.fetchLinkStats(linkId, timezone);
  } catch (error) {
    // Error ถูกจัดการใน Store แล้ว (Swal)
    // แต่อาจจะ Redirect กลับถ้าหาไม่เจอ
    router.push("/dashboard");
  }
};

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text);
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: "Copied!",
    showConfirmButton: false,
    timer: 1000,
  });
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getFaviconUrl = (url) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch (e) {
    return "https://www.svgrepo.com/show/508699/landscape-placeholder.svg";
  }
};

// -------------------------------------------------------------------
// Lifecycle
// -------------------------------------------------------------------
onMounted(() => {
  loadStats();
});
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-gray-50/50 pb-24">
    <div
      v-if="isLoading"
      class="flex flex-col items-center justify-center h-[60vh]"
    >
      <Loader2 class="h-10 w-10 text-indigo-600 animate-spin mb-4" />
      <p class="text-gray-500 font-medium">Gathering insights...</p>
    </div>

    <div v-else-if="statsData" class="container mx-auto px-4 lg:px-8 py-8">
      <div class="mb-8">
        <button
          @click="router.push('/dashboard')"
          class="flex items-center text-gray-500 hover:text-indigo-600 mb-6 transition-colors font-medium group"
        >
          <ArrowLeft
            class="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1"
          />
          Back to Dashboard
        </button>

        <div
          class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6"
        >
          <div class="flex items-start gap-4">
            <div
              class="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0"
            >
              <img
                :src="getFaviconUrl(statsData.link.targetUrl)"
                class="w-6 h-6 object-contain"
              />
            </div>

            <div>
              <div class="flex items-center gap-3 flex-wrap mb-1">
                <h1 class="text-xl font-bold text-gray-900">
                  Analytics Report
                </h1>
                <span
                  class="px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"
                  :class="linkStatus.class"
                >
                  <component :is="linkStatus.icon" class="w-3 h-3" />
                  {{ linkStatus.label }}
                </span>
              </div>
              <a
                :href="statsData.link.targetUrl"
                target="_blank"
                class="text-gray-500 hover:text-indigo-600 text-sm truncate max-w-md block transition-colors"
              >
                {{ statsData.link.targetUrl }}
              </a>
            </div>
          </div>

          <div
            class="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 self-start lg:self-center w-full lg:w-auto justify-between lg:justify-start"
          >
            <span class="text-indigo-600 font-bold truncate">
              /{{ APP_CONFIG.ROUTES.SHORT_LINK_PREFIX }}/{{
                statsData.link.slug
              }}
            </span>
            <div class="flex items-center gap-1 shrink-0">
              <button
                @click="
                  copyToClipboard(
                    `${APP_CONFIG.API.BASE_URL.replace('/api', '')}/${
                      APP_CONFIG.ROUTES.SHORT_LINK_PREFIX
                    }/${statsData.link.slug}`
                  )
                "
                class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                title="Copy"
              >
                <Copy class="h-4 w-4" />
              </button>
              <a
                :href="`${APP_CONFIG.API.BASE_URL.replace('/api', '')}/${
                  APP_CONFIG.ROUTES.SHORT_LINK_PREFIX
                }/${statsData.link.slug}`"
                target="_blank"
                class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
              >
                <ExternalLink class="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div
          class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4"
        >
          <div class="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <MousePointer2 class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Total Clicks</p>
            <p class="text-2xl font-bold text-gray-900">
              {{ statsData.totalClicks }}
            </p>
          </div>
        </div>

        <div
          class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4"
        >
          <div class="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Calendar class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Created</p>
            <p class="text-lg font-bold text-gray-900">
              {{ formatDate(statsData.link.createdAt) }}
            </p>
          </div>
        </div>

        <div
          class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4"
        >
          <div
            class="p-3 rounded-xl"
            :class="
              isExpired
                ? 'bg-red-50 text-red-600'
                : 'bg-emerald-50 text-emerald-600'
            "
          >
            <component
              :is="isExpired ? AlertCircle : Calendar"
              class="h-6 w-6"
            />
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Expires</p>
            <p
              class="text-lg font-bold"
              :class="isExpired ? 'text-red-600' : 'text-gray-900'"
            >
              {{ isExpired ? "Expired" : formatDate(statsData.link.expiredAt) }}
            </p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div
          class="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-gray-900">Traffic Trend</h3>
            <span
              class="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded"
              >Last 7 Days</span
            >
          </div>
          <div class="h-[300px] w-full relative">
            <Line :data="dailyChartData" :options="dailyChartOptions" />
          </div>
        </div>

        <div
          class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col"
        >
          <h3
            class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2"
          >
            <Monitor class="h-5 w-5 text-indigo-600" /> Device & Browser
          </h3>
          <div
            class="flex-grow flex items-center justify-center relative min-h-[250px]"
          >
            <div v-if="deviceChartData" class="w-full h-full absolute inset-0">
              <Doughnut :data="deviceChartData" :options="doughnutOptions" />
            </div>
            <div v-else class="text-center text-gray-400">
              <p>No device data available</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3
            class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"
          >
            <Globe class="h-5 w-5 text-indigo-600" /> Top Referrers
          </h3>
          <div class="overflow-hidden rounded-xl border border-gray-50">
            <table class="w-full text-sm text-left">
              <thead class="text-xs text-gray-500 uppercase bg-gray-50/50">
                <tr>
                  <th class="px-4 py-3 font-semibold">Source</th>
                  <th class="px-4 py-3 text-right font-semibold">Clicks</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-if="!statsData.topReferrers.length">
                  <td
                    colspan="2"
                    class="px-4 py-8 text-center text-gray-400 italic"
                  >
                    No data yet
                  </td>
                </tr>
                <tr
                  v-for="(item, index) in statsData.topReferrers"
                  :key="index"
                  class="hover:bg-gray-50/50 transition-colors"
                >
                  <td
                    class="px-4 py-3 font-medium text-gray-700 truncate max-w-[200px]"
                  >
                    {{ item.referrer }}
                  </td>
                  <td class="px-4 py-3 text-right font-bold text-indigo-600">
                    {{ item.count }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3
            class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"
          >
            <Globe class="h-5 w-5 text-emerald-600" /> Top Locations
          </h3>
          <div class="overflow-hidden rounded-xl border border-gray-50">
            <table class="w-full text-sm text-left">
              <thead class="text-xs text-gray-500 uppercase bg-gray-50/50">
                <tr>
                  <th class="px-4 py-3 font-semibold">Country</th>
                  <th class="px-4 py-3 text-right font-semibold">Clicks</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-if="!statsData.topCountries.length">
                  <td
                    colspan="2"
                    class="px-4 py-8 text-center text-gray-400 italic"
                  >
                    No data yet
                  </td>
                </tr>
                <tr
                  v-for="(item, index) in statsData.topCountries"
                  :key="index"
                  class="hover:bg-gray-50/50 transition-colors"
                >
                  <td class="px-4 py-3 font-medium text-gray-700">
                    {{ item.country || "Unknown" }}
                  </td>
                  <td class="px-4 py-3 text-right font-bold text-emerald-600">
                    {{ item.count }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>