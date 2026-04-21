import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: '04_Digital_Assets',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './02_Application_Source'),
    },
  },
})
