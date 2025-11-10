<template>
  <div
    ref="qrCodeEl"
    class="w-32 h-32 rounded-lg overflow-hidden shadow-md"
  ></div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import QRCodeStyling from "qr-code-styling";

const props = defineProps({
  url: {
    type: String,
    required: true,
  },
});

const qrCodeEl = ref(null);
const qrCodeInstance = ref(null);

const renderQRCode = (url) => {
  if (!url || !qrCodeEl.value) return;

  if (!qrCodeInstance.value) {
    qrCodeInstance.value = new QRCodeStyling({
      width: 128,
      height: 128,
      type: "svg",
      data: url,
      dotsOptions: {
        color: "#4f46e5", // indigo-600
        type: "rounded",
      },
      backgroundOptions: {
        color: "#ffffff",
      },
      cornersSquareOptions: {
        type: "extra-rounded",
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 5,
      },
    });
    qrCodeInstance.value.append(qrCodeEl.value);
  } else {
    qrCodeInstance.value.update({
      data: url,
    });
  }
};

onMounted(() => {
  renderQRCode(props.url);
});

watch(
  () => props.url,
  (newUrl) => {
    renderQRCode(newUrl);
  }
);
</script>