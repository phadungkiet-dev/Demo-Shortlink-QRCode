import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/useAuthStore";
import HomeView from "@/views/HomeView.vue";
import NotFoundView from "@/views/NotFoundView.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: HomeView, // โหลดทันที (Eager loading) เพราะเป็นหน้าแรก
    meta: { title: "Free URL Shortener & QR Code Generator" },
  },
  {
    path: "/login",
    name: "Login",
    // Redirect ไปหน้าแรกแทน เพราะเราใช้ Login Modal
    // (แต่ยังเก็บ Route นี้ไว้เพื่อให้ลิงก์ /login ทำงานได้)
    redirect: (to) => {
      return { path: "/", query: { login: "true" } };
    },
    meta: { requiresGuest: true, title: "Sign in / Sign up" },
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    // Lazy loading: โหลดเมื่อ User เข้าหน้านี้เท่านั้น (Code Splitting)
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
    path: "/404",
    name: "NotFound",
    component: NotFoundView,
    meta: { title: "Page Not Found" },
  },
  // Catch-all route: ถ้าพิมพ์มั่วๆ ให้ไปหน้า 404
  {
    path: "/:pathMatch(.*)*",
    redirect: "/404",
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

  // รอเช็คสถานะ Login กับ Backend ให้เสร็จก่อนเสมอ (สำคัญมาก!)
  // ถ้าไม่รอ Router จะคิดว่า User เป็น null ทั้งที่จริงๆ อาจจะ Login ค้างอยู่
  if (!authStore.isAuthReady) {
    await authStore.initAuth();
  }

  const isAuthenticated = authStore.isAuthenticated;
  const isAdmin = authStore.isAdmin;

  // เช็คสิทธิ์การเข้าถึง (Authorization)

  // กรณี: หน้าที่ต้องการ Login แต่ยังไม่เข้า
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
