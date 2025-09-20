<template>
  <form @submit.prevent="onSubmit" class="grid gap-4 md:grid-cols-3">
    <!-- 좌측: 채널 핸들 / 실행모드 -->
    <section class="rounded-2xl border bg-white p-4 shadow-sm">
      <h3 class="mb-3 text-lg font-bold">채널핸들명</h3>

      <div class="mb-3">
        <label class="mb-1 block text-sm font-medium">실행모드</label>
        <select v-model="local.mode" class="form-select">
          <option value="channel">채널</option>
          <option value="keyword">키워드</option>
        </select>
      </div>

      <div v-if="local.mode === 'channel'" class="mb-3">
        <label class="mb-1 block text-sm font-medium">채널 핸들(@...)</label>
        <input v-model.trim="local.channelHandle" placeholder="@handle 또는 채널ID" class="form-input" />
      </div>

      <div v-else class="mb-3">
        <label class="mb-1 block text-sm font-medium">검색 키워드</label>
        <input v-model.trim="local.keyword" placeholder="예) 수학 강의, 뷰JS" class="form-input" />
      </div>

      <div class="mb-3">
        <label class="mb-1 block text-sm">최근 <b>{{ local.months }}</b>개월간의 영상을 분석할까요</label>
        <input type="number" min="1" max="24" v-model.number="local.months" class="form-input" />
      </div>

      <div class="mb-3">
        <label class="mb-1 block text-sm">채널당 최대 검색 수</label>
        <input type="number" min="1" max="200" v-model.number="local.perChannelLimit" class="form-input" />
      </div>

      <div class="mb-3">
        <label class="mb-1 block text-sm">최소 시간당 조회수</label>
        <input type="number" min="0" v-model.number="local.minViewsPerHour" class="form-input" />
      </div>

      <div class="mb-1">
        <label class="mb-1 block text-sm">API 키 쿼터 소진 시 대기시간(분)</label>
        <input type="number" min="0" v-model.number="local.waitMinutesOnQuota" class="form-input" />
      </div>

      <p class="mt-2 text-xs text-gray-500">API 키 대기 상태: <b>{{ waitState }}</b></p>
    </section>

    <!-- 가운데: 키워드 입력/옵션 -->
    <section class="rounded-2xl border bg-white p-4 shadow-sm">
      <h3 class="mb-3 text-lg font-bold">키워드입력</h3>

      <div class="mb-3">
        <label class="mb-1 block text-sm font-medium">쇼츠/롱폼</label>
        <select v-model="local.format" class="form-select">
          <option value="all">전체</option>
          <option value="shorts">쇼츠</option>
          <option value="longform">롱폼</option>
        </select>
      </div>

      <div class="mb-3">
        <label class="mb-1 block text-sm">쇼츠 기준(초)</label>
        <input type="number" min="10" :disabled="local.format==='all'" v-model.number="local.shortsThresholdSec" class="form-input" />
      </div>

      <div class="mb-3">
        <label class="mb-1 block text-sm">대상국가</label>
        <input v-model.trim="local.country" placeholder="KR" class="form-input" />
      </div>

      <div class="mb-3">
        <label class="mb-1 block text-sm">언어</label>
        <input v-model.trim="local.language" placeholder="ko" class="form-input" />
      </div>

      <div class="mb-3">
        <label class="mb-1 block text-sm">검색어당 최대 검색 수</label>
        <input type="number" min="1" max="200" v-model.number="local.perQueryLimit" class="form-input" />
      </div>

      <div class="mb-3">
        <label class="mb-1 block text-sm">최소 조회수</label>
        <input type="number" min="0" v-model.number="local.minViews" class="form-input" />
      </div>

      <label class="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" v-model="local.showChannelTopVideos" class="rounded border-gray-300" />
        채널별 인기영상 보기
      </label>
    </section>

    <!-- 우측: 설정/API 키/실행 -->
    <section class="rounded-2xl border bg-white p-4 shadow-sm">
      <h3 class="mb-3 text-lg font-bold">설정</h3>

      <div class="mb-3">
        <label class="mb-1 block text-sm">YouTube API 키</label>
        <input v-model.trim="local.apiKey" placeholder="api 키 입력" class="form-input" />
        <button type="button" class="btn-secondary" @click="onCheckApiKey">키 확인</button>
      </div>

      <Transition name="fade">
        <p v-if="apiKeyMessageVisible && apiKeyValid === true"
          style="color:green; font-size:13px; margin-top:4px;">
          ✅ 유효한 API 키입니다
        </p>
        <p v-else-if="apiKeyMessageVisible && apiKeyValid === false"
          style="color:red; font-size:13px; margin-top:4px;">
          ❌ 잘못되었거나 제한된 API 키입니다
        </p>
      </Transition>

      <div class="grid gap-2 sm:grid-cols-2">
        <button type="button" class="btn-secondary" @click="reset">초기화</button>
        <button type="submit" class="btn-primary">검색 실행</button>
      </div>

      <p v-if="errorMsg" class="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{{ errorMsg }}</p>
    </section>
  </form>
</template>

<script setup lang="ts">
import { computed, reactive, watch, toRefs, ref } from 'vue'
import type { FilterSettings } from '@shared/types/index'
import { checkApiKeyValid } from '@shared/api/checkApiKey'

const props = defineProps<{
  modelValue: FilterSettings
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: FilterSettings): void
  (e: 'submit', v: FilterSettings): void
}>()

const local = reactive<FilterSettings>({ ...props.modelValue })

watch(
  () => props.modelValue,
  v => Object.assign(local, v),
  { deep: true }
)

watch(local, v => emit('update:modelValue', { ...v }), { deep: true })

const errorMsg = computed(() => {
  if (!local.apiKey) return 'API 키가 필요합니다.'
  if (local.mode === 'channel' && !local.channelHandle) return '채널 핸들을 입력하세요.'
  if (local.mode === 'keyword' && !local.keyword) return '키워드를 입력하세요.'
  return ''
})

const waitState = computed(() => '대기 중이 아님')

// API 키 유효성 검사
const apiKeyValid = ref<boolean|null>(null)
const apiKeyMessageVisible = ref(false)

async function onCheckApiKey() {
  apiKeyValid.value = await checkApiKeyValid(local.apiKey.trim())
  apiKeyMessageVisible.value = true

  // 3초 뒤 자동 숨김
  setTimeout(() => {
    apiKeyMessageVisible.value = false
  }, 2000)
}


function reset() {
  Object.assign(local, defaultFilters())
}

function onSubmit() {
  if (errorMsg.value) return
  emit('submit', { ...local })
}

function defaultFilters(): FilterSettings {
  return {
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
  }
}
</script>

<style scoped>
.form-input { @apply w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-400; }
.form-select { @apply w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-400 bg-white; }
.btn-primary { @apply rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 active:scale-[0.98]; }
.btn-secondary { @apply rounded-xl border border-gray-300 px-4 py-2 hover:bg-gray-50 active:scale-[0.98]; }
</style>