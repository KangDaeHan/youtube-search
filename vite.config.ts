import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@app': path.resolve('src/app'),
      '@features': path.resolve('src/features'),
      '@shared': path.resolve('src/shared'),
    },
  },
})
