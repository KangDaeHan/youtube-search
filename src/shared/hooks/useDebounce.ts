import { ref, watch } from 'vue'

export function useDebounce<T>(value: () => T, delay = 300) {
  const debounced = ref<T>(value())
  let t: any
  watch(value, (v) => {
    clearTimeout(t)
    t = setTimeout(() => (debounced.value = v), delay)
  })
  return debounced
}
