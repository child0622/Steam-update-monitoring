import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    open: true, // 自动打开浏览器
    proxy: {
      '/api/store': {
        target: 'https://store.steampowered.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/store/, ''),
        headers: {
            'Referer': 'https://store.steampowered.com/'
        }
      },
      '/api/steam': {
        target: 'https://api.steampowered.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/steam/, '')
      }
    }
  }
})
