import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";

// Import CSS
import "./assets/style.css"; // Tailwind
import "sweetalert2/dist/sweetalert2.min.css";

const app = createApp(App);

// (สำคัญ) ต้อง use(pinia) ก่อน use(router)
// เพราะ router guard ของเราต้องใช้ store
app.use(createPinia());
app.use(router);

app.mount("#app");
