import { createApp } from 'vue'
import App from './App.vue'
import './styles/tailwind.css'
import router from './router'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { queryClient } from './providers/query'
import { pinia } from './providers/pinia'

createApp(App)
  .use(pinia)
  .use(VueQueryPlugin, { queryClient })
  .use(router)
  .mount('#app')
