import { createApp } from "vue";
import { createPinia } from "pinia"; // State Management

import App from "./App.vue";
import router from "./router"; // Routing

// Import CSS
import "./assets/style.css"; // Tailwind & Custom Styles
import "sweetalert2/dist/sweetalert2.min.css"; // Styles ของ Popup แจ้งเตือน

const app = createApp(App);

// (สำคัญ) ต้อง use(pinia) ก่อน use(router)
// เพราะใน router/index.js เราอาจจะมีการเรียกใช้ Store (เช่น เช็คว่า Login หรือยัง)
// ถ้า Router ทำงานก่อน Pinia อาจจะเกิด Error ได้
app.use(createPinia());
app.use(router);

// สั่งให้ Vue เริ่มทำงานและแสดงผลที่ div id="app"
app.mount("#app");
