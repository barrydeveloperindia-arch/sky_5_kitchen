import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: '04_Digital_Assets',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './02_Application_Source'),
    },
  },
  build: {
    outDir: '05_Production_Builds/dist',
    emptyOutDir: true,
  },
  test: {
    include: ['tests/unit/**/*.test.js', '03_Automation_System/*.spec.js'],
  },
  server: {
    proxy: {
      '/api-timestation': {
        target: 'https://api.mytimestation.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-timestation/, '')
      }
    }
  }
})
