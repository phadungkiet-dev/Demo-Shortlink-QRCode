import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from "vue-router";
import { useAuthStore } from "@/stores/useAuthStore";
import HomeView from "@/views/HomeView.vue";
import DashboardView from "@/views/DashboardView.vue";
// import LoginView from "@/views/LoginView.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: HomeView,
  },
  {
    path: "/login",
    name: "Login",
    redirect: "/",
    meta: { requiresGuest: true },
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    component: DashboardView,
    meta: { requiresAuth: true }, // ต้อง login
  },
  // (Optional) Google OAuth Callback Success
  // เราจะ redirect จาก /dashboard ไปเอง
  // แต่ถ้า Google redirect มาที่ / (Home) เราก็ต้องเช็ค
];

const router = createRouter({
  // history: createWebHashHistory(), // (สำคัญ) ใช้ Hash mode ง่ายกว่าสำหรับ proxy
  history: createWebHistory(),
  routes,
});

// (สำคัญ) Global Navigation Guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // (Auth flow 1) ถ้ายังไม่เช็ค Auth ให้เช็คก่อน
  if (!authStore.isAuthReady) {
    await authStore.initAuth();
  }

  // (Auth flow 4) หลังจาก isAuthReady = true แล้ว...
  const isAuthenticated = !!authStore.user;

  if (to.meta.requiresAuth && !isAuthenticated) {
    // (แก้ไขจุดที่ 3)
    // ถ้าหน้านี้ต้อง login แต่ยังไม่ login
    // (Logic เก่า) -> ไปหน้า /login
    // next({ name: "Login" });
    // (Logic ใหม่) -> ไปหน้า Home (/) เพื่อเปิด Modal
    next({ name: "Home" });
  } else if (to.meta.requiresGuest && isAuthenticated) {
    // ถ้าหน้านี้สำหรับ Guest แต่ดัน login แล้ว -> ไปหน้า /dashboard
    next({ name: "Dashboard" });
  } else {
    // ไปหน้าปกติ
    next();
  }
});

export default router;
