import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";

// Import Global Styles
import "./assets/style.css";
// Import SweetAlert2 Styles (เพื่อให้ Popup สวยงาม)
import "sweetalert2/dist/sweetalert2.min.css";

const app = createApp(App);

// Setup State Management (Pinia)
const pinia = createPinia();
app.use(pinia);

// Setup Router (หลังจาก Pinia เพราะ Router อาจเรียกใช้ Store ใน Guards)
app.use(router);

app.mount("#app");
