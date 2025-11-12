<template>
  <div>
    <!-- 
      (สำคัญ) นี่คือ "สวิตช์" (Switcher)
      Router (router/index.js) ของเราจะ "รอ" (await)
      ให้ authStore.initAuth() (ดึง user) ทำงานเสร็จก่อน
      ดังนั้น 'authStore.user' จะมีข้อมูลที่ถูกต้องเสมอเมื่อหน้านี้โหลด
    -->
    <AdminDashboard v-if="authStore.user && authStore.user.role === 'ADMIN'" />
    <UserDashboard v-else-if="authStore.user" />

    <!-- 
      (เผื่อไว้) ถ้า User หายไป (ซึ่งไม่ควรเกิดขึ้น)
      หรือ authStore.isAuthReady ยังไม่เสร็จ
    -->
    <div v-else class="text-center py-20">
      <Loader2 class="h-12 w-12 text-indigo-600 mx-auto animate-spin" />
      <p class="mt-4 text-gray-600">Loading user data...</p>
    </div>
  </div>
</template>

<script setup>
// (สำคัญ) 1. Import Store เพื่อเช็ค 'role'
import { useAuthStore } from "@/stores/useAuthStore";

// (สำคัญ) 2. Import 2 Components ที่เราเพิ่งสร้าง
import AdminDashboard from "@/components/AdminDashboard.vue";
import UserDashboard from "@/components/UserDashboard.vue";

// (เพิ่ม) 3. Import Loader (เผื่อไว้)
import { Loader2 } from "lucide-vue-next";

// 4. เรียก Store
const authStore = useAuthStore();

// (เรียบร้อย!)
// (Logic 'onMounted', 'fetchMyLinks', 'handleDelete' ฯลฯ
// ทั้งหมดถูกย้ายไปอยู่ใน 'UserDashboard.vue' แล้ว
// ทำให้ไฟล์ "แม่" (View) นี้... "สะอาด" มากครับ)
</script>