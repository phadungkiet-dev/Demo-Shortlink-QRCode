import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from "vue-router";
import { useAuthStore } from "@/stores/useAuthStore";
import HomeView from "@/views/HomeView.vue";
import NotFoundView from "@/views/NotFoundView.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: HomeView, // โหลดทันที (Eager loading) เพราะเป็นหน้าแรก
  },
  {
    path: "/login",
    name: "Login",
    redirect: "/", // Redirect ไป Home เพราะเราใช้ Login Modal แทน
    meta: { requiresGuest: true },
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    // Lazy loading: โหลดเมื่อ User เข้าหน้านี้เท่านั้น (ประหยัด Bandwidth)
    component: () => import("@/views/DashboardView.vue"),
    meta: { requiresAuth: true }, // Flag บอกว่าต้อง Login
  },
  {
    path: "/dashboard/link/:id/stats", // :id คือ Dynamic
    name: "LinkStats",
    // Lazy loading: โหลดเมื่อ User เข้าหน้านี้เท่านั้น (ประหยัด Bandwidth)
    component: () => import("@/views/LinkStatsView.vue"),
    meta: { requiresAuth: true }, // Flag บอกว่าต้อง Login
    props: true, // ส่งค่า :id เข้าไปเป็น Props ของ Component โดยตรง
  },
  {
    path: "/profile",
    name: "Profile",
    // Lazy loading: โหลดเมื่อ User เข้าหน้านี้เท่านั้น (ประหยัด Bandwidth)
    component: () => import("@/views/ProfileView.vue"),
    meta: { requiresAuth: true }, // Flag บอกว่าต้อง Login
  },
  {
    path: "/admin/users",
    name: "AdminUsers",
    // Lazy loading: โหลดเมื่อ User เข้าหน้านี้เท่านั้น (ประหยัด Bandwidth)
    component: () => import("@/views/AdminUsersView.vue"),
    meta: { requiresAuth: true, requiresAdmin: true }, // Flag พิเศษ: ต้องเป็น Admin เท่านั้น ,Flag บอกว่าต้อง Login
  },
  {
    path: "/settings",
    name: "Settings",
    component: () => import("@/views/SettingsView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/404",
    name: "NotFound",
    component: NotFoundView,
  },
  // Catch-all route: ถ้าพิมพ์มั่วๆ ให้ไปหน้า 404
  {
    path: "/:pathMatch(.*)*",
    redirect: "/404",
  },
];

const router = createRouter({
  // ใช้ URL แบบสะอาด (ไม่มี #)
  history: createWebHistory(),
  routes,
});

// -------------------------------------------------------------------
// Global Navigation Guard (ยามเฝ้าประตู)
// -------------------------------------------------------------------
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // รอเช็คสถานะ Login กับ Backend ให้เสร็จก่อน (สำคัญมาก!)
  // ถ้าไม่รอ router จะคิดว่า user เป็น null ทั้งที่จริงๆ อาจจะ login ค้างอยู่
  if (!authStore.isAuthReady) {
    await authStore.initAuth();
  }

  const isAuthenticated = !!authStore.user;
  const isAdmin = authStore.user?.role === "ADMIN";

  // เช็คสิทธิ์การเข้าถึง (Authorization)
  if (to.meta.requiresAuth && !isAuthenticated) {
    // ถ้าต้อง Login แต่ยังไม่เข้า -> ดีดกลับไปหน้า Home (เพื่อกด Login)
    next({ name: "Home" });
  } else if (to.meta.requiresGuest && isAuthenticated) {
    // ถ้าหน้านี้สำหรับคนทั่วไป (เช่น หน้า Login) แต่เข้าสู่ระบบแล้ว -> ดีดไป Dashboard
    next({ name: "Dashboard" });
  } else if (to.meta.requiresAdmin && !isAdmin) {
    // ถ้าเป็นหน้า Admin แต่ไม่ใช่ Admin -> ดีดไป Dashboard
    next({ name: "Dashboard" });
  } else {
    // ผ่านทุกด่าน -> ไปต่อได้
    next();
  }
});

export default router;
