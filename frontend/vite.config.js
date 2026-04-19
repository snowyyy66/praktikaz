// Настраивает Vite-сборку и React-плагин для фронтенда.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // В dev фронт на :5173 ходит на /api и /uploads — прокси на API (:3000), чтобы не упираться в «сервер недоступен», если забыли VITE_API_ORIGIN.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})

