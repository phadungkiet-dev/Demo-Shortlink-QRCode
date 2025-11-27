<script setup>
import { Unplug, Home } from "lucide-vue-next";
</script>

<template>
  <div
    class="min-h-screen flex flex-col items-center justify-center bg-gray-50/50 px-4 relative overflow-hidden"
  >
    <div
      class="absolute top-1/3 left-1/4 w-72 h-72 bg-indigo-300/10 rounded-full blur-3xl -z-10 animate-pulse"
    ></div>
    <div
      class="absolute bottom-1/3 right-1/4 w-72 h-72 bg-pink-300/10 rounded-full blur-3xl -z-10 animate-pulse"
      style="animation-delay: 1s"
    ></div>

    <div
      class="max-w-md w-full bg-white shadow-2xl shadow-indigo-100/50 rounded-3xl p-8 sm:p-10 text-center border border-white/50 backdrop-blur-sm"
    >
      <div class="mb-8">
        <div
          class="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto shadow-sm rotate-3 transition-transform hover:rotate-0"
        >
          <Unplug class="h-10 w-10 text-red-500" />
        </div>
      </div>

      <h1
        class="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3"
      >
        Link Not Found
      </h1>
      <p class="text-gray-500 mb-8 leading-relaxed">
        Oops! The link you are looking for might have expired, been removed, or
        the URL is incorrect.
      </p>

      <router-link
        to="/"
        class="inline-flex items-center justify-center w-full px-6 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-indigo-500/30 transition-all transform active:scale-[0.98] group"
      >
        <Home
          class="h-5 w-5 mr-2 transition-transform group-hover:-translate-y-0.5"
        />
        Go back home
      </router-link>
    </div>

    <p class="mt-8 text-sm font-medium text-gray-400 uppercase tracking-widest">
      Error 404
    </p>
  </div>
</template>