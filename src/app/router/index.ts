import { createRouter, createWebHistory } from 'vue-router'
// import HomePage from '@features/home/pages/HomePage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // { path: '/', component: HomePage },
    { path: '/', component: () => import('@features/home/pages/YouTubeFinderDemo.vue') }
  ],
})

export default router
