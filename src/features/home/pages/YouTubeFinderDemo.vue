<template>
  <div class="space-y-6">
    <YouTubeFinderFilters v-model="filters" @submit="search" />

    <section class="rounded-2xl border bg-white p-4 shadow-sm">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-lg font-bold">검색 결과 ({{ results.length }})</h3>
        <button class="btn-secondary" @click="results = []">초기화</button>
      </div>

      <div v-if="loading">불러오는 중...</div>
      <div v-else-if="error" class="text-red-600">{{ error }}</div>

      <ul class="divide-y">
        <li v-for="v in results" :key="v.id" class="py-3">
          <a :href="v.url" target="_blank" class="font-medium hover:underline">{{ v.title }}</a>
          <div class="text-sm text-gray-600">
            {{ v.channelTitle }} · {{ new Date(v.publishedAt).toLocaleDateString() }} · {{ v.views.toLocaleString() }}회 · {{ v.durationSec }}초
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import YouTubeFinderFilters from '@features/home/components/YouTubeFinderFilters.vue'
import type { FilterSettings } from '@shared/types/index'
import { runYouTubeSearch } from '@shared/composables/index'

const filters = ref<FilterSettings>({
  mode: 'channel',
  months: 1,
  perChannelLimit: 10,
  minViewsPerHour: 10,
  waitMinutesOnQuota: 2,
  country: 'KR',
  language: 'ko',
  perQueryLimit: 0,
  minViews: 0,
  format: 'all',
  shortsThresholdSec: 0,
  showChannelTopVideos: false,
  apiKey: 'AIzaSyBLgwbNgzjTnLmyImjOhkfsuZdoreZRrJw',
  channelHandle: '',
  keyword: '',
})

const results = ref<any[]>([])
const loading = ref(false)
const error = ref('')

async function search(f: FilterSettings) {
  try {
    loading.value = true
    error.value = ''
    results.value = await runYouTubeSearch(f)
  } catch (e: any) {
    error.value = e?.message ?? '오류가 발생했습니다'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.btn-secondary { @apply rounded-xl border border-gray-300 px-3 py-2 hover:bg-gray-50 active:scale-[0.98]; }
</style>
