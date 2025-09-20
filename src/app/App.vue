<script setup lang="ts">
</script>

<template>
  <main class="min-h-screen bg-gray-50 text-gray-900">
    <header class="px-6 py-4 border-b bg-white">
      <nav class="max-w-5xl mx-auto flex items-center gap-4">
        <RouterLink class="hover:underline" to="/">Home</RouterLink>
      </nav>
    </header>
    <section class="max-w-5xl mx-auto p-6">
      <RouterView />
    </section>
  </main>
</template>
