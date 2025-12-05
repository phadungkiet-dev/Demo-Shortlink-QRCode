<script setup>
// Icons
import { Home, Unplug } from "lucide-vue-next";
</script>

<template>
  <div
    class="min-h-screen flex flex-col items-center justify-center bg-gray-50/50 px-4 relative overflow-hidden"
  >
    <div
      class="absolute top-1/3 left-1/4 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl -z-10 animate-pulse"
    ></div>
    <div
      class="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl -z-10 animate-pulse"
      style="animation-delay: 1s"
    ></div>

    <div
      class="max-w-lg w-full bg-white shadow-2xl shadow-indigo-100/50 rounded-[2.5rem] p-6 sm:p-10 text-center border border-gray-100 relative z-10"
    >
      <div
        class="mb-8 inline-flex p-6 bg-red-50 rounded-3xl rotate-3 hover:rotate-0 transition-transform duration-300 shadow-inner"
      >
        <Unplug class="h-16 w-16 text-red-500" />
      </div>

      <h1
        class="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4"
      >
        Link Not Found
      </h1>

      <p class="text-lg text-gray-500 mb-10 leading-relaxed">
        Oops! The link you are looking for might have expired, been removed, or
        the URL is simply incorrect.
      </p>

      <router-link
        to="/"
        class="inline-flex items-center justify-center w-full sm:w-auto px-8 h-[46px] bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/40 transition-all transform active:scale-[0.98] group"
      >
        <Home
          class="h-5 w-5 mr-2 transition-transform group-hover:-translate-y-0.5"
        />
        Go back home
      </router-link>
    </div>

    <p class="mt-8 text-sm font-bold text-gray-300 uppercase tracking-[0.2em]">
      Error 404
    </p>
  </div>
</template>