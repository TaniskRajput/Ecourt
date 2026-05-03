import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:8081',
      '/cases': 'http://localhost:8081',
      '/admin': 'http://localhost:8081',
      '/notifications': 'http://localhost:8081',
      '/public': 'http://localhost:8081',
      '/users': 'http://localhost:8081',
    },
  },
})
