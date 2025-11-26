<script setup>
import { Unplug, Home } from "lucide-vue-next";
</script>

<template>
  <div
    class="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center"
  >
    <div class="mb-8">
      <div
        class="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto animate-bounce"
      >
        <Unplug class="h-12 w-12 text-red-500" />
      </div>
    </div>

    <h1
      class="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl mb-4"
    >
      Link Not Found
    </h1>
    <p class="text-lg text-gray-600 max-w-md mx-auto mb-8">
      Oops! The link you are looking for might have expired, been removed, or is
      temporarily unavailable.
    </p>

    <router-link
      to="/"
      class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:-translate-y-0.5"
    >
      <Home class="h-5 w-5 mr-2" />
      Go back home
    </router-link>
  </div>
</template>