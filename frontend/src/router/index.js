import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/useAuthStore";
import HomeView from "@/views/HomeView.vue";
import NotFoundView from "@/views/NotFoundView.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: HomeView, // Eager loading for LCP (Largest Contentful Paint) optimization
    meta: { title: "Free URL Shortener & QR Code Generator" },
  },
  {
    path: "/login",
    name: "Login",
    // Redirect logic for modal-based login
    redirect: (to) => {
      return { path: "/", query: { login: "true" } };
    },
    meta: { requiresGuest: true, title: "Sign in / Sign up" },
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    // Lazy loading for code splitting
    component: () => import("@/views/DashboardView.vue"),
    meta: { requiresAuth: true, title: "My Dashboard" }, // ต้อง Login
  },
  {
    path: "/dashboard/link/:id/stats",
    name: "LinkStats",
    component: () => import("@/views/LinkStatsView.vue"),
    meta: { requiresAuth: true, title: "Analytics Report" },
    props: true, // ส่ง :id เข้าไปเป็น Props
  },
  {
    path: "/profile",
    name: "Profile",
    component: () => import("@/views/ProfileView.vue"),
    meta: { requiresAuth: true, title: "My Profile" },
  },
  {
    path: "/admin/users",
    name: "AdminUsers",
    component: () => import("@/views/AdminUsersView.vue"),
    meta: { requiresAuth: true, requiresAdmin: true, title: "User Management" }, // ต้องเป็น Admin เท่านั้น
  },
  {
    path: "/settings",
    name: "Settings",
    component: () => import("@/views/SettingsView.vue"),
    meta: { requiresAuth: true, title: "Settings" },
  },

  {
    path: "/forgot-password",
    name: "ForgotPassword",
    component: () => import("@/views/ForgotPasswordView.vue"),
    meta: { requiresGuest: true, title: "Reset Password" }, // ต้องยังไม่ Login ถึงจะเข้าได้
  },
  {
    path: "/reset-password/:token", // รับ param :token
    name: "ResetPassword",
    component: () => import("@/views/ResetPasswordView.vue"),
    meta: { requiresGuest: true, title: "Set New Password" },
  },
  {
    path: "/404",
    name: "NotFound",
    component: NotFoundView,
    meta: { title: "Page Not Found" },
  },
  // Catch-all route
  {
    path: "/:pathMatch(.*)*",
    redirect: "/404",
  },
];

const router = createRouter({
  history: createWebHistory(), // ใช้ URL แบบสะอาด (ไม่มี #)
  routes,
  // เมื่อเปลี่ยนหน้า ให้เลื่อน Scroll ขึ้นไปบนสุดเสมอ
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

const DEFAULT_TITLE = "Shortlink.QR";

// -------------------------------------------------------------------
// Global Navigation Guard
// -------------------------------------------------------------------
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  document.title = to.meta.title
    ? `${to.meta.title} | ${DEFAULT_TITLE}`
    : DEFAULT_TITLE;

  // Ensure Auth State is Ready
  if (!authStore.isAuthReady) {
    await authStore.initAuth();
  }

  const isAuthenticated = authStore.isAuthenticated;
  const isAdmin = authStore.isAdmin;

  // Authorization Logic
  if (to.meta.requiresAuth && !isAuthenticated) {
    // ส่งกลับไปหน้าแรก พร้อมเปิด Modal Login และจำ URL เดิมไว้ (redirect)
    next({
      name: "Home",
      query: {
        login: "true",
        redirect: to.fullPath,
      },
    });
  }
  // กรณี: หน้าสำหรับคนทั่วไป (เช่น Login) แต่ Login แล้ว
  else if (to.meta.requiresGuest && isAuthenticated) {
    next({ name: "Dashboard" });
  }
  // กรณี: หน้า Admin แต่ไม่ใช่ Admin
  else if (to.meta.requiresAdmin && !isAdmin) {
    // ส่งกลับ Dashboard (หรือจะไป 403 ก็ได้ แต่ Dashboard ปลอดภัยกว่า)
    next({ name: "Dashboard" });
  }
  // กรณี: ผ่านทุกเงื่อนไข
  else {
    next();
  }
});

export default router;
