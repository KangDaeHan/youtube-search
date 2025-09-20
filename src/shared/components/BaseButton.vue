<script setup lang="ts">
defineProps<{ as?: string }>()

const tag = (typeof (defineProps as any) === 'function' ? undefined : undefined)
</script>

<template>
  <button class="px-3 py-2 border rounded-xl hover:bg-gray-50 active:scale-[0.98]">
    <slot />
  </button>
</template>
