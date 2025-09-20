import axios from 'axios'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '',
  timeout: 10000,
})

http.interceptors.request.use((config) => {
  // 예: 공통 헤더 추가
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    // 에러 로깅 등
    return Promise.reject(err)
  }
)
