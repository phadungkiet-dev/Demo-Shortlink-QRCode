<script setup>
// Icons
import { Github } from "lucide-vue-next";
</script>

<template>
  <footer class="bg-white border-t border-gray-100 mt-auto">
    <div class="container mx-auto px-4 lg:px-8 py-8">
      <div class="flex flex-col md:flex-row justify-between items-center gap-4">
        <div class="text-center md:text-left">
          <p class="text-sm text-gray-500 font-medium">
            &copy; {{ new Date().getFullYear() }} Shortlink.QR
          </p>
          <p class="text-xs text-gray-400 mt-1">
            Engineered for performance. Crafted for education.
          </p>
        </div>

        <a
          href="https://github.com/phadungkiet-dev/Demo-Shortlink-QRCode"
          target="_blank"
          rel="noopener noreferrer"
          class="text-gray-400 hover:text-gray-900 transition-colors p-2 hover:bg-gray-50 rounded-full"
        >
          <span class="sr-only">GitHub</span>
          <Github class="h-5 w-5" />
        </a>
      </div>
    </div>
  </footer>
</template>