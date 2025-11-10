<template>
  <div class="container mx-auto px-4 py-16">
    <div class="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
      <h2 class="text-2xl font-bold text-center text-gray-900">
        Login to your account
      </h2>
      <div class="mt-6">
        <LoginForm />
      </div>
    </div>
  </div>
</template>

<script setup>
import LoginForm from "@/components/LoginForm.vue";
</script>