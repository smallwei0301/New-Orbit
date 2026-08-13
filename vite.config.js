import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Dev server proxies /api → the mock backend (npm run mock-api, port 8080),
 * so the frontend can use a relative VITE_API_BASE_URL of "/api/v1" and avoid
 * CORS entirely during local development.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.MOCK_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
